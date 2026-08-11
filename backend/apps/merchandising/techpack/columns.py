"""
Shared column-mapping helpers for tech-pack Excel work (RQ-038).

Keyword-based header matching, tolerant of reordered/renamed columns and extra
columns — the same matching philosophy the RQ-036 BOM table parser uses, lifted
here so the Excel reader/writer can share one definition of "what a column is".
"""
from __future__ import annotations

from typing import Any, Mapping

DESIGN_INFO_KEYWORDS: dict[str, tuple[str, ...]] = {
    "issue_date": ("issue",),
    "block": ("block",),
    "based_on": ("based",),
    "customer": ("customer",),
    "style_number": ("style",),
    "size": ("size",),
    "designer": ("designer",),
    "pattern_cutter": ("pattern",),
    "issuer": ("issuer",),
    "cloth_code": ("cloth",),
    "length": ("length",),
    "sketch": ("sketch",),
    "description": ("description", "desc"),
    "note": ("note",),
}

BOM_KEYWORDS: dict[str, tuple[str, ...]] = {
    "type": ("type",),
    "description_code": ("description", "desc"),
    "location": ("location",),
    "supplier": ("supplier",),
    "colour": ("colour", "color"),
    "width_size": ("w/size", "width", "w size"),
    "qty": ("qty", "quantity"),
    "match": ("match",),
}


def clean_cell(value: Any) -> str:
    """Normalise a cell value to a single-spaced string for header matching."""
    if value is None:
        return ""
    text = str(value).strip()
    return " ".join(text.split())


def map_columns(header_values: Mapping[int, Any], keywords: Mapping[str, tuple[str, ...]]) -> dict[str, int | None]:
    """Map field names to 1-based column indexes by keyword substring match.

    Each header cell is lower-cased and matched against the first keyword of a
    field that appears within it. Returns ``{field: column_index_or_None}``.
    """
    matched: dict[str, int | None] = {field: None for field in keywords}
    for index, raw in header_values.items():
        header = clean_cell(raw).lower()
        if not header:
            continue
        candidates = [
            (len(keyword), field)
            for field, field_keywords in keywords.items()
            if matched[field] is None
            for keyword in field_keywords
            if keyword in header
        ]
        if not candidates:
            continue
        _, field = max(candidates, key=lambda c: c[0])  # longest keyword wins
        matched[field] = index
    return matched


def find_header_row(ws, keywords: Mapping[str, tuple[str, ...]], min_hits: int) -> int | None:
    """Find the 1-based row whose cells satisfy at least ``min_hits`` fields.

    Header rows are located by keyword content, never by fixed position, so a
    title row above or blank spacer rows do not confuse detection.
    """
    for row in ws.iter_rows():
        values = {cell.column: cell.value for cell in row}
        columns = map_columns(values, keywords)
        hits = sum(1 for col in columns.values() if col is not None)
        if hits >= min_hits:
            return row[0].row
    return None
