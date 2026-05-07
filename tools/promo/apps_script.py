"""Thin HTTP client for the standalone admin/service Apps Script Web App.

Auth: the admin token is sent as the URL parameter `t=`, matching the
existing redemption flow's auth shape (PromoCodeService.gs doPost reads
`e.parameter.t`). The body is always JSON with an `action` field.

Returns parsed JSON dicts on success; raises AppsScriptError with a
human-readable message on auth failure, schema rejection, or HTTP error.
"""
from __future__ import annotations

from typing import Any

import requests


class AppsScriptError(Exception):
    """Raised when the Apps Script Web App returns ok=false or HTTP fails."""


class AppsScriptClient:
    def __init__(self, url: str, admin_token: str, timeout_s: int = 60):
        self.url = url
        self.token = admin_token
        self.timeout_s = timeout_s

    def _post(self, action: str, **kwargs: Any) -> dict:
        body: dict = {"action": action}
        body.update(kwargs)
        try:
            r = requests.post(
                self.url,
                params={"t": self.token},
                json=body,
                timeout=self.timeout_s,
                # Apps Script Web Apps return 302 to a googleusercontent.com
                # host that holds the actual response — requests follows
                # redirects by default, which is what we want.
                allow_redirects=True,
            )
        except requests.RequestException as exc:
            raise AppsScriptError(f"Network error talking to service: {exc}") from exc

        if r.status_code != 200:
            raise AppsScriptError(
                f"Service returned HTTP {r.status_code}: {r.text[:200]}"
            )

        try:
            data = r.json()
        except ValueError as exc:
            raise AppsScriptError(
                f"Service returned non-JSON: {r.text[:200]}"
            ) from exc

        if not data.get("ok"):
            raise AppsScriptError(data.get("error", "unknown service error"))

        return data

    # ── Admin actions ─────────────────────────────────────────────────────

    def mint(self, batch: str, qty: int, label: str = "") -> list[str]:
        """Mint `qty` codes in `batch`. Returns the list of new code strings."""
        result = self._post("mint", batch=batch, qty=qty, label=label)
        return list(result.get("codes", []))

    def void(self, code: str) -> None:
        """Void a single unused/unredeemed code. Raises on already-redeemed."""
        self._post("void", code=code)

    def void_batch(self, batch: str) -> dict:
        """Void all unused codes in `batch`. Returns counts + voided list."""
        return self._post("void_batch", batch=batch)

    def list_codes(self, batch: str | None = None) -> list[dict]:
        """Return all codes (optionally filtered by batch) as dicts."""
        kwargs: dict = {}
        if batch:
            kwargs["batch"] = batch
        result = self._post("list", **kwargs)
        return list(result.get("codes", []))

    def assign(self, code: str, assigned_to: str) -> dict:
        """Set Assigned To + Assigned At on `code`. Returns the row's batch."""
        return self._post("assign", code=code, assigned_to=assigned_to)
