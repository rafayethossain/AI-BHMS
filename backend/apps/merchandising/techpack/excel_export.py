"""
Tech-Pack Excel export (RQ-037).

Serializes a :class:`TechPackDocument` into the exact two-sheet workbook layout
of the golden fixture (`PDF Extract/Extracted_2026-07-13 .xlsx`):

* Sheet **"Design Infromation"** (sic — sample spelling preserved for
  compatibility): title row ``Design Sheet``, header row of 14 columns, values
  on row 3. ``Issue Date`` is written as a real date cell; everything else is
  text.
* Sheet **"BOM"**: title row ``Bill of Materials (BOM)``, header row of 8
  columns, one row per BOM line. ``Qty`` is written as a number.

Pure functions — no Django model dependency. Output is returned in-memory
(BytesIO); the sample workbook is never modified.
"""
from __future__ import annotations

import io
from datetime import datetime
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.styles import Font

from .pdf_parser import TechPackBOMRow, TechPackDesignInfo, TechPackDocument

DESIGN_INFO_TITLE = "Design Sheet"
BOM_TITLE = "Bill of Materials (BOM)"

DESIGN_INFO_HEADERS: list[str] = [
    "Issue Date",
    "Block",
    "Based On",
    "Customer",
    "Style Number",
    "Size",
    "Designer",
    "Pattern Cutter",
    "Issuer",
    "Cloth Code",
    "Length",
    "Sketch",
    "Description",
    "Note",
]

BOM_HEADERS: list[str] = [
    "Type",
    "Description/ Code ",
    "Location",
    "Supplier",
    "Colour",
    "Width/Size",
    "Qty",
    "Match",
]

# Column widths mirrored from the golden workbook.
DESIGN_INFO_COLUMN_WIDTHS: dict[str, float] = {
    "A": 19.89, "B": 12.0, "C": 14.11, "D": 11.89, "E": 13.33, "F": 18.89,
    "G": 13.44, "H": 12.55, "I": 12.55, "J": 13.0, "K": 12.0, "L": 20.66,
    "M": 49.0, "N": 53.55,
}

BOM_COLUMN_WIDTHS: dict[str, float] = {
    "A": 35.44, "B": 23.0, "C": 14.55, "D": 13.78, "E": 9.11, "F": 10.22,
    "G": 9.11, "H": 9.11,
}

_BOLD = Font(bold=True)


def write_techpack_workbook(doc: TechPackDocument) -> io.BytesIO:
    """Build the two-sheet workbook for a parsed tech-pack document.

    Returns an in-memory ``BytesIO`` positioned at the start; caller owns the
    buffer (write to storage / return as a download, no file-system writes).
    """
    wb = Workbook()
    ws_info = wb.active
    ws_info.title = "Design Infromation"
    _write_design_info(ws_info, doc.design_info)

    ws_bom = wb.create_sheet("BOM")
    _write_bom(ws_bom, doc.bom_rows)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def _write_design_info(ws, info: TechPackDesignInfo) -> None:
    ws["A1"] = DESIGN_INFO_TITLE
    ws["A1"].font = _BOLD

    for col, header in enumerate(DESIGN_INFO_HEADERS, start=1):
        cell = ws.cell(row=2, column=col, value=header)
        cell.font = _BOLD

    values: list[object] = [
        _as_date_cell(info.issue_date) if info.issue_date else "",
        info.block,
        info.based_on,
        info.customer,
        info.style_number,
        info.size,
        info.designer,
        info.pattern_cutter,
        info.issuer,
        info.cloth_code,
        info.length,
        info.sketch,
        info.description,
        info.note,
    ]
    for col, value in enumerate(values, start=1):
        ws.cell(row=3, column=col, value=value)

    for col_name, width in DESIGN_INFO_COLUMN_WIDTHS.items():
        ws.column_dimensions[col_name].width = width


def _write_bom(ws, rows: tuple[TechPackBOMRow, ...] | list[TechPackBOMRow]) -> None:
    ws["A1"] = BOM_TITLE
    ws["A1"].font = _BOLD

    for col, header in enumerate(BOM_HEADERS, start=1):
        cell = ws.cell(row=2, column=col, value=header)
        cell.font = _BOLD

    for row_index, row in enumerate(rows, start=3):
        ws.cell(row=row_index, column=1, value=row.type)
        ws.cell(row=row_index, column=2, value=row.description_code)
        ws.cell(row=row_index, column=3, value=row.location)
        ws.cell(row=row_index, column=4, value=row.supplier)
        ws.cell(row=row_index, column=5, value=row.colour)
        ws.cell(row=row_index, column=6, value=row.width_size)
        ws.cell(row=row_index, column=7, value=_as_qty(row.qty))
        ws.cell(row=row_index, column=8, value=row.match or None)

    for col_name, width in BOM_COLUMN_WIDTHS.items():
        ws.column_dimensions[col_name].width = width


def _as_date_cell(value) -> datetime:
    """Convert date-like values to a timezone-naive datetime for real date cells."""
    if isinstance(value, datetime):
        return value
    return datetime(value.year, value.month, value.day)


def _as_qty(value: Decimal | float | int | None) -> float | int | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        value = float(value)
    return int(value) if isinstance(value, float) and value.is_integer() else value
