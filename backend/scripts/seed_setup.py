"""
Seed script for BHMS Setup data.
Bangladesh RMG industry realistic test data.
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.tenants.models import Tenant
from apps.setup.models import (
    Season, ProductCategory, ProductType, ProductDepartment,
    ComplianceDocumentType, DeliveryMode, UOM, Currency,
    Department, Designation, PaymentTerms, Country, ColorCode,
    Buyer, Brand, Factory, Vendor
)

# Get or create tenant
tenant, _ = Tenant.objects.get_or_create(
    slug="default",
    defaults={"name": "Demo Buying House", "schema_name": "tenant_default", "status": "active", "plan": "professional"}
)
print(f"Tenant: {tenant.name}\n")

# ──────────────────────────────────────────────
# 1. SEASONS
# ──────────────────────────────────────────────
seasons = [
    ("SS24", "Spring/Summer 2024"),
    ("FW24", "Fall/Winter 2024"),
    ("SS25", "Spring/Summer 2025"),
    ("FW25", "Fall/Winter 2025"),
    ("SS26", "Spring/Summer 2026"),
    ("FW26", "Fall/Winter 2026"),
    ("RH26", "Resort/Holiday 2026"),
    ("SS27", "Spring/Summer 2027"),
]
for code, name in seasons:
    Season.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name, "status": "active"})
print("[OK] Seasons")

# ──────────────────────────────────────────────
# 2. PRODUCT CATEGORIES
# ──────────────────────────────────────────────
categories_data = {
    "Tops": ["T-Shirt", "Polo Shirt", "Shirt", "Blouse", "Sweater", "Hoodie", "Cardigan", "Tank Top"],
    "Bottoms": ["Pants", "Jeans", "Shorts", "Skirt", "Leggings", "Chinos"],
    "Dresses": ["Casual Dress", "Formal Dress", "Maxi Dress", "A-Line Dress"],
    "Outerwear": ["Jacket", "Coat", "Blazer", "Vest", "Windbreaker"],
    "Activewear": ["Track Pant", "Yoga Pants", "Sports Bra", "Gym Short"],
    "Underwear": ["Brief", "Boxer", "Panties", "Bralette"],
    "Kids": ["Kids T-Shirt", "Kids Pants", "Kids Dress", "Baby Romper"],
}
cat_objects = {}
for cat_name, types in categories_data.items():
    cat, _ = ProductCategory.objects.get_or_create(
        tenant=tenant, code=cat_name[:3].upper(),
        defaults={"name": cat_name, "status": "active"}
    )
    cat_objects[cat_name] = cat
    for t in types:
        ProductType.objects.get_or_create(
            tenant=tenant, code=t[:3].upper(),
            defaults={"name": t, "category": cat, "status": "active"}
        )
print("[OK] Product Categories & Types")

# ──────────────────────────────────────────────
# 3. PRODUCT DEPARTMENTS
# ──────────────────────────────────────────────
departments = [
    ("LAD", "Ladies Wear"),
    ("MEN", "Mens Wear"),
    ("KID", "Kids Wear"),
    ("ACT", "Activewear"),
    ("INT", "Innerwear"),
    ("HM", "Home Textiles"),
]
for code, name in departments:
    ProductDepartment.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name, "status": "active"})
print("[OK] Product Departments")

# ──────────────────────────────────────────────
# 4. COMPLIANCE DOCUMENT TYPES
# ──────────────────────────────────────────────
compliance_docs = [
    ("OEKO", "OEKO-TEX Standard 100", "Textile safety certification", 365),
    ("BSCI", "BSCI Audit Report", "Business Social Compliance Initiative", 365),
    ("SEDEX", "SEDEX/SMETA Audit", "Supplier Ethical Data Exchange", 365),
    ("WRAP", "WRAP Certification", "Worldwide Responsible Accredited Production", 365),
    ("GOTS", "GOTS Certification", "Global Organic Textile Standard", 365),
    ("GRS", "Global Recycled Standard", "Recycled content verification", 365),
    ("BCI", "Better Cotton Initiative", "Sustainable cotton sourcing", 365),
    ("ISO", "ISO 9001:2015", "Quality management system", 1095),
    ("FSC", "FSC Certification", "Forest Stewardship Council (packaging)", 1095),
    ("CPSIA", "CPSIA Compliance", "US Consumer Product Safety Improvement Act", 365),
    ("REACH", "REACH Compliance", "EU chemical safety regulation", 365),
    ("AZO", "AZO Free Certification", "AZO dye testing", 180),
    ("NONT", "Non-Toxic Certification", "Non-toxic materials testing", 180),
]
for code, name, desc, validity in compliance_docs:
    ComplianceDocumentType.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "description": desc, "validity_days": validity, "status": "active"}
    )
print("[OK] Compliance Document Types")

# ──────────────────────────────────────────────
# 5. DELIVERY MODES
# ──────────────────────────────────────────────
delivery_modes = [
    ("FOB", "Free on Board"),
    ("CIF", "Cost, Insurance & Freight"),
    ("CFR", "Cost & Freight"),
    ("CM", "Cut & Make"),
    ("CMT", "Cut, Make & Trim"),
    ("FOB-DH", "FOB Dhaka"),
    ("FOB-CTG", "FOB Chattogram"),
    ("EXW", "Ex Works"),
    ("DDP", "Delivered Duty Paid"),
]
for code, name in delivery_modes:
    DeliveryMode.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name, "status": "active"})
print("[OK] Delivery Modes")

# ──────────────────────────────────────────────
# 6. UNITS OF MEASUREMENT
# ──────────────────────────────────────────────
uoms = [
    ("PCS", "Pieces"),
    ("DOZ", "Dozens"),
    ("CTN", "Cartons"),
    ("BOX", "Boxes"),
    ("KGS", "Kilograms"),
    ("LBS", "Pounds"),
    ("MTR", "Meters"),
    ("YRD", "Yards"),
    ("SQM", "Square Meters"),
    ("SET", "Sets"),
    ("PR", "Pairs"),
    ("ROL", "Rolls"),
    ("BAG", "Bags"),
    ("PAC", "Packs"),
    ("GSM", "Grams per Square Meter"),
]
for code, name in uoms:
    UOM.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name, "status": "active"})
print("[OK] Units of Measurement")

# ──────────────────────────────────────────────
# 7. CURRENCIES
# ──────────────────────────────────────────────
currencies = [
    ("USD", "US Dollar", "$", 1.0000, True),
    ("EUR", "Euro", "€", 1.0850, False),
    ("GBP", "British Pound", "£", 1.2700, False),
    ("BDT", "Bangladeshi Taka", "৳", 0.0091, False),
    ("CAD", "Canadian Dollar", "C$", 0.7400, False),
    ("AUD", "Australian Dollar", "A$", 0.6600, False),
    ("JPY", "Japanese Yen", "¥", 0.0067, False),
    ("CNY", "Chinese Yuan", "¥", 0.1400, False),
    ("CHF", "Swiss Franc", "CHF", 1.1300, False),
    ("SEK", "Swedish Krona", "kr", 0.0970, False),
    ("NOK", "Norwegian Krone", "kr", 0.0950, False),
    ("DKK", "Danish Krone", "kr", 0.1460, False),
    ("KRW", "South Korean Won", "₩", 0.00073, False),
    ("INR", "Indian Rupee", "₹", 0.0120, False),
    ("TRY", "Turkish Lira", "₺", 0.0310, False),
]
for code, name, symbol, rate, is_default in currencies:
    Currency.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "symbol": symbol, "exchange_rate": rate, "is_default": is_default, "status": "active"}
    )
print("[OK] Currencies")

# ──────────────────────────────────────────────
# 8. INTERNAL DEPARTMENTS
# ──────────────────────────────────────────────
internal_depts = [
    ("MKT", "Merchandising"),
    ("PD", "Product Development"),
    ("QA", "Quality Assurance"),
    ("QC", "Quality Control"),
    ("PRO", "Production"),
    ("LOG", "Logistics"),
    ("CM", "Commercial"),
    ("FIN", "Finance"),
    ("HR", "Human Resources"),
    ("IT", "Information Technology"),
    ("ADM", "Administration"),
    ("EXP", "Export"),
    ("IMP", "Import"),
    ("WH", "Warehouse"),
    ("CUT", "Cutting"),
    ("Sew", "Sewing"),
    ("FIN-DEPT", "Finishing"),
    ("PAC", "Packing"),
    ("STR", "Store"),
    ("PUR", "Purchase"),
]
for code, name in internal_depts:
    Department.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name, "status": "active"})
print("[OK] Internal Departments")

# ──────────────────────────────────────────────
# 9. DESIGNATIONS
# ──────────────────────────────────────────────
designations = [
    ("MD", "Managing Director"),
    ("DMD", "Deputy Managing Director"),
    ("GM", "General Manager"),
    ("AGM", "Assistant General Manager"),
    ("DGM", "Deputy General Manager"),
    ("Sr MM", "Senior Merchandiser"),
    ("MM", "Merchandiser"),
    ("AMM", "Assistant Merchandiser"),
    ("JMM", "Junior Merchandiser"),
    ("ME", "Merchandiser Executive"),
    ("QAM", "Quality Assurance Manager"),
    ("QCM", "Quality Control Manager"),
    ("QC-Insp", "QC Inspector"),
    ("PM", "Production Manager"),
    ("PP", "Production Planner"),
    ("SEW-OP", "Sewing Operator"),
    ("CUT-Mstr", "Cutting Master"),
    ("LOG-Mgr", "Logistics Manager"),
    ("CM-Mgr", "Commercial Manager"),
    ("FIN-Acc", "Accounts Executive"),
    ("HR-Off", "HR Officer"),
    ("IT-Mgr", "IT Manager"),
    ("ADM-Off", "Admin Officer"),
    ("Sr-Exp", "Senior Executive"),
    ("Exec", "Executive"),
    ("Jr-Exec", "Junior Executive"),
    ("Off-Ass", "Office Assistant"),
    ("Helper", "Helper"),
]
for code, name in designations:
    Designation.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name, "status": "active"})
print("[OK] Designations")

# ──────────────────────────────────────────────
# 10. PAYMENT TERMS
# ──────────────────────────────────────────────
payment_terms = [
    ("CAD", "Cash Against Documents", 0, "Payment on document presentation"),
    ("DA30", "Documents Against Acceptance 30", 30, "DA at 30 days sight"),
    ("DA60", "Documents Against Acceptance 60", 60, "DA at 60 days sight"),
    ("DA90", "Documents Against Acceptance 90", 90, "DA at 90 days sight"),
    ("LC-S", "LC Sight", 0, "Letter of Credit at sight"),
    ("LC-30", "LC 30 Days", 30, "LC at 30 days"),
    ("LC-60", "LC 60 Days", 60, "LC at 60 days"),
    ("LC-90", "LC 90 Days", 90, "LC at 90 days"),
    ("TT-A", "TT in Advance", 0, "Telegraphic Transfer in advance"),
    ("TT-50", "50% Advance + 50% on BL", 0, "50% TT advance, balance on BL copy"),
    ("NET15", "Net 15", 15, "Payment due in 15 days"),
    ("NET30", "Net 30", 30, "Payment due in 30 days"),
    ("NET45", "Net 45", 45, "Payment due in 45 days"),
    ("NET60", "Net 60", 60, "Payment due in 60 days"),
    ("NET90", "Net 90", 90, "Payment due in 90 days"),
    ("CD-2-10", "2% Discount in 10 Days", 10, "2% discount if paid within 10 days"),
    ("ETD", "Electronic Transfer", 0, "Payment via electronic transfer"),
]
for code, name, days, desc in payment_terms:
    PaymentTerms.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "days": days, "description": desc, "status": "active"}
    )
print("[OK] Payment Terms")

# ──────────────────────────────────────────────
# 11. COUNTRIES
# ──────────────────────────────────────────────
countries = [
    ("BGD", "Bangladesh", "BDT"),
    ("USA", "United States", "USD"),
    ("GBR", "United Kingdom", "GBP"),
    ("DEU", "Germany", "EUR"),
    ("FRA", "France", "EUR"),
    ("ITA", "Italy", "EUR"),
    ("ESP", "Spain", "EUR"),
    ("NLD", "Netherlands", "EUR"),
    ("BEL", "Belgium", "EUR"),
    ("SWE", "Sweden", "SEK"),
    ("NOR", "Norway", "NOK"),
    ("DNK", "Denmark", "DKK"),
    ("FIN", "Finland", "EUR"),
    ("CAN", "Canada", "CAD"),
    ("AUS", "Australia", "AUD"),
    ("JPN", "Japan", "JPY"),
    ("KOR", "South Korea", "KRW"),
    ("CHN", "China", "CNY"),
    ("IND", "India", "INR"),
    ("TUR", "Turkey", "TRY"),
    ("PRT", "Portugal", "EUR"),
    ("POL", "Poland", "EUR"),
    ("CZE", "Czech Republic", "EUR"),
    ("AUT", "Austria", "EUR"),
    ("CHE", "Switzerland", "CHF"),
    ("IRL", "Ireland", "EUR"),
    ("ISR", "Israel", "USD"),
    ("ARE", "UAE", "USD"),
    ("SAU", "Saudi Arabia", "USD"),
    ("ZAF", "South Africa", "USD"),
    ("BRA", "Brazil", "USD"),
    ("MEX", "Mexico", "USD"),
    ("CHL", "Chile", "USD"),
    ("COL", "Colombia", "USD"),
]
currency_map = {c.code: c for c in Currency.objects.filter(tenant=tenant)}
for code, name, curr_code in countries:
    curr = currency_map.get(curr_code)
    Country.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "default_currency": curr, "status": "active"}
    )
print("[OK] Countries")

# ──────────────────────────────────────────────
# 12. COLOR CODES
# ──────────────────────────────────────────────
colors = [
    ("BLK", "Black", "#000000"),
    ("WHT", "White", "#FFFFFF"),
    ("NVY", "Navy Blue", "#000080"),
    ("RED", "Red", "#FF0000"),
    ("BLU", "Blue", "#0000FF"),
    ("GRN", "Green", "#008000"),
    ("YEL", "Yellow", "#FFFF00"),
    ("ORG", "Orange", "#FFA500"),
    ("PNK", "Pink", "#FFC0CB"),
    ("PRP", "Purple", "#800080"),
    ("GRY", "Grey", "#808080"),
    ("LGRY", "Light Grey", "#C0C0C0"),
    ("DGRY", "Dark Grey", "#404040"),
    ("BRN", "Brown", "#A52A2A"),
    ("BEI", "Beige", "#F5F5DC"),
    ("CRM", "Cream", "#FFFDD0"),
    ("OLV", "Olive", "#808000"),
    ("MRN", "Maroon", "#800000"),
    ("TIL", "Teal", "#008080"),
    ("CYA", "Cyan", "#00FFFF"),
    ("LAV", "Lavender", "#E6E6FA"),
    ("SAL", "Salmon", "#FA8072"),
    ("COR", "Coral", "#FF7F50"),
    ("Gld", "Gold", "#FFD700"),
    ("Slv", "Silver", "#C0C0C0"),
    ("RST", "Rust", "#B7410E"),
    ("TAN", "Tan", "#D2B48C"),
    ("KHK", "Khaki", "#C3B091"),
    ("MGT", "Magenta", "#FF00FF"),
    ("WNE", "Wine", "#722F37"),
]
for code, name, hex_code in colors:
    ColorCode.objects.get_or_create(
        tenant=tenant, code=code,
        defaults={"name": name, "hex_code": hex_code, "status": "active"}
    )
print("[OK] Color Codes")

# ──────────────────────────────────────────────
# 13. BUYERS
# ──────────────────────────────────────────────
buyers_data = [
    {"code": "HM", "name": "H&M (Hennes & Mauritz)", "contact_person": "Lars Andersson", "email": "procurement@hm.com", "phone": "+46-8-796-5900", "address": "Stockholm, Sweden"},
    {"code": "IND", "name": "Inditex (Zara)", "contact_person": "Maria Garcia", "email": "sourcing@inditex.com", "phone": "+34-981-185-400", "address": "Arteixo, Spain"},
    {"code": "GAP", "name": "Gap Inc.", "contact_person": "Jennifer Smith", "email": "global.sourcing@gap.com", "phone": "+1-650-577-5000", "address": "San Francisco, USA"},
    {"code": "WAL", "name": "Walmart", "contact_person": "Robert Johnson", "email": "apparel@walmart.com", "phone": "+1-479-273-4000", "address": "Bentonville, USA"},
    {"code": "TGT", "name": "Target Corporation", "contact_person": "Amy Wilson", "email": "vendor@target.com", "phone": "+1-612-304-6073", "address": "Minneapolis, USA"},
    {"code": "COST", "name": "Costco", "contact_person": "Mike Chen", "email": "apparel@costco.com", "phone": "+1-425-313-8100", "address": "Washington, USA"},
    {"code": "MNG", "name": "Mango", "contact_person": "Pablo Martinez", "email": "production@mango.com", "phone": "+34-93-467-8000", "address": "Barcelona, Spain"},
    {"code": "C&A", "name": "C&A", "contact_person": "Hans Mueller", "email": "sourcing@c-and-a.com", "phone": "+49-2161-805-0", "address": "Dusseldorf, Germany"},
    {"code": "TK", "name": "Tommy Hilfiger", "contact_person": "David Lee", "email": "production@tommy.com", "phone": "+1-212-519-7800", "address": "New York, USA"},
    {"code": "NIKE", "name": "Nike Inc.", "contact_person": "Sarah Brown", "email": "apparel@nike.com", "phone": "+1-503-671-6453", "address": "Oregon, USA"},
    {"code": "ADD", "name": "Addidas", "contact_person": "Thomas Weber", "email": "production@adidas.com", "phone": "+49-9132-81-0", "address": "Herzogenaurach, Germany"},
    {"code": "DEC", "name": "Decathlon", "contact_person": "Pierre Dupont", "email": "sourcing@decathlon.com", "phone": "+33-4-72-56-8900", "address": "Villeurbanne, France"},
    {"code": "PRIM", "name": "Primark", "contact_person": "Niamh O'Brien", "email": "buying@primark.com", "phone": "+353-1-637-8800", "address": "Dublin, Ireland"},
    {"code": "LIDL", "name": "Lidl", "contact_person": "Klaus Schmidt", "email": "apparel@lidl.com", "phone": "+49-7131-904-0", "address": "Neckarsulm, Germany"},
    {"code": "ALDI", "name": "Aldi", "contact_person": "Andreas Braun", "email": "textile@aldi.com", "phone": "+49-201-859-0", "address": "Essen, Germany"},
]
for b in buyers_data:
    Buyer.objects.get_or_create(
        tenant=tenant, code=b["code"],
        defaults={"name": b["name"], "contact_person": b["contact_person"],
                  "email": b["email"], "phone": b["phone"], "address": b["address"],
                  "status": "active"}
    )
print("[OK] Buyers")

# ──────────────────────────────────────────────
# 14. BRANDS (linked to buyers)
# ──────────────────────────────────────────────
brands_data = {
    "HM": [("HM-BM", "H&M Basic"), ("HM-DV", "H&M Divided"), ("HM-MS", "H&M Modern Stories"), ("HM-LF", "H&M Loom & Folk")],
    "IND": [("ZRA", "Zara"), ("ZRA-SR", "Zara SRPLS"), ("MASS", "Massimo Dutti")],
    "GAP": [("GAP", "Gap"), ("OLD", "Old Navy"), ("BAN", "Banana Republic")],
    "WAL": [("WTM", "Walmart Main"), ("SMH", "Sam's Hill"), ("EP", "Equate Performance")],
    "TGT": [("UNU", "Universal Thread"), ("WD", "Wild Fable"), ("AF", "All in Motion")],
    "NIKE": [("NK-A", "Nike Athletics"), ("NK-LF", "Nike Lifestyle")],
    "ADD": [("AD-C", "Adidas Core"), ("AD-PR", "Adidas Performance"), ("AD-OG", "Adidas Originals")],
    "TK": [("TH", "Tommy Hilfiger"), ("CK", "Calvin Klein")],
}
buyer_objects = {b.code: b for b in Buyer.objects.filter(tenant=tenant)}
for buyer_code, brands in brands_data.items():
    buyer = buyer_objects.get(buyer_code)
    if buyer:
        for code, name in brands:
            Brand.objects.get_or_create(
                tenant=tenant, buyer=buyer, code=code,
                defaults={"name": name, "status": "active"}
            )
print("[OK] Brands")

# ──────────────────────────────────────────────
# 15. FACTORIES
# ──────────────────────────────────────────────
factories_data = [
    {"code": "FT-001", "name": "Apex Textile Mills Ltd", "contact_person": "Enamul Haque", "email": "info@apextextile.com", "phone": "+880-2-87140011", "address": "Gazipur", "city": "Gazipur", "capacity": 80000, "capacity_unit": "month", "factory_type": "knitting"},
    {"code": "FT-002", "name": "Fakir Knitwears Ltd", "contact_person": "M.A. Fakir", "email": "info@fakirknit.com", "phone": "+880-2-88910020", "address": "Dhaka", "city": "Dhaka", "capacity": 120000, "capacity_unit": "month", "factory_type": "knitting"},
    {"code": "FT-003", "name": "DBL Group", "contact_person": "Abdul Awal", "email": "info@dblgroup.com", "phone": "+880-2-87911010", "address": "Dhaka", "city": "Dhaka", "capacity": 200000, "capacity_unit": "month", "factory_type": "knitting"},
    {"code": "FT-004", "name": "Beximco Textiles Ltd", "contact_person": "A.S.F. Rahman", "email": "info@beximco.com", "phone": "+880-2-9887021", "address": "Dhaka", "city": "Dhaka", "capacity": 150000, "capacity_unit": "month", "factory_type": "woven"},
    {"code": "FT-005", "name": "Square Fashions Ltd", "contact_person": "Tapan Chowdhury", "email": "info@squarefashions.com", "phone": "+880-2-8713421", "address": "Gazipur", "city": "Gazipur", "capacity": 100000, "capacity_unit": "month", "factory_type": "knitting"},
    {"code": "FT-006", "name": "Epic Group", "contact_person": "Rajiv Baid", "email": "info@epicgroup.com", "phone": "+880-2-87140616", "address": "Dhaka", "city": "Dhaka", "capacity": 180000, "capacity_unit": "month", "factory_type": "woven"},
    {"code": "FT-007", "name": "Mohammad Group", "contact_person": "A.K.M. Rahmatullah", "email": "info@mohammadgroup.com", "phone": "+880-2-9291456", "address": "Chattogram", "city": "Chattogram", "capacity": 60000, "capacity_unit": "month", "factory_type": "knitting"},
    {"code": "FT-008", "name": "Noman Group", "contact_person": "Noman Abedin", "email": "info@nomangroup.com", "phone": "+880-2-87130220", "address": "Dhaka", "city": "Dhaka", "capacity": 90000, "capacity_unit": "month", "factory_type": "knitting"},
    {"code": "FT-009", "name": "Ha-Meem Group", "contact_person": "A.K. Azad", "email": "info@hameemgroup.com", "phone": "+880-2-87133220", "address": "Dhaka", "city": "Dhaka", "capacity": 250000, "capacity_unit": "month", "factory_type": "woven"},
    {"code": "FT-010", "name": "Tex International Ltd", "contact_person": "Syed Manzur Elahi", "email": "info@texintl.com", "phone": "+880-2-9881106", "address": "Chattogram", "city": "Chattogram", "capacity": 70000, "capacity_unit": "month", "factory_type": "woven"},
]
for f in factories_data:
    Factory.objects.get_or_create(
        tenant=tenant, code=f["code"],
        defaults={"name": f["name"], "contact_person": f["contact_person"],
                  "email": f["email"], "phone": f["phone"],
                  "address": f["address"], "city": f["city"],
                  "capacity": f["capacity"], "capacity_unit": f["capacity_unit"],
                  "factory_type": f["factory_type"], "status": "active"}
    )
print("[OK] Factories")

# ──────────────────────────────────────────────
# 16. VENDORS / SUPPLIERS
# ──────────────────────────────────────────────
vendors_data = [
    {"code": "VEN-001", "name": "Vardhman Textiles Ltd", "contact_person": "S.P. Oswal", "email": "info@vardhman.com", "phone": "+91-161-2314001", "address": "Ludhiana, India", "city": "Ludhiana", "lead_time_days": 14},
    {"code": "VEN-002", "name": "Noman Group - Fabrics", "contact_person": "Kamal Hossain", "email": "fabric@nomangroup.com", "phone": "+880-2-87130220", "address": "Dhaka", "city": "Dhaka", "lead_time_days": 7},
    {"code": "VEN-003", "name": "Orion Textiles", "contact_person": "Jahangir Alam", "email": "info@oriontextiles.com", "phone": "+880-61-68021", "address": "Chattogram", "city": "Chattogram", "lead_time_days": 10},
    {"code": "VEN-004", "name": "Hirdaramani Textiles", "contact_person": "Ravi Thadhani", "email": "info@hirdaramani.com", "phone": "+94-11-2304000", "address": "Colombo, Sri Lanka", "city": "Colombo", "lead_time_days": 21},
    {"code": "VEN-005", "name": "A&E Yarns Bangladesh", "contact_person": "Tanvir Ahmed", "email": "sales@ae-yarns.com", "phone": "+880-2-87140500", "address": "Dhaka", "city": "Dhaka", "lead_time_days": 5},
    {"code": "VEN-006", "name": "Pacific Textile Mills", "contact_person": "Wei Chen", "email": "sales@pacifictextile.com", "phone": "+86-769-22178000", "address": "Dongguan, China", "city": "Dongguan", "lead_time_days": 30},
    {"code": "VEN-007", "name": "Bangladesh Zipper Ltd", "contact_person": "Rafiqul Islam", "email": "info@bdzipper.com", "phone": "+880-2-87140800", "address": "Gazipur", "city": "Gazipur", "lead_time_days": 3},
    {"code": "VEN-008", "name": "Star Fashions Trims", "contact_person": "Mohammad Ali", "email": "sales@starfashions.com", "phone": "+880-2-87140900", "address": "Dhaka", "city": "Dhaka", "lead_time_days": 3},
    {"code": "VEN-009", "name": "Fancy Buttons BD", "contact_person": "Kamal Uddin", "email": "info@fancybuttons.com", "phone": "+880-2-87141000", "address": "Gazipur", "city": "Gazipur", "lead_time_days": 4},
    {"code": "VEN-010", "name": "Dragon Label Printing", "contact_person": "Li Wei", "email": "orders@dragonlabel.com", "phone": "+86-571-88888888", "address": "Hangzhou, China", "city": "Hangzhou", "lead_time_days": 25},
]
for v in vendors_data:
    Vendor.objects.get_or_create(
        tenant=tenant, code=v["code"],
        defaults={"name": v["name"], "contact_person": v["contact_person"],
                  "email": v["email"], "phone": v["phone"],
                  "address": v["address"], "city": v["city"],
                  "lead_time_days": v["lead_time_days"], "status": "active"}
    )
print("[OK] Vendors")

print("\n" + "="*50)
print("SEED COMPLETE!")
print("="*50)
print(f"\nSummary:")
print(f"  Seasons:        {Season.objects.filter(tenant=tenant).count()}")
print(f"  Categories:     {ProductCategory.objects.filter(tenant=tenant).count()}")
print(f"  Product Types:  {ProductType.objects.filter(tenant=tenant).count()}")
print(f"  Departments:    {ProductDepartment.objects.filter(tenant=tenant).count()}")
print(f"  Compliance:     {ComplianceDocumentType.objects.filter(tenant=tenant).count()}")
print(f"  Delivery Modes: {DeliveryMode.objects.filter(tenant=tenant).count()}")
print(f"  UOMs:           {UOM.objects.filter(tenant=tenant).count()}")
print(f"  Currencies:     {Currency.objects.filter(tenant=tenant).count()}")
print(f"  Internal Depts: {Department.objects.filter(tenant=tenant).count()}")
print(f"  Designations:   {Designation.objects.filter(tenant=tenant).count()}")
print(f"  Payment Terms:  {PaymentTerms.objects.filter(tenant=tenant).count()}")
print(f"  Countries:      {Country.objects.filter(tenant=tenant).count()}")
print(f"  Color Codes:    {ColorCode.objects.filter(tenant=tenant).count()}")
print(f"  Buyers:         {Buyer.objects.filter(tenant=tenant).count()}")
print(f"  Brands:         {Brand.objects.filter(tenant=tenant).count()}")
print(f"  Factories:      {Factory.objects.filter(tenant=tenant).count()}")
print(f"  Vendors:        {Vendor.objects.filter(tenant=tenant).count()}")
