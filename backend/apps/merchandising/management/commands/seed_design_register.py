"""
Seed the unified Design register (merged Style + Design Sheet list).

Creates styles, their style tech-packs and design sheets with the design
register columns populated (style type, contains, risk date, pattern request
date, based on, designer, annotations, notes, sketch), plus file openings and
purchase orders so the live / completed order counts are non-zero.

Idempotent: safely re-run any time; existing rows are updated in place, rows
are keyed by style number / tech-pack number / PO number.
"""
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.merchandising.models import (
    DesignSheet,
    FileOpening,
    PurchaseOrder,
    Style,
    StyleTechPack,
)
from apps.setup.models import Buyer, Factory, ProductCategory, ProductDepartment, ProductType
from apps.tenants.models import Tenant


REGISTER = [
    {
        "style_number": "REG-1001",
        "name": "Relaxed Jogger",
        "department": "Apparel",
        "status": "new",
        "based_on": "59073T",
        "designer": "Emmi.Huynh",
        "style_type": "Jogger",
        "contains": "Div 3 / 3446",
        "risk_date": date(2026, 9, 1),
        "pattern_request_date": date(2026, 8, 15),
        "sketch": "SK-REG-1001",
        "note": "Front pocket changed to zip closure per buyer comment.",
        "annotations": [
            {"id": "a1", "x": 12, "y": 34, "text": "WAIST SEAM"},
            {"id": "a2", "x": 78, "y": 55, "text": "CUFF PINCH"},
        ],
        "sheet_status": "new",
        "po_statuses": ["confirmed", "in_production", "shipped", "delivered", "delivered"],
    },
    {
        "style_number": "REG-1002",
        "name": "Classic Crew Neck Tee",
        "department": "Apparel",
        "status": "closed",
        "based_on": "59072T",
        "designer": "Mia.Tran",
        "style_type": "Tee",
        "contains": "Div 2 / 2108",
        "risk_date": date(2026, 8, 20),
        "pattern_request_date": date(2026, 7, 10),
        "sketch": "SK-REG-1002",
        "note": "Ribbed collar spec updated.",
        "annotations": [{"id": "b1", "x": 40, "y": 60, "text": "NECK RIB"}],
        "sheet_status": "closed",
        "po_statuses": ["delivered", "delivered", "draft"],
    },
    {
        "style_number": "REG-1003",
        "name": "Performance Polo Shirt",
        "department": "Knitwear",
        "status": "archived",
        "based_on": "59074T",
        "designer": "Tom.Farmer",
        "style_type": "Polo",
        "contains": "Div 3 / 3401",
        "risk_date": date(2026, 7, 30),
        "pattern_request_date": date(2026, 6, 12),
        "sketch": "SK-REG-1003",
        "note": "Superseded by REG-1005.",
        "annotations": [],
        "sheet_status": "archived",
        "po_statuses": ["shipped", "delivered"],
    },
    {
        "style_number": "REG-1004",
        "name": "Tech Windbreaker",
        "department": "Outerwear",
        "status": "rejected",
        "based_on": "59075T",
        "designer": "Ruth.Diaz",
        "style_type": "Jacket",
        "contains": "Div 4 / 4100",
        "risk_date": date(2026, 8, 10),
        "pattern_request_date": date(2026, 7, 2),
        "sketch": "SK-REG-1004",
        "note": "DWR finish rejected by buying team.",
        "annotations": [],
        "sheet_status": "rejected",
        "po_statuses": [],
    },
    {
        "style_number": "REG-1005",
        "name": "Striped Long Sleeve Tee",
        "department": "Knitwear",
        "status": "new",
        "based_on": "",
        "designer": "Emmi.Huynh",
        "style_type": "Tee",
        "contains": "Div 2 / 2111",
        "risk_date": None,
        "pattern_request_date": date(2026, 9, 5),
        "sketch": "SK-REG-1005",
        "note": "Awaiting stripe colourways.",
        "annotations": [{"id": "c1", "x": 20, "y": 25, "text": "STRIPE MOCK"}],
        "sheet_status": "new",
        "po_statuses": ["open", "open", "delivered"],
    },
]


