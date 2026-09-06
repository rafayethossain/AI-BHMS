"""
Seed script for Merchandising, Commercial, Production, Quality, Logistics data.
Bangladesh RMG industry realistic test data.
"""
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.commercial.models import LC, Bank, LCAmendment, ForwardOrder
from apps.logistics.models import CostReconciliation, ExportRecap, FreightForwarder, ImportRecap, Shipment, SupplierPayment
from apps.merchandising.models import (
    BOM,
    TA,
    BOMItem,
    Costing,
    CostingLine,
    FileOpening,
    Hit,
    PurchaseOrder,
    PurchaseOrderItem,
    Style,
    StyleVersion,
    TAMilestone,
)
from apps.production.models import DailyProduction, ProductionPlan
from apps.quality.models import Inspection, InspectionItem
from apps.setup.models import (
    UOM,
    Brand,
    Buyer,
    ColorCode,
    Country,
    Currency,
    DeliveryMode,
    Factory,
    PaymentTerms,
    ProductCategory,
    ProductDepartment,
    ProductType,
    Season,
    Vendor,
)
from apps.tenants.models import Tenant
from apps.users.models import User

tenant = Tenant.objects.get(slug="default")
admin_user = User.objects.filter(tenant=tenant, is_superuser=True).first()

# Look up FK references
buyers = {b.code: b for b in Buyer.objects.filter(tenant=tenant)}
brands = {(b.buyer_id, b.code): b for b in Brand.objects.filter(tenant=tenant)}
factories = {f.code: f for f in Factory.objects.filter(tenant=tenant)}
seasons = {s.code: s for s in Season.objects.filter(tenant=tenant)}
categories = {c.code: c for c in ProductCategory.objects.filter(tenant=tenant)}
types = {t.code: t for t in ProductType.objects.filter(tenant=tenant)}
departments = {d.code: d for d in ProductDepartment.objects.filter(tenant=tenant)}
currencies = {c.code: c for c in Currency.objects.filter(tenant=tenant)}
uoms = {u.code: u for u in UOM.objects.filter(tenant=tenant)}
delivery_modes = {d.code: d for d in DeliveryMode.objects.filter(tenant=tenant)}
payment_terms = {p.code: p for p in PaymentTerms.objects.filter(tenant=tenant)}
countries = {c.code: c for c in Country.objects.filter(tenant=tenant)}
colors = {c.code: c for c in ColorCode.objects.filter(tenant=tenant)}
vendors = {v.code: v for v in Vendor.objects.filter(tenant=tenant)}

usd = currencies.get("USD")
eur = currencies.get("EUR")
gbp = currencies.get("GBP")
ctg = countries.get("BGD")

# ──────────────────────────────────────────────
# 1. STYLES
# ──────────────────────────────────────────────
styles_data = [
    {"sn": "STY-1001", "name": "Classic Crew Neck Tee", "buyer": "HM", "brand": "HM-BM", "cat": "Tops", "type": "T-Sh", "dept": "LAD", "season": "SS26", "status": "approved"},
    {"sn": "STY-1002", "name": "Slim Fit Oxford Shirt", "buyer": "HM", "brand": "HM-BM", "cat": "Tops", "type": "Shi", "dept": "MEN", "season": "SS26", "status": "approved"},
    {"sn": "STY-1003", "name": "Chino Pant Regular Fit", "buyer": "IND", "brand": "ZRA", "cat": "Bot", "type": "Chi", "dept": "MEN", "season": "FW25", "status": "active"},
    {"sn": "STY-1004", "name": "A-Line Summer Dress", "buyer": "GAP", "brand": "GAP", "cat": "Dre", "type": "Cas", "dept": "LAD", "season": "SS26", "status": "active"},
    {"sn": "STY-1005", "name": "Performance Polo Shirt", "buyer": "NIKE", "brand": "NK-A", "cat": "Tops", "type": "Pol", "dept": "ACT", "season": "SS26", "status": "active"},
    {"sn": "STY-1006", "name": "Relaxed Fit Hoodie", "buyer": "WAL", "brand": "WTM", "cat": "Tops", "type": "Hoo", "dept": "LAD", "season": "FW26", "status": "draft"},
    {"sn": "STY-1007", "name": "Skinny Denim Jeans", "buyer": "IND", "brand": "ZRA", "cat": "Bot", "type": "Jea", "dept": "LAD", "season": "FW26", "status": "active"},
    {"sn": "STY-1008", "name": "Cargo Work Pant", "buyer": "C&A", "brand": "C&A", "cat": "Bot", "type": "Pan", "dept": "MEN", "season": "SS26", "status": "approved"},
    {"sn": "STY-1009", "name": "Kids Colorful Tank Top", "buyer": "HM", "brand": "HM-DV", "cat": "Kid", "type": "Kid", "dept": "KID", "season": "SS26", "status": "active"},
    {"sn": "STY-1010", "name": "Yoga Leggings High Waist", "buyer": "DEC", "brand": "DEC", "cat": "Act", "type": "Yog", "dept": "ACT", "season": "SS26", "status": "active"},
    {"sn": "STY-1011", "name": "Formal Blazer Slim Fit", "buyer": "PRIM", "brand": "PRIM", "cat": "Out", "type": "Bla", "dept": "MEN", "season": "FW26", "status": "draft"},
    {"sn": "STY-1012", "name": "Casual Knit Cardigan", "buyer": "TGT", "brand": "UNU", "cat": "Tops", "type": "Car", "dept": "LAD", "season": "FW26", "status": "draft"},
    {"sn": "STY-1013", "name": "Track Jacket Zip-Up", "buyer": "ADD", "brand": "AD-C", "cat": "Out", "type": "Jac", "dept": "ACT", "season": "SS26", "status": "active"},
    {"sn": "STY-1014", "name": "Cotton Briefs 3-Pack", "buyer": "WAL", "brand": "WTM", "cat": "Und", "type": "Bre", "dept": "INT", "season": "SS26", "status": "approved"},
    {"sn": "STY-1015", "name": "Maxi Flowy Dress", "buyer": "C&A", "brand": "C&A", "cat": "Dre", "type": "Max", "dept": "LAD", "season": "SS27", "status": "draft"},
]

