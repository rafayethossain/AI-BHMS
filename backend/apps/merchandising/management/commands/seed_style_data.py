"""
Seed rich demo data: Styles → Versions → BOMs, File Openings → POs.
All properly linked so every tab in StyleDetailPage is populated.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.merchandising.models import (
    BOM,
    BOMItem,
    FileOpening,
    PurchaseOrder,
    PurchaseOrderItem,
    Style,
    StyleItem,
    StyleTechPack,
    StyleVersion,
)
from apps.setup.models import UOM, Brand, Buyer, ColorCode, Factory, Season, Vendor
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Seed style-focused demo data with versions, BOMs, file openings, POs"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(is_active=True).first()
        if not tenant:
            self.stdout.write(self.style.ERROR("No active tenant. Run seed_demo_data first."))
            return

        self.stdout.write(f"Seeding style data for: {tenant.name}")

        buyers = list(Buyer.objects.filter(tenant=tenant))
        brands = list(Brand.objects.filter(tenant=tenant))
        factories = list(Factory.objects.filter(tenant=tenant))
        vendors = list(Vendor.objects.filter(tenant=tenant))
        colors = list(ColorCode.objects.filter(tenant=tenant))
        seasons = list(Season.objects.filter(tenant=tenant))
        uoms = list(UOM.objects.filter(tenant=tenant))

        if not all([buyers, factories, vendors, colors, uoms]):
            self.stdout.write(self.style.ERROR("Missing setup data. Run seed_demo_data first."))
            return

        # Clear existing merchandising data for fresh seed
        StyleTechPack.objects.filter(tenant=tenant).delete()
        BOMItem.objects.filter(tenant=tenant).delete()
        BOM.objects.filter(tenant=tenant).delete()
        StyleItem.objects.filter(tenant=tenant).delete()
        PurchaseOrderItem.objects.filter(tenant=tenant).delete()
        PurchaseOrder.objects.filter(tenant=tenant).delete()
        FileOpening.objects.filter(tenant=tenant).delete()
        StyleVersion.objects.filter(tenant=tenant).delete()
        Style.objects.filter(tenant=tenant).delete()
        self.stdout.write("  Cleared existing styles/items/versions/BOMs/FOs/POs")

        # Find next style number
        last = Style.objects.filter(tenant=tenant).order_by("-created_at").first()
        next_num = 1001
        if last and last.style_number.startswith("STY-"):
            try:
                next_num = int(last.style_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                pass

        # ── Styles ────────────────────────────────────────────────────
        styles_data = [
            ("Classic Crew Neck Tee",    buyers[0], "active",   "Cotton jersey crew neck tee with ribbed collar"),
            ("Performance Polo Shirt",   buyers[0], "approved", "100% pique polo with contrast tipping"),
            ("Urban Cargo Joggers",      buyers[1], "active",   "Tapered cargo joggers with zip pockets"),
            ("Relaxed Hoodie",           buyers[1], "draft",    "Oversized hoodie with kangaroo pocket"),
            ("Premium Denim Jacket",     buyers[2], "approved", "Washed denim jacket with brass buttons"),
            ("Sport Mesh Shorts",        buyers[2], "active",   "Breathable mesh shorts with inner brief"),
            ("Striped Long Sleeve Tee",  buyers[0], "draft",    "Horizontal striped long sleeve, raglan sleeve"),
            ("Tech Windbreaker",         buyers[1], "active",   "Lightweight ripstop windbreaker, water-resistant"),
        ]

        created_styles = []
        for name, buyer, status, desc in styles_data:
            s, _ = Style.objects.get_or_create(
                tenant=tenant, style_number=f"STY-{next_num:04d}",
                defaults={
                    "name": name,
                    "buyer": buyer,
                    "brand": random.choice(brands) if brands else None,
                    "season": random.choice(seasons) if seasons else None,
                    "status": status,
                    "description": desc,
                },
            )
            created_styles.append(s)
            next_num += 1
        self.stdout.write(f"  ✓ {len(created_styles)} styles")

        # ── Style Items (material templates per style) ──────────────
        style_item_catalog = [
            ("fabric", [
                ("Cotton Jersey 180gsm", "100% combed cotton, 180gsm", "1.2000", "5.00", "2.80"),
                ("Pique Mesh 220gsm", "100% polyester pique, 220gsm", "1.3000", "4.00", "3.20"),
                ("French Terry 280gsm", "80/20 cotton-polyester blend", "1.5000", "6.00", "4.50"),
                ("Ripstop Nylon 70D", "Water-resistant ripstop, PU coating", "1.1000", "3.00", "5.80"),
                ("Denim 12oz", "12oz selvedge denim, indigo wash", "1.4000", "7.00", "6.50"),
                ("Mesh Fabric 150gsm", "Breathable polyester mesh", "1.1000", "3.00", "2.10"),
                ("Viscose Rayon 150gsm", "Soft drape viscose, 150gsm", "1.1500", "4.50", "3.50"),
                ("Cotton Twill 240gsm", "Heavy-duty cotton twill weave", "1.3500", "5.50", "4.10"),
            ]),
            ("trim", [
                ("Woven Neck Label", "Main brand label, woven", "1.0000", "0.00", "0.08"),
                ("Size Label", "Size M woven label", "1.0000", "0.00", "0.03"),
                ("Care Label", "Woven care instructions", "1.0000", "0.00", "0.05"),
                ("Elastic Waistband", "2-inch braided elastic", "1.0000", "2.00", "0.45"),
                ("Drawstring", "Round cotton drawstring 80cm", "1.0000", "3.00", "0.15"),
                ("Metal Zipper #5", "YKK antique brass zipper", "1.0000", "0.00", "1.20"),
                ("Snap Buttons", "Antique brass snap 15mm", "4.0000", "2.00", "0.12"),
                ("Ribbed Cuff 1x1", "1x1 rib knit cuff, 5cm width", "2.0000", "1.50", "0.35"),
            ]),
            ("packaging", [
                ("Poly Bag 30x40cm", "Clear poly bag with warning text", "1.0000", "2.00", "0.03"),
                ("Tissue Paper", "Acid-free tissue paper insert", "1.0000", "0.00", "0.02"),
                ("Hang Tag", "Branded hang tag with barcode", "1.0000", "1.00", "0.08"),
                ("Carton Box", "Export carton 60x40x40cm", "0.0500", "1.00", "1.50"),
                ("Swing Tag", "Recycled card swing tag", "1.0000", "1.00", "0.06"),
            ]),
            ("accessories", [
                ("Embroidered Patch", "Woven patch 5x3cm", "1.0000", "2.00", "0.45"),
                ("Heat Transfer Logo", "PVC-free heat transfer label", "1.0000", "1.00", "0.30"),
                ("Eyelets", "Brass eyelet 4mm", "6.0000", "3.00", "0.04"),
            ]),
        ]

        total_items = 0
        for style in created_styles:
            # Each style gets 5-8 items drawn from different categories
            num_items = random.randint(5, 8)
            chosen_cats = random.sample(style_item_catalog, min(3, len(style_item_catalog)))
            item_pool = []
            for cat_name, items in chosen_cats:
                for item in items:
                    item_pool.append((cat_name, *item))

            random.shuffle(item_pool)
            for idx, (cat_name, item_name, desc, consumption, waste, price) in enumerate(item_pool[:num_items]):
                StyleItem.objects.create(
                    tenant=tenant, style=style,
                    category=cat_name,
                    item_name=item_name,
                    description=desc,
                    consumption=Decimal(consumption),
                    waste_percent=Decimal(waste),
                    unit_price=Decimal(price),
                    vendor=random.choice(vendors),
                    uom=uoms[0] if uoms else None,
                    sort_order=idx,
                )
                total_items += 1
        self.stdout.write(f"  ✓ {total_items} style items")

        # ── Style Versions (2-3 per style) ────────────────────────────
        created_versions = []
        for style in created_styles:
            for ver in range(1, random.randint(2, 4)):
                sv, _ = StyleVersion.objects.get_or_create(
                    tenant=tenant, style=style, version_number=ver,
                    defaults={
                        "status": "approved" if ver < style.current_version else "active",
                        "revision_notes": "Initial release" if ver == 1 else f"Rev {ver} - updated specs",
                    },
                )
                created_versions.append(sv)
        self.stdout.write(f"  ✓ {len(created_versions)} style versions")

        # ── BOMs (1 per version) ──────────────────────────────────────
        bom_categories = [
            ("fabric", [
                ("Cotton Jersey 180gsm", "100% combed cotton, 180gsm", "1.2000", "5.00", "2.80"),
                ("Pique Mesh 220gsm", "100% polyester pique, 220gsm", "1.3000", "4.00", "3.20"),
                ("French Terry 280gsm", "80/20 cotton-polyester blend", "1.5000", "6.00", "4.50"),
                ("Ripstop Nylon 70D", "Water-resistant ripstop, PU coating", "1.1000", "3.00", "5.80"),
                ("Denim 12oz", "12oz selvedge denim, indigo wash", "1.4000", "7.00", "6.50"),
                ("Mesh Fabric 150gsm", "Breathable polyester mesh", "1.1000", "3.00", "2.10"),
            ]),
            ("trim", [
                ("Woven Neck Label", "Main brand label, woven", "1.0000", "0.00", "0.08"),
                ("Size Label", "Size M woven label", "1.0000", "0.00", "0.03"),
                ("Care Label", "Woven care instructions", "1.0000", "0.00", "0.05"),
                ("Elastic Waistband", "2-inch braided elastic", "1.0000", "2.00", "0.45"),
                ("Drawstring", "Round cotton drawstring 80cm", "1.0000", "3.00", "0.15"),
                ("Metal Zipper #5", "YKK antique brass zipper", "1.0000", "0.00", "1.20"),
                ("Snap Buttons", "Antique brass snap 15mm", "4.0000", "2.00", "0.12"),
            ]),
            ("packaging", [
                ("Poly Bag 30x40cm", "Clear poly bag with warning text", "1.0000", "2.00", "0.03"),
                ("Tissue Paper", "Acid-free tissue paper insert", "1.0000", "0.00", "0.02"),
                ("Hang Tag", "Branded hang tag with barcode", "1.0000", "1.00", "0.08"),
                ("Carton Box", "Export carton 60x40x40cm", "0.0500", "1.00", "1.50"),
            ]),
        ]

        created_boms = []
        for sv in created_versions:
            bom, _ = BOM.objects.get_or_create(
                tenant=tenant, style_version=sv, version=1,
                defaults={"name": f"{sv.style.name} BOM v1", "status": "active"},
            )
            created_boms.append(bom)

            # Add 3-6 items per BOM
            num_items = random.randint(3, 6)
            cats_sample = random.sample(bom_categories, min(3, len(bom_categories)))
            for cat_name, items in cats_sample:
                chosen = random.sample(items, min(2, len(items)))
                for item_name, desc, consumption, waste, price in chosen:
                    if not BOMItem.objects.filter(tenant=tenant, bom=bom, item_name=item_name).exists():
                        BOMItem.objects.create(
                            tenant=tenant, bom=bom,
                            category=cat_name,
                            item_name=item_name,
                            description=desc,
                            consumption=Decimal(consumption),
                            waste_percent=Decimal(waste),
                            unit_price=Decimal(price),
                            vendor=random.choice(vendors),
                            uom=uoms[0] if uoms else None,
                        )
        self.stdout.write(f"  ✓ {len(created_boms)} BOMs with items")

        # ── File Openings (1-2 per style) ─────────────────────────────
        created_fos = []
        fo_counter = 1
        for style in created_styles:
            num_fo = random.randint(1, 2)
            for _ in range(num_fo):
                fo, _ = FileOpening.objects.get_or_create(
                    tenant=tenant,
                    file_number=f"FO-{timezone.now().year}-{fo_counter:03d}",
                    defaults={
                        "style": style,
                        "buyer": style.buyer,
                        "factory": random.choice(factories),
                        "file_date": timezone.now().date() - timedelta(days=random.randint(5, 60)),
                        "status": random.choice(["open", "confirmed", "confirmed"]),
                    },
                )
                created_fos.append(fo)
                fo_counter += 1
        self.stdout.write(f"  ✓ {len(created_fos)} file openings")

        # ── Purchase Orders (1-3 per file opening) ────────────────────
        from apps.setup.models import Country, Currency, DeliveryMode, PaymentTerms
        usd = Currency.objects.filter(tenant=tenant, code="USD").first()
        tt30 = PaymentTerms.objects.filter(tenant=tenant, code="TT30").first()
        sea = DeliveryMode.objects.filter(tenant=tenant, code="SEA").first()
        gbr = Country.objects.filter(tenant=tenant, code="GBR").first()
        usa = Country.objects.filter(tenant=tenant, code="USA").first()
        dest = random.choice([c for c in [gbr, usa] if c]) if (gbr or usa) else None

        statuses = ["draft", "draft", "open", "confirmed", "in_production", "ready", "shipped"]
        created_pos = []
        po_counter = 1
        for fo in created_fos:
            num_po = random.randint(1, 2)
            for _ in range(num_po):
                qty = random.randint(500, 5000)
                unit_price = Decimal(str(round(random.uniform(3.50, 18.00), 2)))
                total = unit_price * qty
                po, _ = PurchaseOrder.objects.get_or_create(
                    tenant=tenant,
                    po_number=f"PO-{timezone.now().year}-{po_counter:04d}",
                    defaults={
                        "file_opening": fo,
                        "buyer": fo.buyer,
                        "factory": fo.factory,
                        "po_date": timezone.now().date() - timedelta(days=random.randint(5, 45)),
                        "delivery_date": timezone.now().date() + timedelta(days=random.randint(30, 120)),
                        "destination_country": dest,
                        "destination_port": "Felixstowe" if dest and dest.code == "GBR" else "Los Angeles",
                        "quantity": qty,
                        "unit_price": unit_price,
                        "total_value": total,
                        "currency": usd,
                        "payment_terms": tt30,
                        "delivery_mode": sea,
                        "status": random.choice(statuses),
                    },
                )
                created_pos.append(po)

                # 2-4 line items per PO
                for _ in range(random.randint(2, 4)):
                    color = random.choice(colors)
                    size = random.choice(["S", "M", "L", "XL", "XXL"])
                    if not PurchaseOrderItem.objects.filter(
                        tenant=tenant, purchase_order=po, color=color, size=size
                    ).exists():
                        PurchaseOrderItem.objects.create(
                            tenant=tenant,
                            purchase_order=po,
                            color=color,
                            size=size,
                            quantity=random.randint(100, 1500),
                            unit_price=unit_price,
                        )
                po_counter += 1
        self.stdout.write(f"  ✓ {len(created_pos)} purchase orders with items")

        # ── Tech Packs (RQ-039: 1 draft + 1 completed for the tech-pack flow) ──
        sample_extraction = {
            "design_info": {
                "issue_date": "2022-03-22",
                "block": "59073T",
                "based_on": "59073T",
                "customer": "DOTTI",
                "style_number": "67741T",
                "size": "10",
                "designer": "Emmi.Huynh",
                "pattern_cutter": "HAI",
                "issuer": "Clone",
                "cloth_code": "SANDWASH LINEN",
                "length": "0",
                "sketch": "",
                "description": "565235 LB LIZZIE WIDE LEG PANT",
                "note": "BASED ON THE BLOCK OF 59073T",
            },
            "bom_rows": [
                {"type": "Cloth", "description_code": "SANDWASH LINEN XK-529",
                 "location": "MAIN", "supplier": "ALICE-", "colour": "BLACK",
                 "width_size": "132 CM", "qty": 1.67, "match": ""},
            ],
            "errors": [],
            "warnings": [],
        }
        draft_tp = StyleTechPack.objects.create(
            tenant=tenant,
            techpack_number=StyleTechPack.next_techpack_number(tenant),
            status=StyleTechPack.Status.DRAFT,
            extracted_data=sample_extraction,
            issue_date="2022-03-22",
            customer="DOTTI",
            style_number="67741T",
            designer="Emmi.Huynh",
            description="565235 LB LIZZIE WIDE LEG PANT",
        )
        completed_tp = StyleTechPack.objects.create(
            tenant=tenant,
            techpack_number=StyleTechPack.next_techpack_number(tenant),
            style=created_styles[0],
            status=StyleTechPack.Status.COMPLETED,
            extracted_data=sample_extraction,
            issue_date="2022-03-22",
            customer="DOTTI",
            style_number=created_styles[0].style_number,
            designer="Emmi.Huynh",
            description=created_styles[0].name,
        )
        self.stdout.write(
            f"  ✓ 2 tech packs ({draft_tp.techpack_number} draft, {completed_tp.techpack_number} completed)"
        )

        self.stdout.write(self.style.SUCCESS("\n✅ Style demo data seeded! Refresh the browser to see all tabs populated."))