class Command(BaseCommand):
    help = "Seed the unified Design register (styles + design sheets + order counts)"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(is_active=True).first()
        if not tenant:
            self.stdout.write(self.style.ERROR("No active tenant. Run seed_demo_data first."))
            return

        self.stdout.write(f"Seeding design register for: {tenant.name}")

        dept_map = {}
        cat_map = {}
        for code, name in [("APP", "Apparel"), ("KTN", "Knitwear"), ("OUT", "Outerwear")]:
            dept, _ = ProductDepartment.objects.get_or_create(
                tenant=tenant, code=code, defaults={"name": name},
            )
            dept_map[name] = dept
            cat, _ = ProductCategory.objects.get_or_create(
                tenant=tenant, code=code, defaults={"name": name},
            )
            cat_map[name] = cat

        type_map = {}
        for name in sorted({entry["style_type"] for entry in REGISTER}):
            type_, _ = ProductType.objects.get_or_create(
                tenant=tenant, code=name.upper()[:20], defaults={"name": name},
            )
            type_map[name] = type_
        # Link each product type to its category via the first register entry that
        # uses it, matching the global standard hierarchy Department > Category > Type.
        for entry in REGISTER:
            cat = cat_map[entry["department"]]
            pt = type_map[entry["style_type"]]
            if pt.category_id != cat.id:
                pt.category = cat
                pt.save(update_fields=["category"])

        buyer = Buyer.objects.filter(tenant=tenant).first()
        if not buyer:
            buyer = Buyer.objects.create(tenant=tenant, name="Register Demo Buyer", code="RDB1")
        factory = Factory.objects.filter(tenant=tenant).first()
        if not factory:
            factory = Factory.objects.create(tenant=tenant, name="Register Demo Factory", code="RDF1")

        for entry in REGISTER:
            style, _ = Style.objects.get_or_create(
                tenant=tenant, style_number=entry["style_number"],
                defaults={
                    "name": entry["name"],
                    "buyer": buyer,
                    "department": dept_map[entry["department"]],
                    "status": "active",
                    "description": entry["note"],
                },
            )
            style.name = entry["name"]
            style.department = dept_map[entry["department"]]
            style.save(update_fields=["name", "department"])

            tp_number = f"TP-{entry['style_number'].replace('REG-', 'REG')}"
            techpack, _ = StyleTechPack.objects.get_or_create(
                tenant=tenant, techpack_number=tp_number,
                defaults={"style": style},
            )
            techpack.style = style
            techpack.based_on = entry["based_on"]
            techpack.designer = entry["designer"]
            techpack.product_type = type_map[entry["style_type"]]
            techpack.contains = entry["contains"]
            techpack.risk_date = entry["risk_date"]
            techpack.pattern_request_date = entry["pattern_request_date"]
            techpack.sketch = entry["sketch"]
            techpack.note = entry["note"]
            techpack.save()

            sheet, _ = DesignSheet.objects.get_or_create(
                tenant=tenant, tech_pack=techpack,
            )
            sheet.status = entry["sheet_status"]
            sheet.sketch_annotations = entry["annotations"]
            sheet.save(update_fields=["status", "sketch_annotations"])

            for i, po_status in enumerate(entry["po_statuses"]):
                po_number = f"REG-PO-{entry['style_number'].split('-')[1]}-{i + 1:02d}"
                fo_number = f"REG-FO-{entry['style_number'].split('-')[1]}-{i + 1:02d}"
                fo, _ = FileOpening.objects.get_or_create(
                    tenant=tenant, file_number=fo_number,
                    defaults={
                        "style": style, "buyer": buyer, "factory": factory,
                        "file_date": date(2026, 8, 1),
                    },
                )
                fo.style = style
                fo.buyer = buyer
                fo.factory = factory
                fo.save(update_fields=["style", "buyer", "factory"])
                PurchaseOrder.objects.get_or_create(
                    tenant=tenant, po_number=po_number,
                    defaults={
                        "file_opening": fo, "buyer": buyer, "factory": factory,
                        "po_date": date(2026, 8, 1),
                        "delivery_date": date(2026, 12, 1),
                        "quantity": 100,
                        "unit_price": "12.50",
                        "total_value": "1250.00",
                        "status": po_status,
                    },
                )

            self.stdout.write(
                f"  - {entry['style_number']} {entry['name']} "
                f"(sheet {entry['sheet_status']}, {len(entry['po_statuses'])} POs)"
            )

        self.stdout.write(self.style.SUCCESS("Design register seed complete."))