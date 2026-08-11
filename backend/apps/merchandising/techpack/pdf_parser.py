"""
Style Tech-Pack PDF extraction service (RQ-036).

Parses a buyer "CCL DESIGN SHEET" PDF into a structured, validated DTO
(``TechPackDocument``): the design-sheet header fields, the note/instruction
block, and the BOM table — matching the golden workbook values of
``PDF Extract/Sample style doc.pdf`` ↔ ``Extracted_2026-07-13 .xlsx``.

Design constraints (per master-backlog Part 3):
- Pure functions only — no Django model dependency, unit-testable without a DB.
- First page only (documented); extra pages are ignored.
- Bad input raises ``ValueError``; recoverable problems produce structured
  warnings, never crashes.
- Deterministic: same input → identical DTO every run.
"""
from __future__ import annotations

import io
import os
import re
from dataclasses import asdict, dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pdfplumber

__all__ = ["StyleTechPackParser", "TechPackBOMRow", "TechPackDesignInfo", "TechPackDocument"]

# Header label → field, longest-first so multi-word labels win over prefixes.
LABELS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("Issue", "Date"), "issue_date"),
    (("STYLE", "NUMBER"), "style_number"),
    (("Patt", "Cutter"), "pattern_cutter"),
    (("Cloth", "Code"), "cloth_code"),
    (("Based", "on"), "based_on"),
    (("Block",), "block"),
    (("Customer",), "customer"),
    (("Size",), "size"),
    (("Designer",), "designer"),
    (("Issuer",), "issuer"),
    (("Length",), "length"),
    (("Description",), "description"),
)

BOM_COLUMNS: tuple[str, ...] = (
    "type",
    "description_code",
    "location",
    "supplier",
    "colour",
    "width_size",
    "qty",
    "match",
)

BOM_COLUMN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "type": ("type",),
    "description_code": ("description",),
    "location": ("location",),
    "supplier": ("supplier",),
    "colour": ("colour", "color"),
    "width_size": ("w/size", "width", "w size"),
    "qty": ("qty", "quantity"),
    "match": ("match",),
}

_ROW_TOLERANCE = 3.0
_NOTE_COLUMN_MIN_GAP = 20.0


@dataclass(frozen=True)
class TechPackBOMRow:
    """One BOM table row from the design sheet."""

    type: str
    description_code: str
    location: str = ""
    supplier: str = ""
    colour: str = ""
    width_size: str = ""
    qty: Decimal | None = None
    match: str = ""

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "description_code": self.description_code,
            "location": self.location,
            "supplier": self.supplier,
            "colour": self.colour,
            "width_size": self.width_size,
            "qty": float(self.qty) if self.qty is not None else None,
            "match": self.match,
        }


@dataclass(frozen=True)
class TechPackDesignInfo:
    """The design-sheet header fields (14, mirroring the golden workbook)."""

    issue_date: date | None = None
    block: str = ""
    based_on: str = ""
    customer: str = ""
    style_number: str = ""
    size: str = ""
    designer: str = ""
    pattern_cutter: str = ""
    issuer: str = ""
    cloth_code: str = ""
    length: str = ""
    sketch: str = ""
    description: str = ""
    note: str = ""

    def to_dict(self) -> dict:
        data = asdict(self)
        data["issue_date"] = self.issue_date.isoformat() if self.issue_date else None
        return data


@dataclass(frozen=True)
class TechPackDocument:
    """Full structured result of parsing one style PDF."""

    design_info: TechPackDesignInfo
    bom_rows: tuple[TechPackBOMRow, ...] = ()
    errors: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {
            "design_info": self.design_info.to_dict(),
            "bom_rows": [row.to_dict() for row in self.bom_rows],
            "errors": list(self.errors),
            "warnings": list(self.warnings),
        }


class _Row:
    __slots__ = ("top", "words")

    def __init__(self, top: float, words: list[dict]) -> None:
        self.top = top
        self.words = words

    @property
    def tokens(self) -> list[str]:
        return [w["text"] for w in self.words]


def _cluster_words(words: list[dict], tolerance: float = _ROW_TOLERANCE) -> list[_Row]:
    """Group words into visual rows by vertical position (same baseline)."""
    rows: list[_Row] = []
    for word in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(rows[-1].top - word["top"]) <= tolerance:
            rows[-1].words.append(word)
        else:
            rows.append(_Row(word["top"], [word]))
    for row in rows:
        row.words.sort(key=lambda w: w["x0"])
    return rows


def _find_label_spans(tokens: list[str]) -> list[tuple[int, int, str]]:
    """Locate header-label spans (start, end, field) in a row's token list."""
    spans: list[tuple[int, int, str]] = []
    i = 0
    while i < len(tokens):
        matched: tuple[tuple[str, ...], str] | None = None
        for label, field in LABELS:
            if tuple(tokens[i : i + len(label)]) == label:
                matched = (label, field)
                break
        if matched is not None:
            label, field = matched
            spans.append((i, i + len(label), field))
            i += len(label)
        else:
            i += 1
    return spans