style_objects = []
for s in styles_data:
    buyer = buyers.get(s["buyer"])
    brand = brands.get((buyer.id, s["brand"])) if buyer else None
    obj, _ = Style.objects.get_or_create(
        tenant=tenant, style_number=s["sn"],
        defaults={
            "name": s["name"], "buyer": buyer, "brand": brand,
            "category": categories.get(s["cat"]),
            "product_type": types.get(s["type"]),
            "department": departments.get(s["dept"]),
            "season": seasons.get(s["season"]),
            "status": s["status"],
        }
    )
    style_objects.append(obj)
print(f"[OK] Styles: {len(style_objects)}")

# ──────────────────────────────────────────────
# 2. STYLE VERSIONS
# ──────────────────────────────────────────────
for style in style_objects:
    StyleVersion.objects.get_or_create(
        tenant=tenant, style=style, version_number=1,
        defaults={"revision_notes": "Initial version", "status": "approved"}
    )
    if style.status in ("active", "draft"):
        StyleVersion.objects.get_or_create(
            tenant=tenant, style=style, version_number=2,
            defaults={"revision_notes": "Updated colorways", "status": "active"}
        )
print("[OK] Style Versions")

# ──────────────────────────────────────────────
# 3. FILE OPENINGS
# ──────────────────────────────────────────────
file_objects = []
factory_list = list(factories.values())
fo_statuses = ["open", "confirmed", "open", "confirmed", "closed"]

for i, style in enumerate(style_objects):
    sv = style.versions.first()
    if not sv:
        continue
    factory = factory_list[i % len(factory_list)]
    fo, _ = FileOpening.objects.get_or_create(
        tenant=tenant, file_number=f"FO-{style.style_number[-4:]}",
        defaults={
            "style": style, "style_version": sv,
            "buyer": style.buyer, "brand": style.brand,
            "factory": factory,
            "file_date": date(2026, 1, 15) + timedelta(days=i * 7),
            "status": fo_statuses[i % len(fo_statuses)],
        }
    )
    file_objects.append(fo)
print(f"[OK] File Openings: {len(file_objects)}")

# ──────────────────────────────────────────────
# 4. PURCHASE ORDERS
# ──────────────────────────────────────────────
po_statuses = ["draft", "open", "confirmed", "in_production", "quality_check", "ready", "shipped", "delivered"]
po_objects = []

for i, fo in enumerate(file_objects):
    qty = [5000, 8000, 12000, 3000, 10000, 6000, 15000, 4000, 7000, 9000,
           2000, 11000, 8500, 6500, 3500][i % 15]
    up = [5.50, 8.75, 12.00, 15.50, 7.25, 6.00, 9.50, 11.00, 4.50, 8.00,
          22.00, 7.75, 10.50, 3.75, 18.00][i % 15]
    currency = [usd, eur, usd, usd, gbp, usd, eur, usd, usd, gbp,
                usd, usd, eur, usd, usd][i % 15]
    dest = [countries.get("USA"), countries.get("DEU"), countries.get("GBR"),
            countries.get("FRA"), countries.get("NLD"), countries.get("SWE"),
            countries.get("CAN"), countries.get("AUS"), countries.get("JPN"),
            countries.get("ITA"), countries.get("ESP"), countries.get("BEL"),
            countries.get("DNK"), countries.get("NOR"), countries.get("POL")][i % 15]
    dm = [delivery_modes.get("FOB"), delivery_modes.get("CIF"), delivery_modes.get("CM"),
          delivery_modes.get("FOB"), delivery_modes.get("CIF"), delivery_modes.get("FOB"),
          delivery_modes.get("CMT"), delivery_modes.get("FOB"), delivery_modes.get("CIF"),
          delivery_modes.get("FOB"), delivery_modes.get("CM"), delivery_modes.get("FOB"),
          delivery_modes.get("CIF"), delivery_modes.get("FOB"), delivery_modes.get("CMT")][i % 15]
    pt = [payment_terms.get("LC-S"), payment_terms.get("DA30"), payment_terms.get("CAD"),
          payment_terms.get("LC-30"), payment_terms.get("TT-A"), payment_terms.get("LC-S"),
          payment_terms.get("DA60"), payment_terms.get("LC-30"), payment_terms.get("CAD"),
          payment_terms.get("LC-S"), payment_terms.get("DA30"), payment_terms.get("LC-60"),
          payment_terms.get("TT-50"), payment_terms.get("LC-S"), payment_terms.get("CAD")][i % 15]

    po, _ = PurchaseOrder.objects.get_or_create(
        tenant=tenant, po_number=f"PO-{style_objects[i].style_number[-4:]}",
        defaults={
            "file_opening": fo, "buyer": fo.buyer, "brand": fo.brand,
            "factory": fo.factory,
            "po_date": fo.file_date + timedelta(days=14),
            "delivery_date": fo.file_date + timedelta(days=120 + i * 15),
            "destination_country": dest,
            "destination_port": f"Port of {dest.name}" if dest else "",
            "quantity": qty, "unit_price": up, "total_value": Decimal(str(qty * up)),
            "currency": currency, "payment_terms": pt, "delivery_mode": dm,
            "status": po_statuses[i % len(po_statuses)],
        }
    )
    po_objects.append(po)
