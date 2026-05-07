"""Flask web UI for the promo admin endpoint.

Single-user local tool. Binds to 127.0.0.1 by default; do not expose to a
network without adding auth.

Routes:
    GET  /                       — codes table (all batches)
    GET  /batch/<batch>          — codes table filtered to one batch
    POST /assign/<code>          — assign a code (form fields: name, email, ut_session, notes)
    POST /void/<code>            — void a code
    POST /mint                   — mint a new batch (form fields: batch, qty, label)
    POST /void-batch/<batch>     — void all unused in a batch

Run:
    python -m tools.promo.server
"""
from __future__ import annotations

from datetime import datetime

from flask import Flask, flash, redirect, render_template, request, url_for

from . import config
from .apps_script import AppsScriptClient, AppsScriptError
from .batch_files import (
    find_batch_file_for_code, write_new_batch_file,
)


app = Flask(__name__)
# flash() needs a secret. This server is localhost-only single-user — the
# secret only protects flash cookies, never anything redeemable. A
# session-stable random value is fine.
import secrets as _secrets
app.secret_key = _secrets.token_hex(16)

client = AppsScriptClient(config.PROMO_SERVICE_URL, config.PROMO_ADMIN_TOKEN)


def _list_codes(batch: str | None = None) -> list[dict]:
    return client.list_codes(batch=batch)


def _batches_summary(rows: list[dict]) -> list[dict]:
    """Group codes by batch for the sidebar / batch-level void controls."""
    out: dict[str, dict] = {}
    for r in rows:
        b = r["batch"] or "(no batch)"
        bucket = out.setdefault(b, {
            "batch": b, "total": 0, "unused": 0, "redeemed": 0, "voided": 0,
            "assigned": 0,
        })
        bucket["total"] += 1
        s = r["status"]
        if s in ("unused", "redeemed", "voided"):
            bucket[s] += 1
        if r.get("assigned_to"):
            bucket["assigned"] += 1
    return sorted(out.values(), key=lambda x: x["batch"])


@app.route("/")
def index():
    try:
        rows = _list_codes()
    except AppsScriptError as exc:
        flash(f"Error: {exc}", "error")
        rows = []
    batches = _batches_summary(rows)
    return render_template(
        "codes.html", rows=rows, batches=batches, current_batch=None,
    )


@app.route("/batch/<batch>")
def by_batch(batch: str):
    try:
        rows = _list_codes(batch=batch)
    except AppsScriptError as exc:
        flash(f"Error: {exc}", "error")
        rows = []
    batches = _batches_summary(_list_codes())
    return render_template(
        "codes.html", rows=rows, batches=batches, current_batch=batch,
    )


@app.route("/assign/<code>", methods=["POST"])
def assign(code: str):
    name      = request.form.get("name", "").strip()
    email     = request.form.get("email", "").strip()
    ut        = request.form.get("ut_session", "").strip()
    notes     = request.form.get("notes", "").strip()

    parts: list[str] = []
    if name:  parts.append(name)
    if email: parts.append(email)
    if ut:    parts.append(f"UT:{ut}")
    if not parts:
        flash("Enter at least Name, Email, or UT session before assigning.", "error")
        return redirect(request.referrer or url_for("index"))
    assigned_to = " / ".join(parts)

    try:
        result = client.assign(code, assigned_to)
    except AppsScriptError as exc:
        flash(f"Assign failed: {exc}", "error")
        return redirect(request.referrer or url_for("index"))

    bf = find_batch_file_for_code(config.PROMO_CODES_DIR, code)
    if bf is None:
        flash(
            f"Assigned {code} -> {assigned_to}  "
            f"(no local tracking file contains this code; Sheet updated only)",
            "ok",
        )
    else:
        bf.update_assignment(
            code=code,
            tester_name=name,
            tester_email=email,
            ut_session=ut,
            notes=notes,
        )
        flash(
            f"Assigned {code} -> {assigned_to}  (Sheet + {bf.path.name} updated)",
            "ok",
        )
    return redirect(request.referrer or url_for("index"))


@app.route("/void/<code>", methods=["POST"])
def void(code: str):
    try:
        client.void(code)
    except AppsScriptError as exc:
        flash(f"Void failed: {exc}", "error")
        return redirect(request.referrer or url_for("index"))

    bf = find_batch_file_for_code(config.PROMO_CODES_DIR, code)
    if bf:
        bf.update_status(code, "voided")
    flash(f"Voided: {code}", "ok")
    return redirect(request.referrer or url_for("index"))


@app.route("/mint", methods=["POST"])
def mint():
    batch = request.form.get("batch", "").strip()
    qty_raw = request.form.get("qty", "").strip()
    label = request.form.get("label", "").strip()
    try:
        qty = int(qty_raw)
    except ValueError:
        flash("qty must be a positive integer.", "error")
        return redirect(url_for("index"))
    if not batch or qty < 1:
        flash("Provide a batch name and qty >= 1.", "error")
        return redirect(url_for("index"))

    try:
        codes = client.mint(batch, qty, label=label)
    except AppsScriptError as exc:
        flash(f"Mint failed: {exc}", "error")
        return redirect(url_for("index"))

    try:
        path = write_new_batch_file(
            codes_dir=config.PROMO_CODES_DIR,
            batch=batch,
            codes=codes,
            minted_at_iso=datetime.utcnow().isoformat() + "Z",
            label=label,
        )
        flash(
            f"Minted {len(codes)} code(s) in '{batch}'. "
            f"Tracking file: {path.name}",
            "ok",
        )
    except FileExistsError as exc:
        flash(
            f"Minted {len(codes)} code(s) in '{batch}'. "
            f"NOTE: {exc}",
            "warn",
        )
    return redirect(url_for("by_batch", batch=batch))


@app.route("/void-batch/<batch>", methods=["POST"])
def void_batch(batch: str):
    try:
        result = client.void_batch(batch)
    except AppsScriptError as exc:
        flash(f"Batch void failed: {exc}", "error")
        return redirect(request.referrer or url_for("index"))

    voided = result.get("voided", [])
    for code in voided:
        bf = find_batch_file_for_code(config.PROMO_CODES_DIR, code)
        if bf:
            bf.update_status(code, "voided")
    flash(
        f"Batch '{batch}': voided {len(voided)}, "
        f"skipped {result.get('skipped_redeemed', 0)} redeemed, "
        f"{result.get('skipped_already_voided', 0)} already-voided.",
        "ok",
    )
    return redirect(url_for("by_batch", batch=batch))


def main() -> int:
    app.run(
        host=config.PROMO_BIND_HOST,
        port=config.PROMO_BIND_PORT,
        debug=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
