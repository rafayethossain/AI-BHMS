from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


ACCENT = colors.HexColor("#059669")
ACCENT_LIGHT = colors.HexColor("#d1fae5")
TEXT_DARK = colors.HexColor("#1a1a2e")
TEXT_MUTED = colors.HexColor("#6b7280")
BG_LIGHT = colors.HexColor("#f8fafc")


def _build_styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("DocTitle", parent=ss["Title"], fontSize=18, leading=22,
                           textColor=TEXT_DARK, spaceAfter=4, alignment=TA_CENTER,
                           fontName="Helvetica-Bold"))
    ss.add(ParagraphStyle("SectionLabel", parent=ss["Normal"], fontSize=8, leading=10,
                           textColor=TEXT_MUTED, fontName="Helvetica-Bold",
                           spaceAfter=2))
    ss.add(ParagraphStyle("FieldValue", parent=ss["Normal"], fontSize=9, leading=12,
                           textColor=TEXT_DARK, fontName="Helvetica"))
    ss.add(ParagraphStyle("FieldValueBold", parent=ss["Normal"], fontSize=9, leading=12,
                           textColor=TEXT_DARK, fontName="Helvetica-Bold"))
    ss.add(ParagraphStyle("TotalLabel", parent=ss["Normal"], fontSize=11, leading=14,
                           textColor=TEXT_DARK, fontName="Helvetica-Bold", alignment=TA_RIGHT))
    ss.add(ParagraphStyle("TotalValue", parent=ss["Normal"], fontSize=13, leading=16,
                           textColor=ACCENT, fontName="Helvetica-Bold", alignment=TA_RIGHT))
    ss.add(ParagraphStyle("SmallNote", parent=ss["Normal"], fontSize=7.5, leading=10,
                           textColor=TEXT_MUTED, fontName="Helvetica"))
    ss.add(ParagraphStyle("HeaderRight", parent=ss["Normal"], fontSize=9, leading=12,
                           textColor=TEXT_DARK, fontName="Helvetica", alignment=TA_RIGHT))
    return ss


def _info_table(fields, styles):
    data = []
    items = fields.items() if isinstance(fields, dict) else fields
    for label, value in items:
        data.append([
            Paragraph(label, styles["SectionLabel"]),
            Paragraph(str(value) if value else "N/A", styles["FieldValue"]),
        ])
    t = Table(data, colWidths=[90, 170])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def generate_invoice_pdf(title, doc_number, doc_date, buyer, po, items, amount,
                         currency, status, extra_fields=None):
    from io import BytesIO

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=25 * mm, rightMargin=25 * mm,
                            topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _build_styles()
    story = []

    # -- accent line at top --
    story.append(HRFlowable(width="100%", thickness=3, color=ACCENT, spaceAfter=6))

    # -- header row: title on left, doc info on right --
    header_left = Paragraph(title, styles["DocTitle"])
    header_right_data = [
        [Paragraph(f"<b>{doc_number}</b>", styles["HeaderRight"])],
        [Paragraph(str(doc_date), styles["HeaderRight"])],
        [Paragraph(f"Status: <b>{status.upper()}</b>", styles["HeaderRight"])],
    ]
    header_right = Table(header_right_data, colWidths=[140])
    header_right.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    header_tbl = Table([[header_left, header_right]], colWidths=[320, 160])
    header_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 10))

    # -- buyer / PO info block --
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=6))
    story.append(Paragraph("BUYER INFORMATION", styles["SectionLabel"]))
    story.append(Spacer(1, 2))
    buyer_fields = [
        ("Name:", buyer.name if hasattr(buyer, "name") else str(buyer)),
        ("Contact:", getattr(buyer, "contact_person", "") or "N/A"),
        ("Email:", getattr(buyer, "email", "") or "N/A"),
        ("Address:", getattr(buyer, "address", "") or "N/A"),
    ]
    story.append(_info_table(buyer_fields, styles))
    story.append(Spacer(1, 8))

    story.append(Paragraph("PURCHASE ORDER REFERENCE", styles["SectionLabel"]))
    story.append(Spacer(1, 2))
    po_fields = [
        ("PO Number:", po.po_number if hasattr(po, "po_number") else str(po)),
        ("PO Date:", str(po.po_date) if hasattr(po, "po_date") else "N/A"),
        ("Delivery Date:", str(po.delivery_date) if hasattr(po, "delivery_date") else "N/A"),
        ("Factory:", str(po.factory) if hasattr(po, "factory") else "N/A"),
    ]
    story.append(_info_table(po_fields, styles))
    story.append(Spacer(1, 12))

    # -- line items table --
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=6))
    story.append(Paragraph("LINE ITEMS", styles["SectionLabel"]))
    story.append(Spacer(1, 4))

    col_widths = [40, 120, 55, 50, 55, 70]
    header_row = ["#", "Color", "Size", "Qty", "Unit Price", "Line Total"]
    table_data = [header_row]

    for idx, item in enumerate(items, 1):
        color_name = item.get("color_name", "N/A") if isinstance(item, dict) else (
            item.color.name if hasattr(item, "color") and hasattr(item.color, "name") else "N/A")
        size = item.get("size", "") if isinstance(item, dict) else getattr(item, "size", "")
        qty = item.get("quantity", 0) if isinstance(item, dict) else getattr(item, "quantity", 0)
        unit_price = item.get("unit_price", 0) if isinstance(item, dict) else getattr(item, "unit_price", 0)
        line_total = float(qty) * float(unit_price)
        table_data.append([
            str(idx),
            str(color_name),
            str(size),
            str(qty),
            f"{float(unit_price):,.2f}",
            f"{line_total:,.2f}",
        ])

    if not items:
        table_data.append(["", "No items", "", "", "", ""])

    tbl = Table(table_data, colWidths=col_widths, repeatRows=1)
    tbl_style = [
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, ACCENT),
    ]
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            tbl_style.append(("BACKGROUND", (0, i), (-1, i), BG_LIGHT))
    tbl.setStyle(TableStyle(tbl_style))
    story.append(tbl)
    story.append(Spacer(1, 10))

    # -- extra fields (e.g. validity, payment terms, delivery terms) --
    if extra_fields:
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=6))
        story.append(Paragraph("ADDITIONAL DETAILS", styles["SectionLabel"]))
        story.append(Spacer(1, 2))
        story.append(_info_table(extra_fields, styles))
        story.append(Spacer(1, 10))

    # -- total --
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=8))
    total_data = [
        [Paragraph(f"TOTAL ({currency})", styles["TotalLabel"]),
         Paragraph(f"{currency} {float(amount):,.2f}", styles["TotalValue"])],
    ]
    total_tbl = Table(total_data, colWidths=[380, 120])
    total_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEABOVE", (0, 0), (-1, 0), 1, ACCENT),
    ]))
    story.append(total_tbl)
    story.append(Spacer(1, 20))

    # -- footer note --
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=6))
    story.append(Paragraph("This document was generated electronically and is valid without a signature.",
                           styles["SmallNote"]))

    doc.build(story)
    return buf.getvalue()