print(f"[OK] Purchase Orders: {len(po_objects)}")

# ──────────────────────────────────────────────
# 5. PO ITEMS (Color/Size breakdown)
# ──────────────────────────────────────────────
size_runs = {
    "LAD": ["XS", "S", "M", "L", "XL", "XXL"],
    "MEN": ["S", "M", "L", "XL", "XXL", "3XL"],
    "KID": ["2Y", "4Y", "6Y", "8Y", "10Y", "12Y"],
    "ACT": ["XS", "S", "M", "L", "XL"],
    "INT": ["S", "M", "L", "XL"],
}
color_selections = [
    ["BLK", "WHT", "NVY"],
    ["BLK", "WHT", "RED", "BLU"],
    ["NVY", "GRY", "BRN"],
    ["WHT", "PNK", "LAV"],
    ["BLK", "WHT"],
]

po_item_count = 0
for i, po in enumerate(po_objects):
    style = style_objects[i]
    dept_code = style.department.code if style.department else "LAD"
    sizes = size_runs.get(dept_code, ["S", "M", "L", "XL"])
    color_codes = color_selections[i % len(color_selections)]
    qty_per_color = po.quantity // len(color_codes)

    for j, cc in enumerate(color_codes):
        color = colors.get(cc)
        if not color:
            continue
        sz = sizes[j % len(sizes)]
        items_in_po = qty_per_color // len(sizes)
        for sz in sizes:
            PurchaseOrderItem.objects.get_or_create(
                tenant=tenant, purchase_order=po, color=color, size=sz,
                defaults={
                    "quantity": items_in_po,
                    "unit_price": po.unit_price,
                }
            )
            po_item_count += 1
print(f"[OK] PO Items: {po_item_count}")

# ──────────────────────────────────────────────
# 5.5 HITS (production breakdown, per PO colour)
# Feeds the Order List "Actual completion date" column:
# shipped/delivered POs get an actual_delivery_date; in-flight stay blank.
# ──────────────────────────────────────────────
hit_count = 0
for i, po in enumerate(po_objects):
    color_codes = color_selections[i % len(color_selections)]
    for j, cc in enumerate(color_codes):
        color = colors.get(cc)
        if not color:
            continue
        original = po.delivery_date
        actual = original + timedelta(days=7) if po.status in ("shipped", "delivered") else None
        _, created = Hit.objects.get_or_create(
            tenant=tenant, purchase_order=po, colour=color,
            defaults={
                "hit_number": f"HT-{i + 1:03d}-{j + 1}",
                "original_delivery_date": original,
                "actual_delivery_date": actual,
            }
        )
        if created:
            hit_count += 1
print(f"[OK] Hits: {hit_count}")

# ──────────────────────────────────────────────
# 6. BOM (Bill of Materials)
# ──────────────────────────────────────────────
bom_items_data = [
    ("Fabric", "Main Fabric - Cotton Jersey 180gsm", "KGS", 0.18, 5.0, 3.50, "VEN-002"),
    ("Fabric", "Rib Collar Fabric", "MTR", 0.05, 3.0, 1.20, "VEN-003"),
    ("Trim", "Neck Label - Woven", "PCS", 1.0, 2.0, 0.08, "VEN-008"),
    ("Trim", "Care Label", "PCS", 1.0, 1.0, 0.05, "VEN-008"),
    ("Trim", "Hang Tag", "PCS", 1.0, 1.0, 0.12, "VEN-008"),
    ("Trim", "Size Label", "PCS", 1.0, 1.0, 0.03, "VEN-008"),
    ("Trim", "Price Sticker", "PCS", 1.0, 0.5, 0.04, "VEN-008"),
    ("Trims", "Main Swing Ticket", "PCS", 1.0, 1.5, 0.15, "VEN-008"),
    ("Packing", "Poly Bag 6x10", "PCS", 1.0, 1.0, 0.02, "VEN-009"),
    ("Packing", "Carton Box 60x40x40", "CTN", 0.002, 2.0, 1.50, "VEN-009"),
    ("Packing", "Tissue Paper", "PCS", 1.0, 1.0, 0.06, "VEN-009"),
    ("Packing", "Carton Sticker", "PCS", 0.08, 1.0, 0.05, "VEN-010"),
    ("Trims", "Woven Main Label 50mm", "MTR", 0.05, 2.0, 0.30, "VEN-008"),
    ("Accessories", "Shoulder Sponge 15mm", "PCS", 2.0, 3.0, 0.20, "VEN-007"),
    ("Accessories", "Safety Pin", "PCS", 2.0, 5.0, 0.01, "VEN-007"),
]

