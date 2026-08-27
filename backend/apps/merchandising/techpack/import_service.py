"""
Tech-Pack import orchestration (RQ-040).

The Django-coupled layer that turns a parsed :class:`TechPackDocument` (RQ-036
PDF parser / RQ-038 Excel parser) into Style / StyleVersion / StyleItem / BOM /
BOMItem rows in a single atomic transaction. Kept out of ``pdf_parser`` /
``excel_*`` so those modules stay DB-free and unit-testable without a database;
this module is the one place that writes models for the import flow.

Mapping contract:
- One Style per ``design_info.style_number`` (upsert: an existing style with the
  same number is updated and gets a new StyleVersion instead of a duplicate).
- One BOM (version 1) per imported StyleVersion.
- One StyleItem + one BOMItem per BOM row; the BOM columns land on the RQ-041
  tech-pack fields (``location`` / ``colour`` / ``width_size`` / ``match``) and
  the row ``Qty`` becomes the consumption.
- An optional ``StyleTechPack`` is linked to the style and moved to ``completed``.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from ..models import (
    BOM,
    BOMItem,
    DesignSheet,
    Style,
    StyleItem,
    StyleTechPack,
    StyleVersion,
)
from .pdf_parser import TechPackDocument


@dataclass
class TechPackImportResult:
    """Everything created/updated by one tech-pack import."""

    style: Style
    style_version: StyleVersion
    bom: BOM
    style_items: list[StyleItem]
    bom_items: list[BOMItem]
    created: bool
    design_sheet: DesignSheet | None = None


@transaction.atomic
def import_style_from_techpack(
    *, tenant, user, buyer, doc: TechPackDocument, techpack: StyleTechPack | None = None
) -> TechPackImportResult:
    """Import a tech-pack document into the style/BOM model tree.

    Atomic: any failure rolls back every write (partial style, version, BOM,
    items). ``buyer`` must already belong to ``tenant``.
    """
    design = doc.design_info
    style_number = design.style_number.strip()

    style = None
    created = True
    if style_number:
        style = Style.objects.filter(tenant=tenant, style_number__iexact=style_number).first()
        created = style is None

    if style is None:
        style = Style.objects.create(
            tenant=tenant,
            style_number=style_number or _next_style_number(tenant),
            name=design.description.strip() or (style_number or "Imported Style"),
            buyer=buyer,
            description=design.note,
            created_by=user,
        )
    else:
        _update_existing_style(style, design)

    style_version = StyleVersion.objects.create(
        tenant=tenant,
        style=style,
        version_number=_next_version_number(style),
        revision_notes=(
            f"Imported from tech-pack {techpack.techpack_number}"
            if techpack is not None else "Imported from tech-pack"
        ),
        created_by=user,
    )

    bom = BOM.objects.create(
        tenant=tenant,
        style_version=style_version,
        name=f"Tech Pack BOM {style.style_number}".strip(),
        version=1,
        created_by=user,
    )

    style_items: list[StyleItem] = []
    bom_items: list[BOMItem] = []
    for index, row in enumerate(doc.bom_rows):
        style_items.append(
            StyleItem.objects.create(
                tenant=tenant, style=style, category=row.type,
                item_name=row.description_code, consumption=row.qty,
                sort_order=index, created_by=user,
            )
        )
        bom_items.append(
            BOMItem.objects.create(
                tenant=tenant, bom=bom, category=row.type,
                item_name=row.description_code, consumption=row.qty,
                location=row.location, colour=row.colour,
                width_size=row.width_size, match=row.match, created_by=user,
            )
        )

    design_sheet = None
    if techpack is not None:
        _complete_techpack(techpack, style)
        design_sheet, _ = DesignSheet.objects.get_or_create(
            tenant=tenant, tech_pack=techpack,
        )

    return TechPackImportResult(
        style=style, style_version=style_version, bom=bom,
        style_items=style_items, bom_items=bom_items, created=created,
        design_sheet=design_sheet,
    )


def _update_existing_style(style, design) -> None:
    if not style.name and design.description:
        style.name = design.description.strip()
    if design.note:
        style.description = design.note
    style.save(update_fields=["name", "description", "updated_at"])


def _next_version_number(style) -> int:
    last = (
        StyleVersion.objects.filter(tenant=style.tenant, style=style)
        .order_by("-version_number")
        .values_list("version_number", flat=True)
        .first()
    )
    return (last or 0) + 1


def _complete_techpack(techpack: StyleTechPack, style: Style) -> None:
    if techpack.source_pdf:
        style.tech_pack = techpack.source_pdf
        style.save(update_fields=["tech_pack", "updated_at"])
    if techpack.status == StyleTechPack.Status.EXTRACTED:
        techpack.mark_in_progress()
    if techpack.status == StyleTechPack.Status.IN_PROGRESS:
        techpack.complete(style=style)
    else:
        techpack.style = style
        techpack.save(update_fields=["style", "updated_at"])


def _next_style_number(tenant) -> str:
    last = Style.objects.filter(tenant=tenant).order_by("-created_at").first()
    if last and last.style_number.startswith("STY-"):
        try:
            num = int(last.style_number.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1001
    else:
        num = 1001
    return f"STY-{num:04d}"