def _find_customer_x0(rows: list[_Row]) -> float | None:
    """x0 of the 'Customer' label — also the start of the right note column."""
    for row in rows:
        spans = _find_label_spans(row.tokens)
        for start, _, field in spans:
            if field == "customer":
                return row.words[start]["x0"]
    return None


def _split_cloth_code(
    value_tokens: list[str], words: list[dict], customer_x0: float | None, fields: dict[str, object]
) -> dict[str, object]:
    """Cloth Code row scan: trailing numeric → length; drop right-column SKU tokens.

    The golden value is the cloth-description word scan of the label row
    (e.g. ``SANDWASH LINEN``). A trailing purely-numeric token is the length
    (``0``); tokens sharing the right-hand Customer/SKU column (x0 >= the
    ``Customer`` label x0, e.g. the SKU ``LXeKn-g5t2h9``) are excluded and
    proofed manually in the RQ-040 Excel flow.
    """
    tokens = list(value_tokens)
    x0s = [w["x0"] for w in words]
    if tokens and tokens[-1].isdigit() and not fields.get("length"):
        fields["length"] = tokens.pop()
        x0s.pop()
    if customer_x0 is not None:
        tokens = [tok for tok, x0 in zip(tokens, x0s) if x0 < customer_x0]
    fields["cloth_code"] = " ".join(tokens).strip()
    return fields


def _clean(cell: object) -> str:
    return re.sub(r"\s+", " ", str(cell or "")).strip()


def _coerce_qty(raw: str, warnings: list[str]) -> Decimal | None:
    if not raw:
        return None
    try:
        return Decimal(raw)
    except InvalidOperation:
        warnings.append(f"BOM qty could not be parsed: {raw!r}")
        return None


def _normalize_width(value: str) -> str:
    return re.sub(r"(?i)([0-9#/])(CM|LN)", r"\1 \2", value)