bom_count = 0
for sv in StyleVersion.objects.filter(tenant=tenant).select_related("style"):
    bom, _ = BOM.objects.get_or_create(
        tenant=tenant, style_version=sv, version=1,
        defaults={"name": f"BOM - {sv.style.style_number}", "status": "active"}
    )
    for cat, item_name, uom_code, consumption, waste, up, vendor_code in bom_items_data:
        BOMItem.objects.get_or_create(
            tenant=tenant, bom=bom, item_name=item_name,
            defaults={
                "category": cat,
                "description": f"{item_name} specification",
                "uom": uoms.get(uom_code),
                "consumption": consumption,
                "waste_percent": waste,
                "unit_price": up,
                "vendor": vendors.get(vendor_code),
            }
        )
        bom_count += 1
print(f"[OK] BOMs + BOM Items: {bom_count}")

# ──────────────────────────────────────────────
# 7. COSTING
# ──────────────────────────────────────────────
sheet_types = ["sl", "vn", "bd", "cn", "other"]
costing_count = 0
for i, po in enumerate(po_objects[:8]):
    up = Decimal(str(po.unit_price))
    fabric = (up * Decimal("0.45")).quantize(Decimal("0.01"))
    trim = (up * Decimal("0.12")).quantize(Decimal("0.01"))
    cm = (up * Decimal("0.25")).quantize(Decimal("0.01"))
    overhead = (up * Decimal("0.08")).quantize(Decimal("0.01"))
    total = fabric + trim + cm + overhead
    margin = ((up - total) / up * 100).quantize(Decimal("0.01"))

    costing, _ = Costing.objects.get_or_create(
        tenant=tenant, purchase_order=po, version=1,
        defaults={
            "target_price": po.unit_price,
            "fabric_cost": fabric, "trim_cost": trim,
            "cm_cost": cm, "overhead_cost": overhead,
            "total_cost": total, "margin": margin,
            "status": ["approved", "pending", "draft"][i % 3],
            "sheet_type": sheet_types[i % len(sheet_types)],
            "is_live": i == 0,
            "exchange_rate": Decimal("0.79") if i % 2 == 0 else None,
        }
    )

    design_fields = {
        "notes": (
            "Striped shell — pattern must match at side seams."
            if i % 2 == 1 else
            "Full-size run, plain fabric." if i % 3 != 0 else
            "Single-size sample costing; do not use for production."
        ),
        "is_single_size": i % 3 == 0,
        "size_ratio": (
            [{"size": "S", "ratio": 1}, {"size": "M", "ratio": 2}, {"size": "L", "ratio": 2}]
            if i % 3 != 0 else
            [{"size": "M", "ratio": 1}]
        ),
        "confirmed": i % 4 == 0,
        "is_patterned": i % 2 == 1,
        "patterned_fabric_options": (
            ["striped", "match_point"] if i % 2 == 1 else []
        ),
    }
    design_updates = [f for f, v in design_fields.items() if getattr(costing, f) != v]
    if design_updates:
        for f, v in design_fields.items():
            setattr(costing, f, v)
        costing.save(update_fields=design_updates)

    if costing.lines.count() == 0:
        lines = [
            ("fabric", "Main fabric", Decimal("0.45"), Decimal(str(po.quantity or 1))),
            ("trim", "Buttons", Decimal("0.02"), Decimal("10")),
            ("label", "Care labels", Decimal("0.01"), Decimal("5")),
            ("making", "CM per piece", Decimal("0.25"), Decimal("1")),
            ("overhead", "Factory overheads", Decimal("0.08"), Decimal("1")),
        ]
        for cat, desc, price, qty in lines:
            CostingLine.objects.get_or_create(
                tenant=tenant, costing=costing, category=cat, description=desc,
                defaults={
                    "unit_price": price, "consumption": qty, "sort_order": 0,
                    "size_width": "58 in" if cat in ("fabric", "trim") else "",
                },
            )
    costing_count += 1
print(f"[OK] Costings: {costing_count}")

# ──────────────────────────────────────────────
# 8. TIME & ACTION (T&A)
# ──────────────────────────────────────────────
ta_milestones = [
    ("Tech Pack Received", 0, False, "completed"),
    ("Fabric Sourcing", 7, True, "completed"),
    ("Fabric In-house", 21, True, "completed"),
    ("Lab Dip Approval", 28, True, "completed"),
    ("PP Meeting", 35, False, "completed"),
    ("Bulk Cutting Start", 42, True, "in_progress"),
    ("Bulk Sewing Start", 56, True, "pending"),
    ("Inline Inspection", 63, False, "pending"),
    ("Finishing Start", 70, True, "pending"),
    ("Final Inspection", 84, True, "pending"),
    ("Packing Complete", 91, False, "pending"),
    ("Shipment", 105, True, "pending"),
]

ta_count = 0
for i, po in enumerate(po_objects[:8]):
    if i % 2 == 0:
        ta_obj, _ = TA.objects.get_or_create(
            tenant=tenant, purchase_order=po,
            defaults={
                "status": "active" if i < 5 else "completed",
                "delivery_date": po.delivery_date,
            }
        )
        for j, (name, days_offset, critical, status) in enumerate(ta_milestones):
            TAMilestone.objects.get_or_create(
                tenant=tenant, ta=ta_obj, name=name,
                defaults={
                    "planned_date": po.po_date + timedelta(days=days_offset),
                    "actual_date": po.po_date + timedelta(days=days_offset + 3) if status == "completed" else None,
                    "status": status, "is_critical": critical,
                    "sort_order": j + 1,
                }
            )
            ta_count += 1
        ta_count += 1  # count the TA itself
