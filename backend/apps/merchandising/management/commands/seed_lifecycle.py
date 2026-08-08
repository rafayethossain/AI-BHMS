"""
seed_lifecycle.py — Comprehensive lifecycle sample data for BHMS.

Creates 6 complete lifecycle chains demonstrating the full merchandising→production→
logistics→commercial flow with proper data integrity.

Usage:
    python manage.py seed_lifecycle
    python manage.py seed_lifecycle --clear   # Clear all transactional data first
"""
import decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.tenants.models import Tenant
from apps.setup.models import (
    Buyer, Brand, Factory, Vendor, Country, Currency, UOM,
    Season, ProductCategory, ProductType, ProductDepartment,
    PaymentTerms, ColorCode, DeliveryMode,
)
from apps.merchandising.models import (
    Style, StyleVersion, StyleItem, FileOpening,
    PurchaseOrder, PurchaseOrderItem, POAmendment,
    BOM, BOMItem, Costing, TA, TAMilestone,
)
from apps.production.models import ProductionPlan, DailyProduction
from apps.quality.models import Inspection, InspectionItem
from apps.logistics.models import FreightForwarder, Shipment, ShippingDocument
from apps.commercial.models import Bank, ProformaInvoice, SalesContract, LC, LCAmendment


def d(val):
    return decimal.Decimal(str(val))