class StyleTechPackParser:
    """Parses buyer style PDFs into :class:`TechPackDocument`."""

    def parse(self, pdf: bytes | str | os.PathLike | object) -> TechPackDocument:
        """Parse a PDF (bytes, path, or file-like) and return the DTO.

        Raises ``ValueError`` for non-PDF or empty input. Multi-page PDFs are
        parsed from the first page only (documented behaviour).
        """
        stream = self._as_stream(pdf)
        try:
            pdf_doc = pdfplumber.open(stream)
        except Exception as exc:  # noqa: BLE001 - any pdfplumber/pdfminer failure
            raise ValueError(f"Not a valid PDF: {exc}") from exc
        with pdf_doc:
            if not pdf_doc.pages:
                return TechPackDocument(
                    TechPackDesignInfo(),
                    warnings=("PDF has no pages — nothing to extract",),
                )
            return self._parse_page(pdf_doc.pages[0])

    @staticmethod
    def _as_stream(pdf: bytes | str | os.PathLike | object) -> object:
        if isinstance(pdf, bytes):
            return io.BytesIO(pdf)
        if isinstance(pdf, (str, os.PathLike)):
            return open(Path(pdf), "rb")
        return pdf  # file-like; parse() takes ownership

    @staticmethod
    def _parse_page(page) -> TechPackDocument:
        warnings: list[str] = []
        words = page.extract_words()
        if not words:
            warnings.append("No text extracted from the PDF page.")
            return TechPackDocument(TechPackDesignInfo(), warnings=tuple(warnings))

        rows = _cluster_words(words)

        bom_header_top = next(
            (
                row.top
                for row in rows
                if "Type" in row.tokens and "Description/Code" in row.tokens
            ),
            None,
        )
        cloth_code_top = next(
            (row.top for row in rows if "Cloth" in row.tokens and "Code" in row.tokens), None
        )

        if bom_header_top is None:
            warnings.append(
                "BOM table not found — expected a table headed Type / Description / Location / "
                "Supplier / Colour / W/Size / Qty / Match."
            )
            bom_rows: tuple[TechPackBOMRow, ...] = ()
        else:
            bom_rows, bom_warnings = StyleTechPackParser._extract_bom(page, bom_header_top)
            warnings.extend(bom_warnings)

        header_rows = [
            row
            for row in rows
            if (cloth_code_top is None or row.top <= cloth_code_top)
            and (bom_header_top is None or row.top < bom_header_top)
        ]
        note_rows = [
            row
            for row in rows
            if cloth_code_top is not None
            and row.top > cloth_code_top
            and (bom_header_top is None or row.top < bom_header_top)
        ]

        customer_x0 = _find_customer_x0(header_rows)
        design_info = StyleTechPackParser._extract_header(header_rows, warnings, customer_x0)
        design_info = TechPackDesignInfo(
            **{**asdict(design_info), "note": StyleTechPackParser._extract_note(note_rows, customer_x0)}
        )
        return TechPackDocument(design_info, bom_rows=bom_rows, warnings=tuple(warnings))

    @staticmethod
    def _extract_header(
        rows: list[_Row], warnings: list[str], customer_x0: float | None = None
    ) -> TechPackDesignInfo:
        fields: dict[str, object] = {field: "" for _, field in LABELS}
        fields["issue_date"] = None

        # Size / STYLE NUMBER: their labels sit in the top box, values are the
        # trailing tokens of the immediately following row.
        for i, row in enumerate(rows):
            if "STYLE" in row.tokens and "NUMBER" in row.tokens and i + 1 < len(rows):
                following = rows[i + 1].tokens
                if len(following) >= 2:
                    fields["size"] = following[-2]
                    fields["style_number"] = following[-1]
                break

        reserved = {fields["size"], fields["style_number"]} - {""}

        for row in rows:
            spans = _find_label_spans(row.tokens)
            for pos, (start, end, field) in enumerate(spans):
                if fields[field]:  # already resolved (size / style_number)
                    continue
                value_end = spans[pos + 1][0] if pos + 1 < len(spans) else len(row.tokens)
                value_tokens = row.tokens[end:value_end]
                while value_tokens and value_tokens[-1] in reserved:
                    value_tokens.pop()
                if field == "cloth_code":
                    fields = _split_cloth_code(
                        value_tokens, row.words[end:value_end], customer_x0, fields
                    )
                    continue
                value = " ".join(value_tokens).strip()
                if field == "issue_date":
                    fields["issue_date"] = _parse_issue_date(value, warnings)
                else:
                    fields[field] = value

        return TechPackDesignInfo(**fields)

    @staticmethod
    def _extract_note(rows: list[_Row], threshold: float | None = None) -> str:
        if not rows:
            return ""
        if threshold is None:
            x_positions = sorted({w["x0"] for row in rows for w in row.words})
            if len(x_positions) >= 2:
                gaps = [
                    (x_positions[i + 1] - x_positions[i], x_positions[i], x_positions[i + 1])
                    for i in range(len(x_positions) - 1)
                ]
                gap, low, high = max(gaps, key=lambda g: g[0])
                if gap >= _NOTE_COLUMN_MIN_GAP:
                    threshold = (low + high) / 2
        lines = [
            " ".join(w["text"] for w in row.words if threshold is None or w["x0"] >= threshold)
            for row in rows
        ]
        return "\n".join(line for line in lines if line)

    @staticmethod
    def _extract_bom(page, bom_header_top: float) -> tuple[tuple[TechPackBOMRow, ...], list[str]]:
        warnings: list[str] = []
        crop = page.crop((0, bom_header_top - 3, page.width, page.height))
        tables = crop.extract_tables()
        for table in tables:
            header_index, columns = StyleTechPackParser._find_bom_columns(table)
            if header_index is None:
                continue
            rows: list[TechPackBOMRow] = []
            for raw_row in table[header_index + 1 :]:
                cells = {col: _clean(raw_row[idx]) if idx is not None else "" for col, idx in columns.items()}
                if not cells["type"]:
                    continue
                if not cells["location"] and not cells["supplier"]:
                    continue  # stray/footer rows without column data
                rows.append(
                    TechPackBOMRow(
                        type=cells["type"],
                        description_code=cells["description_code"],
                        location=cells["location"],
                        supplier=cells["supplier"],
                        colour=cells["colour"],
                        width_size=_normalize_width(cells["width_size"]),
                        qty=_coerce_qty(cells["qty"], warnings),
                        match=cells["match"],
                    )
                )
            return tuple(rows), warnings
        warnings.append("BOM table found but its header row could not be matched.")
        return (), warnings

    @staticmethod
    def _find_bom_columns(table: list[list[object]]) -> tuple[int | None, dict[str, int | None]]:
        for header_index, row in enumerate(table):
            lowered = {idx: _clean(cell).lower() for idx, cell in enumerate(row)}
            matches: dict[str, int | None] = {col: None for col in BOM_COLUMNS}
            for col, keywords in BOM_COLUMN_KEYWORDS.items():
                for idx, cell in lowered.items():
                    if cell and any(keyword in cell for keyword in keywords):
                        matches[col] = idx
                        break
            if matches["type"] is not None and matches["description_code"] is not None:
                return header_index, matches
        return None, {col: None for col in BOM_COLUMNS}


def _parse_issue_date(raw: str, warnings: list[str]) -> date | None:
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%d/%b/%Y").date()
    except ValueError:
        warnings.append(f"Unrecognised issue-date format: {raw!r}")
        return None
