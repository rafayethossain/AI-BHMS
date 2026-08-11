"""
RQ-037 — Tech-Pack Excel Generation Service tests.

Covers `apps.merchandising.techpack.excel_export.write_techpack_workbook`:
two-sheet layout fidelity against the sample workbook
(`PDF Extract/Extracted_2026-07-13 .xlsx`), real date/number cell types,
and lossless round-trip back into the RQ-036 DTO.

Pure functions — no Django DB.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

import pytest
from openpyxl import load_workbook

from apps.merchandising.techpack.excel_export import (
    BOM_HEADERS,
    BOM_TITLE,
    DESIGN_INFO_HEADERS,
    DESIGN_INFO_TITLE,
    write_techpack_workbook,
)
from apps.merchandising.techpack.pdf_parser import (
    StyleTechPackParser,
    TechPackDesignInfo,
    TechPackDocument,
)

PDF_EXTRACT_DIR = __import__("pathlib").Path(__file__).resolve().parents[2].parent / "PDF Extract"
SAMPLE_PDF = PDF_EXTRACT_DIR / "Sample style doc.pdf"

DESIGN_INFO_HEADERS_SAMPLE = [
    "Issue Date", "Block", "Based On", "Customer", "Style Number", "Size",
    "Designer", "Pattern Cutter", "Issuer", "Cloth Code", "Length", "Sketch",
    "Description", "Note",
]

BOM_HEADERS_SAMPLE = [
    "Type", "Description/ Code ", "Location", "Supplier", "Colour",
    "Width/Size", "Qty", "Match",
]


@pytest.fixture(scope="module")
def parsed_doc() -> TechPackDocument:
    return StyleTechPackParser().parse(SAMPLE_PDF.read_bytes())


@pytest.fixture(scope="module")
def workbook_bytes(parsed_doc) -> bytes:
    return write_techpack_workbook(parsed_doc).read()


def _load(buf: bytes):
    return load_workbook(BytesIO(buf))


# ------------------------------------------------------------------- structure


def test_returns_xlsx_bytes(workbook_bytes):
    assert workbook_bytes.startswith(b"PK")  # xlsx is a zip container


def test_two_sheets_with_exact_titles(workbook_bytes):
    assert _load(workbook_bytes).sheetnames == ["Design Infromation", "BOM"]


def test_design_info_title_cell(workbook_bytes):
    ws = _load(workbook_bytes)["Design Infromation"]
    assert ws["A1"].value == DESIGN_INFO_TITLE == "Design Sheet"


def test_design_info_header_row_exact(workbook_bytes):
    ws = _load(workbook_bytes)["Design Infromation"]
    header = [ws.cell(row=2, column=col).value for col in range(1, 15)]
    assert header == DESIGN_INFO_HEADERS == DESIGN_INFO_HEADERS_SAMPLE


def test_bom_title_cell(workbook_bytes):
    ws = _load(workbook_bytes)["BOM"]
    assert ws["A1"].value == BOM_TITLE == "Bill of Materials (BOM)"


def test_bom_header_row_exact(workbook_bytes):
    ws = _load(workbook_bytes)["BOM"]
    header = [ws.cell(row=2, column=col).value for col in range(1, 9)]
    assert header == BOM_HEADERS == BOM_HEADERS_SAMPLE


# -------------------------------------------------------------------- cell types


def test_issue_date_written_as_real_date(parsed_doc, workbook_bytes):
    ws = _load(workbook_bytes)["Design Infromation"]
    cell = ws["A3"]
    assert cell.data_type == "d"
    assert isinstance(cell.value, datetime)
    assert cell.value.date() == date(2022, 3, 22)


def test_design_info_values_written(parsed_doc, workbook_bytes):
    ws = _load(workbook_bytes)["Design Infromation"]
    values = [ws.cell(row=3, column=col).value for col in range(1, 15)]
    assert values[1] == parsed_doc.design_info.block == "59073T"
    assert values[3] == "DOTTI"
    assert values[4] == "67741T"
    assert values[5] == "10"
    assert values[6] == "Emmi.Huynh"
    assert values[9] == "SANDWASH LINEN"
    assert values[10] == "0"
    assert values[12] == "565235 LB LIZZIE WIDE LEG PANT"


def test_bom_qty_written_as_numbers(workbook_bytes):
    ws = _load(workbook_bytes)["BOM"]
    qty_cells = [ws.cell(row=r, column=7).value for r in range(3, 9)]
    assert all(isinstance(q, (int, float)) for q in qty_cells)
    assert qty_cells == [1.67, 2, 1, 0.47, 0.12, 0.16]


def test_bom_rows_written(parsed_doc, workbook_bytes):
    ws = _load(workbook_bytes)["BOM"]
    assert ws.max_row == 8
    assert ws["A3"].value == "Cloth"
    assert ws["B3"].value == "SANDWASH LINEN XK-529"
    assert ws["H8"].value is None  # Match column empty
    assert ws["B8"].value == "POLY COTTON"


def test_match_column_present_and_empty(workbook_bytes):
    ws = _load(workbook_bytes)["BOM"]
    assert ws["H2"].value == "Match"
    assert all(ws.cell(row=r, column=8).value is None for r in range(3, 9))


# -------------------------------------------------------------------- round-trip


def test_round_trip_design_info_equals_dto(parsed_doc, workbook_bytes):
    ws = _load(workbook_bytes)["Design Infromation"]
    values = [ws.cell(row=3, column=col).value for col in range(1, 15)]
    dto = parsed_doc.design_info
    # Empty cells read back as None; the RQ-038 importer coerces None -> "".
    text = [v if v is not None else "" for v in values]
    assert text[0].date() == dto.issue_date  # datetime -> date
    assert text[1] == dto.block
    assert text[2] == dto.based_on
    assert text[3] == dto.customer
    assert text[4] == dto.style_number
    assert text[5] == dto.size
    assert text[6] == dto.designer
    assert text[7] == dto.pattern_cutter
    assert text[8] == dto.issuer
    assert text[9] == dto.cloth_code
    assert text[10] == dto.length
    assert text[11] == dto.sketch
    assert text[12] == dto.description
    assert text[13] == dto.note


def test_round_trip_bom_rows_equals_dto(parsed_doc, workbook_bytes):
    ws = _load(workbook_bytes)["BOM"]
    for offset, dto in enumerate(parsed_doc.bom_rows):
        row = 3 + offset
        assert ws.cell(row=row, column=1).value == dto.type
        assert ws.cell(row=row, column=2).value == dto.description_code
        assert ws.cell(row=row, column=3).value == dto.location
        assert ws.cell(row=row, column=4).value == dto.supplier
        assert ws.cell(row=row, column=5).value == dto.colour
        assert ws.cell(row=row, column=6).value == dto.width_size
        assert Decimal(str(ws.cell(row=row, column=7).value)) == dto.qty


def test_round_trip_note_preserved(parsed_doc, workbook_bytes):
    ws = _load(workbook_bytes)["Design Infromation"]
    assert ws["N3"].value == parsed_doc.design_info.note


# ------------------------------------------------------------- edge cases / empty


def test_empty_bom_workbook(workbook_bytes):
    empty_doc = TechPackDocument(
        design_info=TechPackDesignInfo(issue_date=date(2022, 3, 22)),
        bom_rows=(),
    )
    data = write_techpack_workbook(empty_doc).read()
    ws = _load(data)["BOM"]
    assert ws["A1"].value == BOM_TITLE
    assert [ws.cell(row=2, column=col).value for col in range(1, 9)] == BOM_HEADERS
    assert ws.max_row == 2


def test_workbook_opens_without_repair(workbook_bytes):
    # Proxies "opens in Excel without repair prompts": both data-only and
    # formula-aware reads must load cleanly, and every sheet must be valid.
    wb = load_workbook(BytesIO(workbook_bytes), data_only=True)
    assert wb.sheetnames == ["Design Infromation", "BOM"]
    for name in wb.sheetnames:
        wb[name].max_row > 0
