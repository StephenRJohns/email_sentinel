"""CLI for the promo admin endpoint.

Usage:
    python -m tools.promo.cli mint <batch> <qty> [--label TEXT]
    python -m tools.promo.cli void <code>
    python -m tools.promo.cli void-batch <batch>
    python -m tools.promo.cli list [--batch NAME]
    python -m tools.promo.cli assign <code> --to "Name / email / UT-session"
                                            [--name NAME] [--email EMAIL]
                                            [--ut-session ID] [--notes TEXT]

The CLI mirrors the web UI's actions one-for-one. Both the CLI and the UI
share the same AppsScriptClient + BatchFile helpers, so any local
tracking-file update behavior is consistent across them.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

from . import config
from .apps_script import AppsScriptClient, AppsScriptError
from .batch_files import (
    BatchFile, find_batch_file_for_code, write_new_batch_file,
)


def _client() -> AppsScriptClient:
    return AppsScriptClient(config.PROMO_SERVICE_URL, config.PROMO_ADMIN_TOKEN)


def cmd_mint(args: argparse.Namespace) -> int:
    client = _client()
    codes = client.mint(args.batch, args.qty, label=args.label or "")
    print(f"Minted {len(codes)} code(s) in batch '{args.batch}':")
    for c in codes:
        print(f"  {c}")

    # Auto-write the local tracking file. Skip silently if it already
    # exists — the user may be re-minting after a partial failure.
    try:
        path = write_new_batch_file(
            codes_dir=config.PROMO_CODES_DIR,
            batch=args.batch,
            codes=codes,
            minted_at_iso=datetime.utcnow().isoformat() + "Z",
            label=args.label or "",
        )
        print(f"Local tracking file: {path}")
    except FileExistsError as exc:
        print(f"Note: {exc}", file=sys.stderr)
    return 0


def cmd_void(args: argparse.Namespace) -> int:
    client = _client()
    client.void(args.code)
    print(f"Voided: {args.code}")

    bf = find_batch_file_for_code(config.PROMO_CODES_DIR, args.code)
    if bf and bf.update_status(args.code, "voided"):
        print(f"Local tracking file updated: {bf.path}")
    return 0


def cmd_void_batch(args: argparse.Namespace) -> int:
    client = _client()
    result = client.void_batch(args.batch)
    voided = result.get("voided", [])
    print(f"Batch void: {args.batch}")
    print(f"  Voided ({len(voided)}):")
    for c in voided:
        print(f"    {c}")
    print(f"  Skipped (already redeemed):  {result.get('skipped_redeemed', 0)}")
    print(f"  Skipped (already voided):    {result.get('skipped_already_voided', 0)}")

    # Local tracking: update each code we voided. Glob once, parse each
    # batch file at most once.
    by_path: dict[Path, BatchFile] = {}
    for code in voided:
        bf = find_batch_file_for_code(config.PROMO_CODES_DIR, code)
        if bf is None:
            continue
        # find_batch_file_for_code re-parses on every call, which would
        # repeatedly re-read + re-write the same file. Cache by path.
        bf = by_path.setdefault(bf.path, bf)
        bf.update_status(code, "voided")
    if by_path:
        print(f"Local tracking files updated: {len(by_path)}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    client = _client()
    rows = client.list_codes(batch=args.batch)
    if not rows:
        print("(no codes match)")
        return 0
    for r in rows:
        line = f"{r['code']} | {r['batch']} | {r['status']}"
        if r.get("redeemed_by"):
            line += f" | redeemed by: {r['redeemed_by']}"
        if r.get("assigned_to"):
            line += f" | assigned: {r['assigned_to']}"
        print(line)
    print(f"({len(rows)} code(s))")
    return 0


def cmd_assign(args: argparse.Namespace) -> int:
    # Build the canonical Assigned-To string that goes to the Sheet from
    # whichever fields the user provided.
    parts: list[str] = []
    if args.name:        parts.append(args.name)
    if args.email:       parts.append(args.email)
    if args.ut_session:  parts.append(f"UT:{args.ut_session}")
    if args.to:          parts.append(args.to)
    if not parts:
        print("Provide at least one of --to / --name / --email / --ut-session.",
              file=sys.stderr)
        return 2
    assigned_to = " / ".join(parts)

    client = _client()
    result = client.assign(args.code, assigned_to)
    print(f"Assigned: {args.code} -> {assigned_to}  (batch: {result.get('batch', '')})")

    bf = find_batch_file_for_code(config.PROMO_CODES_DIR, args.code)
    if bf is None:
        print("Note: no local batch tracking file contains this code; "
              "Sheet updated only.")
        return 0
    bf.update_assignment(
        code=args.code,
        tester_name=args.name or "",
        tester_email=args.email or "",
        ut_session=args.ut_session or "",
        notes=args.notes or "",
    )
    print(f"Local tracking file updated: {bf.path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="promo", description=__doc__.split("\n", 1)[0])
    sub = p.add_subparsers(dest="cmd", required=True)

    pm = sub.add_parser("mint", help="Mint a batch of codes")
    pm.add_argument("batch")
    pm.add_argument("qty", type=int)
    pm.add_argument("--label", default="")
    pm.set_defaults(func=cmd_mint)

    pv = sub.add_parser("void", help="Void a single unused/unredeemed code")
    pv.add_argument("code")
    pv.set_defaults(func=cmd_void)

    pvb = sub.add_parser("void-batch", help="Void all unused codes in a batch")
    pvb.add_argument("batch")
    pvb.set_defaults(func=cmd_void_batch)

    pl = sub.add_parser("list", help="List codes (optionally filtered by batch)")
    pl.add_argument("--batch", default=None)
    pl.set_defaults(func=cmd_list)

    pa = sub.add_parser("assign", help="Set Assigned To on a code")
    pa.add_argument("code")
    pa.add_argument("--to",         default="", help="free-text assignment string")
    pa.add_argument("--name",       default="")
    pa.add_argument("--email",      default="")
    pa.add_argument("--ut-session", default="")
    pa.add_argument("--notes",      default="")
    pa.set_defaults(func=cmd_assign)

    args = p.parse_args(argv)
    try:
        return args.func(args)
    except AppsScriptError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
