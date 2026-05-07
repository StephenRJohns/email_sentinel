"""Loads PROMO_SERVICE_URL, PROMO_ADMIN_TOKEN, and PROMO_CODES_DIR from a
.env file alongside this module (or from the process environment).

Fails fast with a clear error if the required values are missing — both the
CLI and the Flask server import this module at startup and rely on the
exception to surface configuration problems before any request hits the
Apps Script Web App.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE / ".env")


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"{name} is not set. Copy tools/promo/.env.example to "
            f"tools/promo/.env and fill in real values."
        )
    return value


def _resolved_codes_dir() -> Path:
    raw = os.environ.get("PROMO_CODES_DIR", "../../promo_codes").strip()
    path = Path(raw)
    if not path.is_absolute():
        path = (_HERE / path).resolve()
    return path


PROMO_SERVICE_URL = _required("PROMO_SERVICE_URL")
PROMO_ADMIN_TOKEN = _required("PROMO_ADMIN_TOKEN")
PROMO_CODES_DIR = _resolved_codes_dir()
PROMO_BIND_HOST = os.environ.get("PROMO_BIND_HOST", "127.0.0.1").strip()
PROMO_BIND_PORT = int(os.environ.get("PROMO_BIND_PORT", "5057"))
