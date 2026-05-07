"""Local batch tracking files — `promo_codes/<batch-name>.txt`.

A tracking file is a plain-text companion to the Sheet that lives
gitignored on the dev's machine. It exists for two reasons:

1. Quick offline reference — paste a code into UserTesting without
   a round-trip to the Sheet.
2. Per-batch status visibility (Slot, Tester Name / Email / UT Session,
   Date Sent, Status, Notes) outside the Sheet's row-level columns.

The tool auto-creates a file when minting via the CLI/UI, and on
assignment looks up which file (if any) contains the code so the same
fields can be mirrored locally.

File schema (after the comment header):
    Slot | Code | Tester Name | Tester Email | UT Session | Date Sent | Status | Notes

The header is fixed-width visually but the parser splits on the `|`
delimiter, so manual edits do not need to keep alignment.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Iterable


HEADER_COLUMNS = (
    "Slot", "Code", "Tester Name", "Tester Email",
    "UT Session", "Date Sent", "Status", "Notes",
)


@dataclass
class BatchRow:
    slot: str = ""
    code: str = ""
    tester_name: str = ""
    tester_email: str = ""
    ut_session: str = ""
    date_sent: str = ""
    status: str = "unused"
    notes: str = ""


@dataclass
class BatchFile:
    path: Path
    header_lines: list[str] = field(default_factory=list)
    rows: list[BatchRow] = field(default_factory=list)

    # ── parsing ────────────────────────────────────────────────────────────

    @classmethod
    def parse(cls, path: Path) -> "BatchFile":
        text = path.read_text(encoding="utf-8")
        header: list[str] = []
        rows: list[BatchRow] = []
        in_table = False
        for raw in text.splitlines():
            if not in_table:
                header.append(raw)
                # The first data row appears immediately below the
                # `Slot | Code | ...` line and the `-----` separator.
                if raw.startswith("Slot ") and "|" in raw:
                    in_table = True
                continue
            if raw.startswith("---") or not raw.strip():
                # Separator row, blank line — keep visually but skip parsing.
                continue
            cells = [c.strip() for c in raw.split("|")]
            if len(cells) < 8:
                # Malformed — extend with empties so we do not lose the row.
                cells = cells + [""] * (8 - len(cells))
            rows.append(BatchRow(
                slot=cells[0], code=cells[1], tester_name=cells[2],
                tester_email=cells[3], ut_session=cells[4],
                date_sent=cells[5], status=cells[6], notes=cells[7],
            ))
        return cls(path=path, header_lines=header, rows=rows)

    def find_by_code(self, code: str) -> BatchRow | None:
        norm = code.strip().upper()
        for row in self.rows:
            if row.code.strip().upper() == norm:
                return row
        return None

    # ── mutation + write-back ──────────────────────────────────────────────

    def update_assignment(
        self,
        code: str,
        tester_name: str = "",
        tester_email: str = "",
        ut_session: str = "",
        notes: str = "",
        date_sent: str | None = None,
    ) -> bool:
        """Patch the row for `code` with assignment fields. Returns True if
        a row matched and was updated."""
        row = self.find_by_code(code)
        if row is None:
            return False
        if tester_name:  row.tester_name = tester_name
        if tester_email: row.tester_email = tester_email
        if ut_session:   row.ut_session = ut_session
        if notes:        row.notes = notes
        row.date_sent = date_sent or date.today().isoformat()
        if row.status == "unused":
            row.status = "sent"
        self._write()
        return True

    def update_status(self, code: str, status: str) -> bool:
        row = self.find_by_code(code)
        if row is None:
            return False
        row.status = status
        self._write()
        return True

    def _write(self) -> None:
        widths = self._column_widths()
        sep_line = "-" * widths[0] + "|" + "|".join("-" * (w + 2) for w in widths[1:])
        out: list[str] = list(self.header_lines)
        # The header_lines list ends with the `Slot | Code | ...` line; the
        # original file follows that with a separator we replaced. Append a
        # fresh separator + data rows.
        out.append(sep_line)
        for r in self.rows:
            out.append(self._fmt_row(r, widths))
        self.path.write_text("\n".join(out) + "\n", encoding="utf-8")

    @staticmethod
    def _column_widths() -> list[int]:
        # Same widths used by the auto-create template below. Manual edits
        # do not need to preserve these — the parser splits on `|`.
        return [4, 14, 11, 12, 10, 10, 6, 60]

    @staticmethod
    def _fmt_row(r: BatchRow, widths: list[int]) -> str:
        fields = [r.slot, r.code, r.tester_name, r.tester_email,
                  r.ut_session, r.date_sent, r.status, r.notes]
        parts: list[str] = []
        for i, value in enumerate(fields):
            parts.append(f"{value:<{widths[i]}}")
        return " | ".join(parts).rstrip()


# ── creation + discovery helpers ──────────────────────────────────────────

def write_new_batch_file(
    codes_dir: Path,
    batch: str,
    codes: Iterable[str],
    minted_at_iso: str,
    label: str = "",
) -> Path:
    """Write a fresh tracking file for `batch` with `codes` pre-populated.

    Filename: `<codes_dir>/<batch>.txt`. Refuses to overwrite an existing
    file — caller should rotate or rename if a name collision happens.
    """
    codes_dir.mkdir(parents=True, exist_ok=True)
    path = codes_dir / f"{batch}.txt"
    if path.exists():
        raise FileExistsError(
            f"Tracking file already exists: {path}. "
            f"Move or delete it before re-minting under the same batch name."
        )

    lines: list[str] = []
    lines.append(f"# Pro promo codes — batch: {batch}")
    lines.append(f"# Minted: {minted_at_iso}")
    if label:
        lines.append(f"# Label: {label}")
    lines.append("# Source: tools/promo (mint via CLI or web UI)")
    lines.append("#")
    lines.append("# Schema:")
    lines.append("#   Slot          — sequence number, fixed for the batch")
    lines.append("#   Code          — the SENT-XXXX-XXXX promo string")
    lines.append("#   Tester Name   — optional human name")
    lines.append("#   Tester Email  — optional email (mirror of Sheet col E once redeemed)")
    lines.append("#   UT Session    — UserTesting session ID, if applicable")
    lines.append("#   Date Sent     — ISO date this code was assigned to a recipient")
    lines.append("#   Status        — unused | sent | redeemed | voided")
    lines.append("#   Notes         — free-form")
    lines.append("#")
    lines.append("# DO NOT COMMIT — promo_codes/ is gitignored.")
    lines.append("")

    widths = BatchFile._column_widths()
    header = " | ".join(f"{c:<{widths[i]}}" for i, c in enumerate(HEADER_COLUMNS)).rstrip()
    sep_line = "-" * widths[0] + "|" + "|".join("-" * (w + 2) for w in widths[1:])
    lines.append(header)
    lines.append(sep_line)

    for i, code in enumerate(codes, start=1):
        row = BatchRow(slot=f"{i:02d}", code=code)
        lines.append(BatchFile._fmt_row(row, widths))

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def find_batch_file_for_code(codes_dir: Path, code: str) -> BatchFile | None:
    """Glob `codes_dir/*.txt` and return the BatchFile that contains `code`,
    or None if no file claims it. Used on assign + void to mirror Sheet
    state into local tracking when a file exists."""
    if not codes_dir.exists():
        return None
    for path in sorted(codes_dir.glob("*.txt")):
        try:
            bf = BatchFile.parse(path)
        except Exception:
            continue
        if bf.find_by_code(code):
            return bf
    return None