print(f"[OK] T&A + Milestones: {ta_count}")

# ══════════════════════════════════════════════
# COMMERCIAL
# ══════════════════════════════════════════════
print("\n--- Commercial ---")

# ──────────────────────────────────────────────
# 9. BANKS
# ──────────────────────────────────────────────
banks_data = [
    ("DBBL", "Dutch-Bangla Bank Limited", "DBBLBDDH", "Gulshan, Dhaka"),
    ("BRAC", "BRAC Bank Limited", "BRACBDDH", "Gulshan, Dhaka"),
    ("IBL", "ICB Bank Limited", "ICBDBDDH", "Motijheel, Dhaka"),
    ("SBL", "Standard Bank Limited", "SBLDBDDH", "Gulshan, Dhaka"),
    ("UCB", "United Commercial Bank", "UCBLBDDH", "Motijheel, Dhaka"),
    ("HSBC", "HSBC Bangladesh", "HSBCBDDH", "Gulshan, Dhaka"),
    ("CITI", "Citibank N.A. Bangladesh", "CITIBDDH", "Gulshan, Dhaka"),
    ("SCB", "Standard Chartered Bank", "SCBLBDDH", "Gulshan, Dhaka"),
]
bank_objects = []
for code, name, swift, addr in banks_data:
    b, _ = Bank.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "swift_code": swift, "address": addr, "status": "active"}
    )
    bank_objects.append(b)
print(f"[OK] Banks: {len(bank_objects)}")

# ──────────────────────────────────────────────
# 10. LETTERS OF CREDIT
# ──────────────────────────────────────────────
lc_statuses = ["received", "accepted", "utilized", "amended", "draft", "expired"]
lc_count = 0
for i, po in enumerate(po_objects[:6]):
    lc_num = f"LC-2026-{1001 + i}"
    LC.objects.get_or_create(
        tenant=tenant, lc_number=lc_num,
        defaults={
            "lc_type": "master" if i % 3 != 0 else "b2b",
            "buyer": po.buyer,
            "purchase_order": po,
            "bank": bank_objects[i % len(bank_objects)],
            "amount": po.total_value,
            "currency": po.currency,
            "issued_date": po.po_date + timedelta(days=7),
            "expiry_date": po.delivery_date + timedelta(days=30),
            "status": lc_statuses[i % len(lc_statuses)],
            "utilized_amount": po.total_value if lc_statuses[i % len(lc_statuses)] == "utilized" else 0,
        }
    )
    lc_count += 1

# LC Amendments
for i, lc in enumerate(LC.objects.filter(tenant=tenant)[:3]):
    LCAmendment.objects.get_or_create(
        tenant=tenant, lc=lc, amendment_number=1,
        defaults={
            "amount_change": Decimal("500.00"),
            "expiry_date_change": lc.expiry_date + timedelta(days=15),
            "reason": "Extend expiry date and adjust quantity",
            "status": "approved" if i < 2 else "pending",
            "approved_by": admin_user,
        }
    )
print(f"[OK] LCs: {lc_count}, Amendments: {LCAmendment.objects.filter(tenant=tenant).count()}")

# ══════════════════════════════════════════════
# PRODUCTION
# ══════════════════════════════════════════════
print("\n--- Production ---")

# ──────────────────────────────────────────────
# 11. PRODUCTION PLANS
# ──────────────────────────────────────────────
prod_statuses = ["planned", "in_progress", "completed", "draft"]
plan_count = 0
for i, po in enumerate(po_objects[:8]):
    start = po.po_date + timedelta(days=42)
    ProductionPlan.objects.get_or_create(
        tenant=tenant, purchase_order=po,
        defaults={
            "factory": po.factory,
            "plan_date": po.po_date + timedelta(days=35),
            "start_date": start,
            "end_date": start + timedelta(days=42),
            "quantity": po.quantity,
            "status": prod_statuses[i % len(prod_statuses)],
        }
    )
    plan_count += 1
print(f"[OK] Production Plans: {plan_count}")

# ──────────────────────────────────────────────
# 12. DAILY PRODUCTION
# ──────────────────────────────────────────────
daily_count = 0
for po in po_objects[:4]:
    start = po.po_date + timedelta(days=45)
    for day in range(10):
        prod_date = start + timedelta(days=day)
        target = po.quantity // 15
        actual = int(target * (0.85 + (day % 3) * 0.05))
        passed = int(actual * 0.97)
        rejected = actual - passed
        eff = Decimal(str(round(actual / target * 100, 2))) if target else 0
        dhu = Decimal(str(round(rejected / actual * 100, 2))) if actual else 0

        DailyProduction.objects.get_or_create(
            tenant=tenant, factory=po.factory, purchase_order=po,
            production_date=prod_date,
            defaults={
                "line_number": (day % 4) + 1,
                "target_quantity": target,
                "actual_quantity": actual,
                "passed_quantity": passed,
                "rejected_quantity": rejected,
                "efficiency": eff,
                "dhu": dhu,
                "manpower": 30 + (day % 3) * 5,
                "working_hours": Decimal("8.00"),
                "status": "approved" if day < 7 else "active",
            }
        )
        daily_count += 1
print(f"[OK] Daily Production Reports: {daily_count}")

# ══════════════════════════════════════════════
# QUALITY
# ══════════════════════════════════════════════
print("\n--- Quality ---")

