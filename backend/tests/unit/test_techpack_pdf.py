"""
RQ-036 — Style Tech-Pack PDF Extraction Service tests.

Covers `apps.merchandising.techpack.pdf_parser.StyleTechPackParser`:
golden-value header extraction, note-block reconstruction, BOM table
extraction, error handling, and determinism.

Pure functions — no Django DB. Golden fixture: `PDF Extract/Sample style doc.pdf`.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from apps.merchandising.techpack.pdf_parser import (
    StyleTechPackParser,
    TechPackBOMRow,
    TechPackDesignInfo,
    TechPackDocument,
)

PDF_EXTRACT_DIR = Path(__file__).resolve().parents[2].parent / "PDF Extract"
SAMPLE_PDF = PDF_EXTRACT_DIR / "Sample style doc.pdf"

# The Note value in the golden Excel (`Extracted_2026-07-13 .xlsx`) was produced
# by the buyer's tool: it merges right-column rows and glues "74CM-LEG" (no space).
# The parser reproduces the raw right-hand note column line-by-line, so we assert
# content + order fidelity (whitespace-normalised) rather than byte-equality.
GOLDEN_NOTE = (
    "BASED ON THE BLOCK OF 59073T \n"
    "BUT -INLEG LENGTH BE 74CM-LEG OPENING TO BE REMAIN AS \n"
    "78CM\n"
    "BARTACK AT END OF FRONT FLY, \n"
    "FRONT POCKET OPENING, BELT LOOP\n"
    "WAIST SEAM INSIDE TO BE OVERLOCKED"
)


def make_minimal_pdf(pages_text: list[str]) -> bytes:
    """Build a small (xref-less, pdfminer-tolerated) PDF with one text line per page."""
    n = len(pages_text)
    kids = " ".join(f"{3 + 2 * i} 0 R" for i in range(n))
    parts = [
        b"%PDF-1.4\n",
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [" + kids.encode() + b"] /Count " + str(n).encode() + b" >> endobj\n",
    ]
    for i, text in enumerate(pages_text):
        page_obj = 3 + 2 * i
        content_obj = page_obj + 1
        font_obj = content_obj + 1
        content = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("latin-1")
        parts.append(
            (
                f"{page_obj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Resources << /Font << /F1 {font_obj} 0 R >> >> /Contents {content_obj} 0 R >> endobj\n"
            ).encode()
        )
        parts.append(
            f"{content_obj} 0 obj << /Length {len(content)} >> stream\n".encode()
            + content
            + b"\nendstream endobj\n"
        )
        parts.append(
            f"{font_obj} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n".encode()
        )
    parts.append(b"trailer << /Root 1 0 R /Size %d >>\n%%EOF\n" % (3 + 2 * n))
    return b"".join(parts)


@pytest.fixture(scope="module")
def parser() -> StyleTechPackParser:
    return StyleTechPackParser()


@pytest.fixture(scope="module")
def sample_doc(parser):
    return parser.parse(SAMPLE_PDF.read_bytes())


# ---------------------------------------------------------------- header fields


def test_parse_bytes_returns_techpackdocument(sample_doc):
    assert isinstance(sample_doc, TechPackDocument)
    assert isinstance(sample_doc.design_info, TechPackDesignInfo)
    assert isinstance(sample_doc.bom_rows[0], TechPackBOMRow)


def test_parse_accepts_path_and_file_like(parser):
    assert parser.parse(str(SAMPLE_PDF)).design_info.style_number == "67741T"
    assert parser.parse(SAMPLE_PDF).design_info.style_number == "67741T"
    with open(SAMPLE_PDF, "rb") as fh:
        assert parser.parse(fh).design_info.style_number == "67741T"


def test_issue_date_normalized(sample_doc):
    assert sample_doc.design_info.issue_date == date(2022, 3, 22)


def test_block(sample_doc):
    assert sample_doc.design_info.block == "59073T"


def test_based_on(sample_doc):
    assert sample_doc.design_info.based_on == "59073T"


def test_customer(sample_doc):
    assert sample_doc.design_info.customer == "DOTTI"


def test_style_number(sample_doc):
    assert sample_doc.design_info.style_number == "67741T"


def test_size(sample_doc):
    assert sample_doc.design_info.size == "10"


def test_designer(sample_doc):
    assert sample_doc.design_info.designer == "Emmi.Huynh"


def test_pattern_cutter(sample_doc):
    assert sample_doc.design_info.pattern_cutter == "HAI"


def test_issuer(sample_doc):
    assert sample_doc.design_info.issuer == "Clone"


def test_cloth_code_matches_golden(sample_doc):
    # Golden per master-backlog RQ-036 spec: cloth_code = SANDWASH LINEN.
    # The SKU LXeKn-g5t2h9 sits in the right-hand Customer/SKU column and is
    # proofed manually in the RQ-040 Excel flow, so it is excluded here.
    assert sample_doc.design_info.cloth_code == "SANDWASH LINEN"


def test_length_from_cloth_code_trailing_zero(sample_doc):
    assert sample_doc.design_info.length == "0"


def test_description(sample_doc):
    assert sample_doc.design_info.description == "565235 LB LIZZIE WIDE LEG PANT"


def test_sketch_default_empty(sample_doc):
    assert sample_doc.design_info.sketch == ""


def test_design_info_to_dict_json_safe(sample_doc):
    data = sample_doc.design_info.to_dict()
    assert data["issue_date"] == "2022-03-22"
    assert data["style_number"] == "67741T"
    assert data["description"] == "565235 LB LIZZIE WIDE LEG PANT"


# ------------------------------------------------------------------ note block


def test_note_contains_right_column_content_in_order(sample_doc):
    note = "".join(sample_doc.design_info.note.split())
    golden = "".join(GOLDEN_NOTE.split())
    assert note == golden


def test_note_excludes_left_column(sample_doc):
    note = sample_doc.design_info.note
    for forbidden in ("EDGE STITCH", "FASTEN", "X1", "X2", "X3", "TURN BACK"):
        assert forbidden not in note


# ------------------------------------------------------------------------ BOM


def test_bom_has_six_rows(sample_doc):
    assert len(sample_doc.bom_rows) == 6


def test_bom_row1_cloth(sample_doc):
    row = sample_doc.bom_rows[0]
    assert row.type == "Cloth"
    assert row.description_code == "SANDWASH LINEN XK-529"
    assert row.location == "MAIN"
    assert row.supplier == "ALICE-"
    assert row.colour == "BLACK"
    assert row.width_size == "132 CM"
    assert row.qty == Decimal("1.67")
    assert row.match == ""


def test_bom_row2_button(sample_doc):
    row = sample_doc.bom_rows[1]
    assert row.type == "Trims"
    assert row.description_code == "BUTTON 4 HOLES FV9757"
    assert row.location == "W/B"
    assert row.supplier == "FOURSEASONS"
    assert row.colour == "BROWN #09"
    assert row.width_size == "24 LN"
    assert row.qty == Decimal("2")


def test_bom_row3_zipper(sample_doc):
    row = sample_doc.bom_rows[2]
    assert row.type == "Trims"
    assert row.description_code == "NYLON ZIPPER"
    assert row.location == "FRONT FLY"
    assert row.supplier == "YKK"
    assert row.colour == "DTM"
    assert row.width_size == "#3/17 CM"
    assert row.qty == Decimal("1")


def test_bom_row4_elastic(sample_doc):
    row = sample_doc.bom_rows[3]
    assert row.type == "Trims"
    assert row.description_code == "ELASTIC BAND P701"
    assert row.location == "BACK WAIST"
    assert row.supplier == "KT TRIMS"
    assert row.colour == "BLACK"
    assert row.width_size == "5 CM"
    assert row.qty == Decimal("0.47")


def test_bom_row5_interfacing(sample_doc):
    row = sample_doc.bom_rows[4]
    assert row.type == "Interfacing"
    assert row.description_code == "FUSING 2012"
    assert row.location == "AS PER PATTERN"
    assert row.supplier == "THANH PHONG"
    assert row.colour == "BLACK"
    assert row.width_size == "150 CM"
    assert row.qty == Decimal("0.12")


def test_bom_row6_lining(sample_doc):
    row = sample_doc.bom_rows[5]
    assert row.type == "Lining"
    assert row.description_code == "POLY COTTON"
    assert row.location == "POCKET BAG"
    assert row.supplier == "DOAN KET"
    assert row.colour == "DTM"
    assert row.width_size == "145 CM"
    assert row.qty == Decimal("0.16")


def test_bom_qty_is_decimal(sample_doc):
    for row in sample_doc.bom_rows:
        assert isinstance(row.qty, Decimal)


def test_bom_match_column_empty(sample_doc):
    assert all(row.match == "" for row in sample_doc.bom_rows)


def test_bom_row_to_dict_json_safe(sample_doc):
    data = sample_doc.bom_rows[0].to_dict()
    assert data["type"] == "Cloth"
    assert data["width_size"] == "132 CM"
    assert data["qty"] == 1.67


# --------------------------------------------------------------- error handling


def test_non_pdf_bytes_raises_valueerror(parser):
    with pytest.raises(ValueError):
        parser.parse(b"this is definitely not a pdf")


def test_empty_bytes_raises_valueerror(parser):
    with pytest.raises(ValueError):
        parser.parse(b"")


def test_blank_page_returns_warnings_not_crash(parser):
    doc = parser.parse(make_minimal_pdf([""]))
    assert isinstance(doc, TechPackDocument)
    assert doc.bom_rows == ()
    assert doc.warnings


def test_missing_bom_table_returns_warnings(parser):
    doc = parser.parse(make_minimal_pdf(["Description 565235 LB LIZZIE WIDE LEG PANT"]))
    assert doc.bom_rows == ()
    assert any("BOM" in w for w in doc.warnings)


def test_multipage_uses_first_page_only(parser):
    doc = parser.parse(make_minimal_pdf(["Description 565235 LB LIZZIE WIDE LEG PANT", "FAKE SECOND PAGE"]))
    assert doc.design_info.description == "565235 LB LIZZIE WIDE LEG PANT"


# ---------------------------------------------------------------- determinism


def test_parse_is_deterministic(parser):
    first = parser.parse(SAMPLE_PDF.read_bytes())
    second = parser.parse(SAMPLE_PDF.read_bytes())
    assert first.to_dict() == second.to_dict()