class Command(BaseCommand):
    help = "Seed comprehensive lifecycle sample data (6 chains from draft to delivered)"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Clear all transactional data first")

    def handle(self, *args, **options):
        self.tenant = Tenant.objects.filter(is_active=True).first()
        if not self.tenant:
            self.stderr.write(self.style.ERROR("No active tenant found. Run seed_dev.py first."))
            return

        if options["clear"]:
            self.clear_data()

        self.stdout.write(f"Seeding lifecycle data for: {self.tenant.name}")

        self.setup_refs = self.load_references()
        self.create_chains()

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created 6 lifecycle chains.\n"
            f"  Styles: 6 | FOs: 6 | POs: 6 | BOMs: 6 | Costings: 6 | T&As: 6\n"
            f"  ProductionPlans: 3 | DailyProductions: ~30 | Inspections: 3\n"
            f"  Shipments: 2 | Commercial docs: PI/SC/LC for shipped+ POs"
        ))

    def clear_data(self):
        self.stdout.write("Clearing transactional data...")
        for model in [
            ShippingDocument, Shipment,
            Inspection, InspectionItem,
            DailyProduction, ProductionPlan,
            LCAmendment, LC, ProformaInvoice, SalesContract, Bank,
            TAMilestone, TA, Costing, BOMItem, BOM,
            POAmendment, PurchaseOrderItem, PurchaseOrder,
            FileOpening, StyleItem, StyleVersion, Style,
        ]:
            model.objects.filter(tenant=self.tenant).delete()
        FreightForwarder.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("  Cleared."))

    def load_references(self):
        self.stdout.write("Loading reference data...")
        refs = {}
        refs["buyers"] = list(Buyer.objects.filter(tenant=self.tenant, status="active"))
        refs["brands"] = list(Brand.objects.filter(tenant=self.tenant, status="active"))
        refs["factories"] = list(Factory.objects.filter(tenant=self.tenant, status="active"))
        refs["vendors"] = list(Vendor.objects.filter(tenant=self.tenant, status="active"))
        refs["countries"] = list(Country.objects.filter(tenant=self.tenant, status="active"))
        refs["currencies"] = list(Currency.objects.filter(tenant=self.tenant, status="active"))
        refs["uoms"] = list(UOM.objects.filter(tenant=self.tenant, status="active"))
        refs["seasons"] = list(Season.objects.filter(tenant=self.tenant, status="active"))
        refs["categories"] = list(ProductCategory.objects.filter(tenant=self.tenant, status="active"))
        refs["types"] = list(ProductType.objects.filter(tenant=self.tenant, status="active"))
        refs["departments"] = list(ProductDepartment.objects.filter(tenant=self.tenant, status="active"))
        refs["payment_terms"] = list(PaymentTerms.objects.filter(tenant=self.tenant, status="active"))
        refs["colors"] = list(ColorCode.objects.filter(tenant=self.tenant, status="active"))
        refs["delivery_modes"] = list(DeliveryMode.objects.filter(tenant=self.tenant, status="active"))

        for key, items in refs.items():
            self.stdout.write(f"  {key}: {len(items)}")

        if len(refs["buyers"]) < 3 or len(refs["factories"]) < 3:
            self.stderr.write(self.style.ERROR("Need at least 3 buyers and 3 factories. Run seed_setup.py first."))
            return refs

        return refs

    def pick(self, key, idx=0):
        items = self.setup_refs[key]
        return items[idx % len(items)]

    def pick_brand(self, buyer, idx=0):
        brands = [b for b in self.setup_refs["brands"] if b.buyer_id == buyer.id]
        if brands:
            return brands[idx % len(brands)]
        return self.pick("brands", idx)

    def create_chains(self):
        chains = [
            {
                "name": "Basic Tee — Draft",
                "style_num": "STY-2026-LC01",
                "fo_num": "FO-2026-LC01",
                "po_num": "PO-2026-LC01",
                "po_status": "draft",
                "buyer_idx": 0, "factory_idx": 0,
                "style_desc": "Men's basic crew neck tee, 180gsm cotton jersey",
                "style_status": "active",
                "quantity": 3000, "unit_price": d("4.50"),
            },
            {
                "name": "Polo Shirt — Confirmed",
                "style_num": "STY-2026-LC02",
                "fo_num": "FO-2026-LC02",
                "po_num": "PO-2026-LC02",
                "po_status": "confirmed",
                "buyer_idx": 1, "factory_idx": 1,
                "style_desc": "Women's pique polo shirt, contrast tipping on collar",
                "style_status": "approved",
                "quantity": 5000, "unit_price": d("7.25"),
            },
            {
                "name": "Denim Jeans — In Production",
                "style_num": "STY-2026-LC03",
                "fo_num": "FO-2026-LC03",
                "po_num": "PO-2026-LC03",
                "po_status": "in_production",
                "buyer_idx": 2, "factory_idx": 2,
                "style_desc": "Classic straight-fit denim jeans, 12oz indigo",
                "style_status": "approved",
                "quantity": 8000, "unit_price": d("12.00"),
            },
            {
                "name": "Hoodie — Quality Check",
                "style_num": "STY-2026-LC04",
                "fo_num": "FO-2026-LC04",
                "po_num": "PO-2026-LC04",
                "po_status": "quality_check",
                "buyer_idx": 3, "factory_idx": 0,
                "style_desc": "Unisex pullover hoodie, 320gsm French terry",
                "style_status": "approved",
                "quantity": 4000, "unit_price": d("14.50"),
            },
            {
                "name": "Active Shorts — Shipped",
                "style_num": "STY-2026-LC05",
                "fo_num": "FO-2026-LC05",
                "po_num": "PO-2026-LC05",
                "po_status": "shipped",
                "buyer_idx": 4, "factory_idx": 3,
                "style_desc": "Men's woven running shorts with mesh lining",
                "style_status": "approved",
                "quantity": 6000, "unit_price": d("6.75"),
            },
            {
                "name": "Summer Dress — Delivered",
                "style_num": "STY-2026-LC06",
                "fo_num": "FO-2026-LC06",
                "po_num": "PO-2026-LC06",
                "po_status": "delivered",
                "buyer_idx": 5, "factory_idx": 1,
                "style_desc": "Women's A-line summer dress, viscose rayon print",
                "style_status": "approved",
                "quantity": 3500, "unit_price": d("9.80"),
            },
        ]

        today = date.today()

        for i, c in enumerate(chains):
            self.stdout.write(f"\n--- Chain {i+1}: {c['name']} ---")
            buyer = self.pick("buyers", c["buyer_idx"])
            factory = self.pick("factories", c["factory_idx"])
            brand = self.pick_brand(buyer, i)
            vendor = self.pick("vendors", i)
            country = self.pick("countries", i % len(self.setup_refs["countries"]))
            currency = self.pick("currencies", 0)  # USD
            payment_terms = self.pick("payment_terms", i % len(self.setup_refs["payment_terms"]))
            delivery_mode = self.pick("delivery_modes", i % len(self.setup_refs["delivery_modes"]))
            season = self.pick("seasons", i % len(self.setup_refs["seasons"]))
            category = self.pick("categories", i % len(self.setup_refs["categories"]))
            product_type = self.pick("types", i % len(self.setup_refs["types"]))
            product_dept = self.pick("departments", i % len(self.setup_refs["departments"]))
            uom_pcs = next((u for u in self.setup_refs["uoms"] if u.code == "PCS"), self.pick("uoms", 0))
            uom_kgs = next((u for u in self.setup_refs["uoms"] if u.code == "KGS"), self.pick("uoms", 1))

            total_value = c["quantity"] * c["unit_price"]

            # === STYLE ===
            style = Style.objects.create(
                tenant=self.tenant, style_number=c["style_num"], name=c["name"],
                description=c["style_desc"], buyer=buyer, brand=brand,
                category=category, product_type=product_type,
                department=product_dept, season=season,
                current_version=1, status=c["style_status"],
            )

            # === STYLE VERSION ===
            sv = StyleVersion.objects.create(
                tenant=self.tenant, style=style, version_number=1,
                revision_notes="Initial version", status="active",
            )

            # === STYLE ITEMS ===
            items_data = [
                ("fabric", "Main Fabric", "Cotton jersey 180gsm", d("0.45"), d("5"), d("3.50"), vendor),
                ("fabric", "Rib Fabric", "Cotton lycra rib 1x1", d("0.12"), d("5"), d("4.20"), vendor),
                ("trim", "Neck Label", "Woven label 30mm", d("1.0"), d("0"), d("0.08"), vendor),
                ("trim", "Care Label", "Printed satin label", d("1.0"), d("0"), d("0.05"), vendor),
                ("trim", "Hang Tag", "Cardboard hang tag", d("1.0"), d("0"), d("0.12"), vendor),
                ("packaging", "Poly Bag", "LDPE poly bag 30x40cm", d("1.0"), d("2"), d("0.03"), vendor),
                ("accessories", "Shoulder Tape", "Cotton twill tape 25mm", d("0.30"), d("3"), d("0.15"), vendor),
            ]
            for cat, name, desc, cons, waste, uprice, v in items_data:
                StyleItem.objects.create(
                    tenant=self.tenant, style=style, category=cat,
                    item_name=name, description=desc, uom=uom_pcs,
                    consumption=cons, waste_percent=waste, unit_price=uprice, vendor=v,
                )

            # === FILE OPENING ===
            fo = FileOpening.objects.create(
                tenant=self.tenant, file_number=c["fo_num"], style=style,
                style_version=sv, buyer=buyer, brand=brand, factory=factory,
                file_date=today - timedelta(days=60),
                status="confirmed",
            )

            # === PURCHASE ORDER ===
            po = PurchaseOrder.objects.create(
                tenant=self.tenant, po_number=c["po_num"],
                file_opening=fo, buyer=buyer, brand=brand, factory=factory,
                po_date=today - timedelta(days=45),
                delivery_date=today + timedelta(days=60),
                destination_country=country, destination_port="Chattogram",
                quantity=c["quantity"], unit_price=c["unit_price"],
                total_value=total_value, currency=currency,
                payment_terms=payment_terms, delivery_mode=delivery_mode,
                status=c["po_status"], remarks=f"Sample PO for {c['name']}",
            )

            # === PO ITEMS ===
            colors_for_po = self.setup_refs["colors"][:3]
            sizes = ["S", "M", "L", "XL"]
            qty_per_size = c["quantity"] // (len(colors_for_po) * len(sizes))
            for color in colors_for_po:
                for size in sizes:
                    PurchaseOrderItem.objects.create(
                        tenant=self.tenant, purchase_order=po,
                        color=color, size=size,
                        quantity=qty_per_size, unit_price=c["unit_price"],
                    )

            # === BOM ===
            bom = BOM.objects.create(
                tenant=self.tenant, style_version=sv,
                name=f"BOM v1 for {c['name']}", version=1, status="active",
            )
            bom_items_data = [
                ("fabric", "Main Fabric", "Cotton jersey 180gsm", d("1.2"), d("5"), d("3.50"), vendor),
                ("fabric", "Rib Fabric", "Cotton lycra rib 1x1", d("0.15"), d("5"), d("4.20"), vendor),
                ("trim", "Neck Label", "Woven label 30mm", d("1.0"), d("0"), d("0.08"), vendor),
                ("trim", "Care Label", "Printed satin label", d("1.0"), d("0"), d("0.05"), vendor),
                ("trim", "Size Label", "Printed size label", d("1.0"), d("0"), d("0.04"), vendor),
                ("trim", "Swing Tag", "Cardboard swing tag", d("1.0"), d("0"), d("0.15"), vendor),
                ("packaging", "Poly Bag", "LDPE poly bag 30x40cm", d("1.0"), d("2"), d("0.03"), vendor),
                ("packaging", "Carton", "5-ply carton 60x40x40cm", d("0.05"), d("0"), d("0.85"), vendor),
                ("accessories", "Shoulder Tape", "Cotton twill tape 25mm", d("0.30"), d("3"), d("0.15"), vendor),
            ]
            for cat, name, desc, cons, waste, uprice, v in bom_items_data:
                BOMItem.objects.create(
                    tenant=self.tenant, bom=bom, category=cat,
                    item_name=name, description=desc, uom=uom_pcs,
                    consumption=cons, waste_percent=waste, unit_price=uprice, vendor=v,
                )

            # === COSTING ===
            fabric_cost = d("4.20")
            trim_cost = d("0.85")
            cm_cost = d("1.50")
            overhead_cost = d("0.50")
            total_cost = fabric_cost + trim_cost + cm_cost + overhead_cost
            margin = c["unit_price"] - total_cost
            margin_pct = (margin / c["unit_price"] * d("100")).quantize(d("0.1"))

            costing_status = "approved" if c["po_status"] in ("confirmed", "in_production", "quality_check", "shipped", "delivered") else "draft"
            Costing.objects.create(
                tenant=self.tenant, purchase_order=po, bom=bom, version=1,
                fabric_cost=fabric_cost, trim_cost=trim_cost,
                cm_cost=cm_cost, overhead_cost=overhead_cost,
                total_cost=total_cost, target_price=c["unit_price"],
                margin=margin,
                status=costing_status,
            )

            # === T&A (for confirmed+ POs) ===
            if c["po_status"] != "draft":
                ta = TA.objects.create(
                    tenant=self.tenant, purchase_order=po,
                    delivery_date=today + timedelta(days=60),
                    status="active",
                )
                milestones = [
                    ("Fabric Booking", -40, "completed"),
                    ("Fabric Approval", -35, "completed"),
                    ("Trim Development", -30, "completed"),
                    ("Sample Submission", -25, "completed"),
                    ("Lab Dip Approval", -20, "completed"),
                    ("PP Meeting", -15, "completed" if c["po_status"] != "confirmed" else "in_progress"),
                    ("Bulk Fabric In-House", -10, "completed" if c["po_status"] not in ("confirmed",) else "pending"),
                    ("Bulk Production Start", -5, "completed" if c["po_status"] in ("in_production", "quality_check", "shipped", "delivered") else "pending"),
                    ("Inline Inspection", 0, "in_progress" if c["po_status"] in ("in_production",) else ("completed" if c["po_status"] in ("quality_check", "shipped", "delivered") else "pending")),
                    ("End-Line QC", 5, "completed" if c["po_status"] in ("quality_check", "shipped", "delivered") else "pending"),
                    ("Final Inspection", 10, "completed" if c["po_status"] in ("shipped", "delivered") else "pending"),
                    ("Packing", 15, "completed" if c["po_status"] in ("shipped", "delivered") else "pending"),
                    ("Shipment", 20, "completed" if c["po_status"] in ("shipped", "delivered") else "pending"),
                    ("Delivery", 25, "completed" if c["po_status"] == "delivered" else "pending"),
                ]
                for idx, (name, day_offset, status) in enumerate(milestones):
                    planned = today + timedelta(days=day_offset)
                    actual = planned if status == "completed" else None
                    TAMilestone.objects.create(
                        tenant=self.tenant, ta=ta, name=name,
                        planned_date=planned, actual_date=actual,
                        status=status, is_critical=(name in ("Bulk Production Start", "Final Inspection", "Shipment")),
                        sort_order=idx,
                    )

            # === PRODUCTION (for in_production+ POs) ===
            if c["po_status"] in ("in_production", "quality_check", "shipped", "delivered"):
                plan = ProductionPlan.objects.create(
                    tenant=self.tenant, purchase_order=po, factory=factory,
                    plan_date=today - timedelta(days=5),
                    start_date=today - timedelta(days=5),
                    end_date=today + timedelta(days=15),
                    quantity=c["quantity"],
                    status="in_progress" if c["po_status"] in ("in_production", "quality_check") else "completed",
                )
                days_to_report = 10 if c["po_status"] in ("in_production",) else 15
                for day in range(days_to_report):
                    prod_date = today - timedelta(days=5) + timedelta(days=day)
                    target = c["quantity"] // 15
                    actual = int(target * decimal.Decimal("0.92"))
                    passed = int(actual * decimal.Decimal("0.97"))
                    rejected = actual - passed
                    DailyProduction.objects.create(
                        tenant=self.tenant, factory=factory,
                        purchase_order=po, production_date=prod_date,
                        line_number=1, target_quantity=target,
                        actual_quantity=actual, passed_quantity=passed,
                        rejected_quantity=rejected,
                        efficiency=d("85.5"), dhu=d("2.8"),
                        manpower=45, working_hours=d("8.0"),
                        status="approved" if day < days_to_report - 2 else "active",
                    )

            # === INSPECTIONS (for quality_check+ POs) ===
            if c["po_status"] in ("quality_check", "shipped", "delivered"):
                for insp_type in ["inline", "final"]:
                    insp = Inspection.objects.create(
                        tenant=self.tenant, purchase_order=po, factory=factory,
                        inspection_type=insp_type,
                        inspection_date=today - timedelta(days=3) if insp_type == "inline" else today - timedelta(days=1),
                        aql_level=d("2.5"), sample_size=200,
                        passed_quantity=195 if insp_type == "inline" else 198,
                        rejected_quantity=5 if insp_type == "inline" else 2,
                        status="passed",
                    )
                    defects = [
                        ("Open seam", 2, "major"), ("Skip stitch", 1, "minor"),
                        ("Stain", 1, "major"), ("Uncut thread", 1, "minor"),
                    ] if insp_type == "inline" else [
                        ("Label misplace", 1, "major"), ("Slight shade variation", 1, "minor"),
                    ]
                    for dtype, dcount, severity in defects:
                        InspectionItem.objects.create(
                            tenant=self.tenant, inspection=insp,
                            defect_type=dtype, defect_count=dcount,
                            severity=severity,
                            description=f"{dtype} found during {insp_type} inspection",
                        )

            # === SHIPMENTS (for shipped+ POs) ===
            if c["po_status"] in ("shipped", "delivered"):
                ff = self.get_or_create_freight_forwarder()
                shipment = Shipment.objects.create(
                    tenant=self.tenant,
                    shipment_number=f"SH-2026-LC0{i+1}",
                    purchase_order=po, factory=factory,
                    freight_forwarder=ff, mode="sea",
                    status="delivered" if c["po_status"] == "delivered" else "on_water",
                    booking_date=today - timedelta(days=8),
                    etd=today - timedelta(days=3),
                    eta=today + timedelta(days=25),
                    atd=today - timedelta(days=2) if c["po_status"] == "delivered" else None,
                    ata=today - timedelta(days=1) if c["po_status"] == "delivered" else None,
                    port_of_loading="Chattogram, Bangladesh",
                    port_of_discharge="Rotterdam, Netherlands",
                    vessel_name="MSC Diana", voyage_number="VY-2026-042",
                    container_number=f"MSKU{7000000 + i}", seal_number=f"SL{1000 + i}",
                    container_size="40HQ",
                    quantity=d(c["quantity"]), weight_kg=d(c["quantity"]) * d("0.18"),
                    cbm=d("55.0"),
                    remarks=f"Shipment for {c['name']}",
                )
                doc_types = ["pl", "bl", "co", "inspection"]
                for dt in doc_types:
                    ShippingDocument.objects.create(
                        tenant=self.tenant, shipment=shipment,
                        document_type=dt,
                        document_number=f"DOC-{dt.upper()}-LC0{i+1}",
                        document_date=today - timedelta(days=3),
                        notes=f"{dt.upper()} document for {c['name']}",
                    )

            # === COMMERCIAL DOCS (for shipped+ POs) ===
            if c["po_status"] in ("shipped", "delivered"):
                bank = self.get_or_create_bank()

                pi = ProformaInvoice.objects.create(
                    tenant=self.tenant,
                    pi_number=f"PI-2026-LC0{i+1}",
                    purchase_order=po, buyer=buyer, amount=total_value,
                    currency="USD", status="accepted",
                    validity_date=today + timedelta(days=90),
                )

                sc = SalesContract.objects.create(
                    tenant=self.tenant,
                    contract_number=f"SC-2026-LC0{i+1}",
                    purchase_order=po, buyer=buyer,
                    total_amount=total_value, currency="USD",
                    payment_terms=payment_terms,
                    delivery_terms=f"FOB Chattogram",
                    status="active",
                )

                lc = LC.objects.create(
                    tenant=self.tenant,
                    lc_number=f"LC-2026-LC0{i+1}",
                    lc_type="master", buyer=buyer, purchase_order=po,
                    bank=bank, amount=total_value, currency=currency,
                    issued_date=today - timedelta(days=20),
                    expiry_date=today + timedelta(days=90),
                    status="utilized" if c["po_status"] == "delivered" else "accepted",
                    utilized_amount=total_value if c["po_status"] == "delivered" else d("0"),
                )

                if c["po_status"] == "delivered":
                    LCAmendment.objects.create(
                        tenant=self.tenant, lc=lc, amendment_number=1,
                        amount_change=d("0"), expiry_date_change=today + timedelta(days=120),
                        reason="Extension of expiry date",
                        status="approved",
                    )

            self.stdout.write(f"  Chain {i+1} complete: {style.style_number} → {po.po_number} ({c['po_status']})")

    def get_or_create_freight_forwarder(self):
        ff, _ = FreightForwarder.objects.get_or_create(
            tenant=self.tenant, code="MSK",
            defaults={
                "name": "Maersk Line",
                "contact_person": "John Smith",
                "email": "booking@maersk.com",
                "phone": "+45 33 63 33 63",
                "address": "Esplanaden 50, 1098 Copenhagen K, Denmark",
                "country": "Denmark",
            },
        )
        return ff

    def get_or_create_bank(self):
        bank, _ = Bank.objects.get_or_create(
            tenant=self.tenant, code="HSBC",
            defaults={
                "name": "HSBC Bank plc",
                "swift_code": "HSBCGB2L",
                "address": "8 Canada Square, London E14 5HQ, UK",
                "contact_person": "Sarah Johnson",
                "phone": "+44 20 7991 8888",
                "email": "trade@hsbc.com",
                "status": "active",
            },
        )
        return bank