# ──────────────────────────────────────────────
# 13. INSPECTIONS
# ──────────────────────────────────────────────
insp_types = ["inline", "final", "pre shipment"]
insp_statuses = ["passed", "failed", "in_progress", "passed"]
insp_count = 0

for i, po in enumerate(po_objects[:6]):
    insp, _ = Inspection.objects.get_or_create(
        tenant=tenant, purchase_order=po,
        defaults={
            "factory": po.factory,
            "inspection_type": insp_types[i % 3],
            "inspection_date": po.po_date + timedelta(days=60 + i * 10),
            "aql_level": Decimal("2.5"),
            "sample_size": 200 + i * 50,
            "passed_quantity": 190 + i * 45,
            "rejected_quantity": 10 - i,
            "status": insp_statuses[i % 4],
        }
    )
    insp_count += 1

    # Inspection defect items
    defect_types = [
        ("Skip Stitch", "major"), ("Open Seam", "critical"),
        ("Broken Needle", "critical"), ("Stain", "major"),
        ("Measurement Out of Spec", "major"), ("Color Shading", "minor"),
        ("Fabric Hole", "critical"), ("Label Mismatch", "major"),
        ("Uncut Thread", "minor"), ("Pressing Marks", "minor"),
    ]
    for j in range(3):
        defect, severity = defect_types[(i + j) % len(defect_types)]
        InspectionItem.objects.get_or_create(
            tenant=tenant, inspection=insp, defect_type=defect,
            defaults={
                "defect_count": 2 + j,
                "severity": severity,
                "description": f"{defect} found during {insp.inspection_type} inspection",
            }
        )
print(f"[OK] Inspections: {insp_count}, Defect Items: {InspectionItem.objects.filter(tenant=tenant).count()}")

# ══════════════════════════════════════════════
# LOGISTICS
# ══════════════════════════════════════════════
print("\n--- Logistics ---")

# ──────────────────────────────────────────────
# 14. FREIGHT FORWARDERS
# ──────────────────────────────────────────────
ff_data = [
    ("FF-001", "Maersk Logistics BD", "Kamal Hossain", "kamal@maersk.com", "+880-2-87140100"),
    ("FF-002", "MSC Bangladesh", "Rafiq Ahmed", "rafiq@msc.com", "+880-2-87140200"),
    ("FF-003", "CMA CGM BD", "Nasir Khan", "nasir@cmacgm.com", "+880-2-87140300"),
    ("FF-004", "Evergreen Shipping", "Li Ming", "liming@evergreen.com", "+880-2-87140400"),
    ("FF-005", "PIL Bangladesh", "Raj Kumar", "rajkumar@pilship.com", "+880-2-87140500"),
]
ff_objects = []
for code, name, contact, email, phone in ff_data:
    ff, _ = FreightForwarder.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "contact_person": contact, "email": email, "phone": phone, "is_active": True}
    )
    ff_objects.append(ff)
print(f"[OK] Freight Forwarders: {len(ff_objects)}")

# ──────────────────────────────────────────────
# 15. SHIPMENTS
# ──────────────────────────────────────────────
ship_statuses = ["booked", "picked_up", "in_transit", "at_port", "arrived", "delivered"]
ship_count = 0
for i, po in enumerate(po_objects[:6]):
    etd = po.delivery_date - timedelta(days=14)
    eta = etd + timedelta(days=28)
    Shipment.objects.get_or_create(
        tenant=tenant, shipment_number=f"SH-2026-{2001 + i}",
        defaults={
            "purchase_order": po,
            "freight_forwarder": ff_objects[i % len(ff_objects)],
            "vessel_name": f"MV Ocean Spirit {chr(65 + i)}",
            "voyage_number": f"VYG-{3000 + i}",
            "container_number": f"MSCU{7000000 + i}",
            "container_size": "40" if i % 2 == 0 else "20",
            "port_of_loading": "Chattogram, Bangladesh",
            "port_of_discharge": f"Port of {po.destination_country.name}" if po.destination_country else "Rotterdam",
            "etd": etd,
            "eta": eta,
            "atd": etd + timedelta(days=1) if i > 2 else None,
            "status": ship_statuses[i % len(ship_statuses)],
        }
    )
    ship_count += 1
print(f"[OK] Shipments: {ship_count}")

# ──────────────────────────────────────────────
# 15b. IMPORT RECAPS (RQ-043 / B2 demo rows)
# ──────────────────────────────────────────────
imp_statuses = ["in_transit", "arrived", "unstuffed"]
imp_modes = ["sea", "air", "sea"]
imp_foc = ["lc", "lc", "foc"]
imp_cats = ["fabric", "fabric", "trims"]
imp_count = 0
vendor_list = list(vendors.values())
factory_list = list(factories.values())
for i in range(3):
    etd = date.today() - timedelta(days=35 + i)
    eta = etd + timedelta(days=18)
    ImportRecap.objects.get_or_create(
        tenant=tenant, s_c_number=f"SC-2026-{4100 + i}",
        defaults={
            "supplier": vendor_list[i % len(vendor_list)] if vendor_list else None,
            "factory": factory_list[i % len(factory_list)] if factory_list else None,
            "invoice_value": Decimal("18500.00") + Decimal(i) * Decimal("1250.00"),
            "item_category": imp_cats[i],
            "quantity": Decimal("4200.00") + Decimal(i) * Decimal("800.00"),
            "rolls_bales": 120 + i * 36,
            "container": f"TCNU{9000000 + i}",
            "bl_hawb": f"OOLU2312{400000 + i}",
            "mode": imp_modes[i],
            "lc_foc": imp_foc[i],
            "vessel": f"MV Bay Trader {chr(65 + i)}",
            "pcd_date": etd - timedelta(days=6),
            "etd_date": etd,
            "eta_date": eta,
            "atb_date": eta + timedelta(days=2) if i < 2 else None,
            "unstuffed_date": eta + timedelta(days=5) if i < 2 else None,
            "in_house_date": eta + timedelta(days=7) if i == 0 else None,
            "agent": "Progressive Clearing & Forwarding",
            "docs_received": i < 2,
            "status": imp_statuses[i],
            "remarks": "Priority trims lot" if i == 2 else "Standard fabric lot",
        }
    )
    imp_count += 1
print(f"[OK] Import Recaps: {imp_count}")

# ──────────────────────────────────────────────
# 15c. EXPORT RECAPS (RQ-044 / B3 demo rows)
# ──────────────────────────────────────────────
exp_modes = ["sea", "sea", "air"]
exp_count = 0
po_export_list = list(PurchaseOrder.objects.filter(tenant=tenant)[:3])
for i in range(3):
    inv_date = date.today() - timedelta(days=45 + i)
    on_board = inv_date + timedelta(days=5)
    eta = on_board + timedelta(days=28)
    fob_val = Decimal("85000.00") + Decimal(i) * Decimal("12500.00")
    ExportRecap.objects.get_or_create(
        tenant=tenant, fob_no=f"FOB-2026-{101 + i}",
        defaults={
            "purchase_order": po_export_list[i % len(po_export_list)] if po_export_list else None,
            "factory": factory_list[i % len(factory_list)] if factory_list else None,
            "forwarder": ff_objects[i % len(ff_objects)] if ff_objects else None,
            "s_c_number": f"SC-2026-{4200 + i}",
            "factory_invoice": f"F-INV-{2600 + i}",
            "factory_invoice_date": inv_date,
            "customer_invoice": f"C-INV-{1800 + i}",
            "customer_invoice_date": inv_date + timedelta(days=2),
            "quantity": Decimal("10000.00") + Decimal(i) * Decimal("2500.00"),
            "fob_value": fob_val,
            "cmpt_value": fob_val * Decimal("0.506"),
            "cost_value": fob_val * Decimal("0.447"),
            "service_pct": Decimal("3.000"),
            "ex_factory_date": inv_date,
            "mode": exp_modes[i],
            "hbl": f"OONL2026HBL{880 + i}",
            "on_board_date": on_board,
            "eta_date": eta,
            "container": f"TCLU{7799000 + i}",
            "bl_number": f"OOLU202609{8700 + i}",
            "courier": "DHL Express" if i == 2 else "",
            "factory_pay_terms": "60 days",
            "factory_amount": fob_val * Decimal("0.588"),
            "factory_due_date": on_board + timedelta(days=60),
            "factory_paid_date": None,
            "customer_pay_terms": "30 days",
            "customer_received_amount": fob_val,
            "customer_due_date": on_board + timedelta(days=30),
            "customer_payment_date": on_board + timedelta(days=27) if i == 0 else None,
            "remarks": "Full FOB lot to London" if i == 0 else ("CMPT lot with L/C docs" if i == 1 else "Air export sample lot"),
        }
    )
    exp_count += 1
print(f"[OK] Export Recaps: {exp_count}")

# ──────────────────────────────────────────────
# 15d. SUPPLIER PAYMENTS (RQ-045 / B4 demo rows)
# ──────────────────────────────────────────────
sp_payment_methods = ["TT", "LC", "TT"]
sp_status = [0, 0, 1]  # released flags (0 unreleased, 1 released)
sp_count = 0
po_sp_list = list(PurchaseOrder.objects.filter(tenant=tenant)[:3])
for i in range(3):
    due = date.today() + timedelta(days=20 + i * 10)
    if sp_status[i]:
        due = date.today() - timedelta(days=5)
    SupplierPayment.objects.get_or_create(
        tenant=tenant, payment_ref=f"SP-2026-{201 + i}",
        defaults={
            "supplier": vendor_list[i % len(vendor_list)] if vendor_list else None,
            "purchase_order": po_sp_list[i % len(po_sp_list)] if po_sp_list else None,
            "invoice_no": f"SP-INV-{300 + i}",
            "fn_ref": f"FO-2026-0{100 + i}",
            "allocated_amount": Decimal("4800.00") + Decimal(i) * Decimal("200.00"),
            "amount": Decimal("4800.00") + Decimal(i) * Decimal("200.00"),
            "currency": "USD",
            "payment_date": (date.today() - timedelta(days=10)) if sp_status[i] else None,
            "due_date": due,
            "payment_method": sp_payment_methods[i],
            "released": bool(sp_status[i]),
            "released_at": (date.today() - timedelta(days=8)) if sp_status[i] else None,
            "remarks": "LC-backed fabric settlement" if sp_payment_methods[i] == "LC" else "TT fabric settlement",
        }
    )
    sp_count += 1
print(f"[OK] Supplier Payments: {sp_count}")

# ──────────────────────────────────────────────
# 15e. COST RECONCILIATIONS (RQ-046 / B5 demo rows)
# ──────────────────────────────────────────────
cr_count = 0
cr_po_list = list(PurchaseOrder.objects.filter(tenant=tenant)[:3])
cr_statuses = ["pending", "resolved", "disputed"]
for i, po in enumerate(cr_po_list):
    live_cost = Costing.objects.filter(tenant=tenant, purchase_order=po, is_live=True).first()
    recap = ExportRecap.objects.filter(tenant=tenant, purchase_order=po).first()
    factory_amt = Decimal(str(recap.factory_amount)) if recap else Decimal("2000.00") + Decimal(i) * Decimal("150.00")
    cm_amt = Decimal(str(live_cost.cm_cost * po.quantity)) if live_cost else Decimal("1800.00") + Decimal(i) * Decimal("100.00")
    # one row flagged as a mismatch (factory > planning), one matching, one disputed
    if i == 1:
        factory_amt = cm_amt
    CostReconciliation.objects.get_or_create(
        tenant=tenant, purchase_order=po,
        defaults={
            "export_recap": recap,
            "costing": live_cost,
            "factory_inv_amount": factory_amt,
            "factory_inv_qty": Decimal(str(po.quantity)),
            "planning_cm_amount": cm_amt,
            "planning_cm_qty": Decimal(str(po.quantity)),
            "status": cr_statuses[i],
            "notes": "Factory Inv vs Planning CM for PO cost reconciliation.",
        }
    )
    cr_count += 1
print(f"[OK] Cost Reconciliations: {cr_count}")

# ──────────────────────────────────────────────
# 15e. FORWARD ORDERS (RQ-048 / B7 demo rows)
# ──────────────────────────────────────────────
fo_count = 0
fo_buyers = list(buyers.values())
po_reference = po_objects[0] if po_objects else None
for i in range(3):
    month_date = (date.today().replace(day=1) + timedelta(days=30 * i)).replace(day=1)
    fo_buyer = fo_buyers[i % len(fo_buyers)] if fo_buyers else None
    fo_factory = factory_list[i % len(factory_list)] if factory_list else None
    fo_po = po_reference if (i == 0 and po_reference) else None
    ForwardOrder.objects.get_or_create(
        tenant=tenant,
        month=month_date,
        buyer=fo_buyer,
        factory=fo_factory,
        defaults={
            "purchase_order": fo_po,
            "quantity": Decimal("1000.00") + Decimal(i) * Decimal("700.00"),
            "unit_cost": Decimal("3.00") + Decimal("0.50") * Decimal(i),
            "service_pct": Decimal("3.00"),
            "in_hand_units": Decimal("200.00") + Decimal(i) * Decimal("150.00"),
            "status": ["confirmed", "in_production", "draft"][i],
            "remarks": f"Forward commitment {i + 1} (Order In-hand tracked)",
        },
    )
    fo_count += 1
print(f"[OK] Forward Orders: {fo_count}")

# ══════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════
print("\n" + "=" * 50)
print("ALL MODULE SEED COMPLETE!")
print("=" * 50)
print("\nMerchandising:")
print(f"  Styles:            {Style.objects.filter(tenant=tenant).count()}")
print(f"  Style Versions:    {StyleVersion.objects.filter(tenant=tenant).count()}")
print(f"  File Openings:     {FileOpening.objects.filter(tenant=tenant).count()}")
print(f"  Purchase Orders:   {PurchaseOrder.objects.filter(tenant=tenant).count()}")
print(f"  PO Items:          {PurchaseOrderItem.objects.filter(tenant=tenant).count()}")
print(f"  BOMs:              {BOM.objects.filter(tenant=tenant).count()}")
print(f"  BOM Items:         {BOMItem.objects.filter(tenant=tenant).count()}")
print(f"  Costings:          {Costing.objects.filter(tenant=tenant).count()}")
print(f"  T&A:               {TA.objects.filter(tenant=tenant).count()}")
print(f"  T&A Milestones:    {TAMilestone.objects.filter(tenant=tenant).count()}")
print("\nCommercial:")
print(f"  Banks:             {Bank.objects.filter(tenant=tenant).count()}")
print(f"  LCs:               {LC.objects.filter(tenant=tenant).count()}")
print(f"  LC Amendments:     {LCAmendment.objects.filter(tenant=tenant).count()}")
print("\nProduction:")
print(f"  Production Plans:  {ProductionPlan.objects.filter(tenant=tenant).count()}")
print(f"  Daily Production:  {DailyProduction.objects.filter(tenant=tenant).count()}")
print("\nQuality:")
print(f"  Inspections:       {Inspection.objects.filter(tenant=tenant).count()}")
print(f"  Inspection Items:  {InspectionItem.objects.filter(tenant=tenant).count()}")
print("\nLogistics:")
print(f"  Freight Forwarders:{FreightForwarder.objects.filter(tenant=tenant).count()}")
print(f"  Shipments:         {Shipment.objects.filter(tenant=tenant).count()}")
print(f"  Import Recaps:     {ImportRecap.objects.filter(tenant=tenant).count()}")
print(f"  Export Recaps:     {ExportRecap.objects.filter(tenant=tenant).count()}")
print(f"  Supplier Payments: {SupplierPayment.objects.filter(tenant=tenant).count()}")
print(f"  Cost Reconciliations: {CostReconciliation.objects.filter(tenant=tenant).count()}")
print(f"  Forward Orders:    {ForwardOrder.objects.filter(tenant=tenant).count()}")
