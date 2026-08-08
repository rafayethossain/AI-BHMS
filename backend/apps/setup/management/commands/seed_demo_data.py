"""
Management command to seed demo data for BHMS.
"""
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.commercial.models import (
    LC,
    Bank,
    DebitNote,
    InvoiceApproval,
    LCAmendment,
    ProformaInvoice,
    SalesConfirmation,
    SalesContract,
)
from apps.fabric.models import (
    RFQ,
    FabricBooking,
    FabricCategory,
    FabricMill,
    FabricOrder,
    FabricSupplier,
    HTSCode,
    RFQLineItem,
    RFQResponse,
    RFQResponseItem,
)
from apps.logistics.models import (
    BookingScheduleItem,
    Docket,
    FinalHitReconciliation,
    FreightForwarder,
    Shipment,
)
from apps.merchandising.models import (
    BOM,
    BOMItem,
    DesignImage,
    FileOpening,
    FitSpec,
    FitStage,
    Hit,
    HitDeliveryMode,
    HitDeliveryType,
    JobPriority,
    JobRequest,
    JobStatus,
    JobType,
    POAmendment,
    PurchaseOrder,
    PurchaseOrderItem,
    Style,
    StyleVersion,
    TrimStatus,
)
from apps.quality.models import ComplianceAudit, GoldSeal
from apps.reporting.models import SavedReport
from apps.setup.models import (
    UOM,
    Brand,
    Buyer,
    ColorCode,
    ComplianceDocumentType,
    Country,
    Currency,
    DeliveryMode,
    Factory,
    PaymentTerms,
    ProductCategory,
    ProductDepartment,
    ProductType,
    RiskLevel,
    Season,
    Vendor,
)
from apps.tenants.models import Tenant


DEMO_FROZEN_BASE_DATE = date(2026, 8, 1)


class Command(BaseCommand):
    help = "Seed demo data for BHMS"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true", help="Clear existing data before seeding"
        )
        parser.add_argument(
            "--tenant", type=str, default=None, help="Tenant slug (default: first active)"
        )
        parser.add_argument(
            "--demo-frozen-dates",
            action="store_true",
            help="Pin all seeded dates to DEMO_FROZEN_BASE_DATE for reproducible demos",
        )

    def handle(self, *args, **options):
        self.clear = options["clear"]
        tenant_slug = options["tenant"]

        self.demo_frozen_dates = options.get("demo_frozen_dates", False)
        self.today = DEMO_FROZEN_BASE_DATE if self.demo_frozen_dates else timezone.localdate()
        self.now = (
            timezone.make_aware(datetime.combine(self.today, datetime.min.time()))
            if self.demo_frozen_dates
            else timezone.now()
        )

        self.tenant = self._get_tenant(tenant_slug)
        self.stdout.write(f"Seeding data for tenant: {self.tenant.name}")

        if self.clear:
            self._clear_data()

        counts = {}
        counts["buyers"] = self._seed_buyers()
        counts["brands"] = self._seed_brands()
        counts["factories"] = self._seed_factories()
        counts["vendors"] = self._seed_vendors()
        counts["colors"] = self._seed_colors()
        counts["seasons"] = self._seed_seasons()
        counts["product_categories"] = self._seed_product_categories()
        counts["product_types"] = self._seed_product_types()
        counts["product_departments"] = self._seed_product_departments()
        counts["currencies"] = self._seed_currencies()
        counts["payment_terms"] = self._seed_payment_terms()
        counts["uom"] = self._seed_uom()
        counts["countries"] = self._seed_countries()
        counts["compliance_doc_types"] = self._seed_compliance_doc_types()
        counts["delivery_modes"] = self._seed_delivery_modes()
        counts["risk_levels"] = self._seed_risk_levels()
        counts["freight_forwarders"] = self._seed_freight_forwarders()
        counts["styles"] = self._seed_styles()
        counts["file_openings"] = self._seed_file_openings()
        counts["quick_lead"] = self._seed_quick_lead_data()
        counts["repeats"] = self._seed_repeat_data()
        counts["stock_fabric"] = self._seed_stock_fabric_data()
        counts["fabric_tolerances"] = self._seed_fabric_tolerance_data()
        counts["purchase_orders"] = self._seed_purchase_orders()
        counts["po_amendments"] = self._seed_po_amendments()
        counts["shipments"] = self._seed_shipments()
        counts["booking_ref"] = self._seed_booking_ref_data()
        counts["dockets"] = self._seed_dockets()
        counts["banks"] = self._seed_banks()
        counts["lcs"] = self._seed_lcs()
        counts["lc_amendments"] = self._seed_lc_amendments()
        counts["proforma_invoices"] = self._seed_proforma_invoices()
        counts["sales_contracts"] = self._seed_sales_contracts()
        counts["fabric_categories"] = self._seed_fabric_categories()
        counts["hts_codes"] = self._seed_hts_codes()
        counts["fabric_suppliers"] = self._seed_fabric_suppliers()
        counts["fabric_mills"] = self._seed_fabric_mills()
        counts["rfqs"] = self._seed_rfqs()
        counts["rfq_responses"] = self._seed_fabric_rfq_responses()
        counts["fabric_bookings"] = self._seed_fabric_bookings()
        counts["fabric_orders"] = self._seed_fabric_orders()
        counts["fabric_risk"] = self._seed_fabric_risk_data()
        counts["fabric_schedule"] = self._seed_fabric_schedule_data()
        counts["fabric_utilization"] = self._seed_fabric_utilization_data()
        counts["boms"] = self._seed_boms()
        counts["hits"] = self._seed_hits()
        counts["fit_specs"] = self._seed_fit_specs()
        counts["job_requests"] = self._seed_jobs()
        counts["unsold_analysis_samples"] = self._seed_unsold_analysis_data()
        counts["booking_schedule"] = self._seed_booking_schedule()
        counts["final_hit_reconciliations"] = self._seed_final_hit_reconciliations()
        counts["gold_seals"] = self._seed_gold_seals()
        counts["compliance_audits"] = self._seed_compliance_audits()
        counts["order_manager_demo"] = self._seed_order_manager_demo()
        counts["paperwork_comparison"] = self._seed_paperwork_comparison_data()
        counts["sales_confirmations"] = self._seed_sales_confirmations()
        counts["debit_notes"] = self._seed_debit_notes()
        counts["invoice_approvals"] = self._seed_invoice_approvals()
        counts["design_images"] = self._seed_design_images()
        counts["saved_reports"] = self._seed_saved_reports()

        self.stdout.write(self.style.SUCCESS("\nSeeding complete:"))
        for key, val in counts.items():
            self.stdout.write(f"  - {val} {key.replace('_', ' ')}")
        self.stdout.write(self.style.SUCCESS("Done!"))

    def _get_tenant(self, slug):
        if slug:
            t = Tenant.objects.filter(slug=slug).first()
            if not t:
                raise ValueError(f"Tenant '{slug}' not found")
            return t
        t = Tenant.objects.filter(is_active=True).first()
        if not t:
            raise ValueError("No active tenant found. Create a tenant first.")
        return t

    def _get_users(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(tenant=self.tenant, status="active")

    def _clear_data(self):
        self.stdout.write("Clearing existing data...")
        SavedReport.objects.filter(tenant=self.tenant).delete()
        # Commercial
        InvoiceApproval.objects.filter(tenant=self.tenant).delete()
        DebitNote.objects.filter(tenant=self.tenant).delete()
        ProformaInvoice.objects.filter(tenant=self.tenant).delete()
        SalesContract.objects.filter(tenant=self.tenant).delete()
        SalesConfirmation.objects.filter(tenant=self.tenant).delete()
        LCAmendment.objects.filter(tenant=self.tenant).delete()
        LC.objects.filter(tenant=self.tenant).delete()
        Bank.objects.filter(tenant=self.tenant).delete()
        # Fabric
        FabricOrder.objects.filter(tenant=self.tenant).delete()
        FabricBooking.objects.filter(tenant=self.tenant).delete()
        RFQResponseItem.objects.filter(response__rfq__tenant=self.tenant).delete()
        RFQResponse.objects.filter(rfq__tenant=self.tenant).delete()
        RFQLineItem.objects.filter(rfq__tenant=self.tenant).delete()
        RFQ.objects.filter(tenant=self.tenant).delete()
        FabricMill.objects.filter(tenant=self.tenant).delete()
        FabricSupplier.objects.filter(tenant=self.tenant).delete()
        HTSCode.objects.filter(tenant=self.tenant).delete()
        FabricCategory.objects.filter(tenant=self.tenant).delete()
        Shipment.objects.filter(tenant=self.tenant).delete()
        BookingScheduleItem.objects.filter(tenant=self.tenant).delete()
        GoldSeal.objects.filter(tenant=self.tenant).delete()
        ComplianceAudit.objects.filter(tenant=self.tenant).delete()
        DesignImage.objects.filter(tenant=self.tenant).delete()
        Hit.objects.filter(tenant=self.tenant).delete()
        FitSpec.objects.filter(tenant=self.tenant).delete()
        JobRequest.objects.filter(tenant=self.tenant).delete()
        BOMItem.objects.filter(tenant=self.tenant).delete()
        BOM.objects.filter(tenant=self.tenant).delete()
        PurchaseOrderItem.objects.filter(tenant=self.tenant).delete()
        PurchaseOrder.objects.filter(tenant=self.tenant).delete()
        FileOpening.objects.filter(tenant=self.tenant).delete()
        StyleVersion.objects.filter(tenant=self.tenant).delete()
        Style.objects.filter(tenant=self.tenant).delete()
        FreightForwarder.objects.filter(tenant=self.tenant).delete()
        DeliveryMode.objects.filter(tenant=self.tenant).delete()
        ComplianceDocumentType.objects.filter(tenant=self.tenant).delete()
        UOM.objects.filter(tenant=self.tenant).delete()
        PaymentTerms.objects.filter(tenant=self.tenant).delete()
        Currency.objects.filter(tenant=self.tenant).delete()
        ProductDepartment.objects.filter(tenant=self.tenant).delete()
        ProductType.objects.filter(tenant=self.tenant).delete()
        ProductCategory.objects.filter(tenant=self.tenant).delete()
        Season.objects.filter(tenant=self.tenant).delete()
        ColorCode.objects.filter(tenant=self.tenant).delete()
        Vendor.objects.filter(tenant=self.tenant).delete()
        Factory.objects.filter(tenant=self.tenant).delete()
        Brand.objects.filter(tenant=self.tenant).delete()
        Buyer.objects.filter(tenant=self.tenant).delete()
        Country.objects.filter(tenant=self.tenant).delete()
        self.stdout.write("Clear complete.")

    # ── Setup masters ──────────────────────────────────────────────────

    def _seed_currencies(self):
        data = [
            ("USD", "US Dollar", "$", Decimal("1.0000"), True),
            ("EUR", "Euro", "€", Decimal("1.0850"), False),
            ("GBP", "British Pound", "£", Decimal("1.2650"), False),
            ("BDT", "Bangladeshi Taka", "৳", Decimal("0.0092"), False),
            ("CNY", "Chinese Yuan", "¥", Decimal("0.1380"), False),
        ]
        created = 0
        for code, name, symbol, rate, default in data:
            _, c = Currency.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "symbol": symbol, "exchange_rate": rate, "is_default": default},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} currencies")
        return created

    def _seed_payment_terms(self):
        data = [
            ("TT30", "T/T 30 Days", 30),
            ("LC01", "L/C At Sight", 0),
            ("TT60", "T/T 60 Days", 60),
            ("DP30", "D/P 30 Days", 30),
            ("OA90", "Open Account", 90),
        ]
        created = 0
        for code, name, days in data:
            PaymentTerms.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "days": days},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} payment terms")
        return created

    def _seed_countries(self):
        data = [
            ("BGD", "Bangladesh"), ("IND", "India"), ("CHN", "China"),
            ("VNM", "Vietnam"), ("TUR", "Turkey"), ("PAK", "Pakistan"),
            ("LKA", "Sri Lanka"), ("IDN", "Indonesia"), ("KHM", "Cambodia"),
            ("MMR", "Myanmar"),
        ]
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first()
        created = 0
        for code, name in data:
            Country.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "default_currency": usd},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} countries")
        return created

    def _seed_uom(self):
        data = [
            ("PCS", "Piece"), ("DZN", "Dozen"), ("CTN", "Carton"),
            ("KG", "Kg"), ("MTR", "Meter"),
        ]
        created = 0
        for code, name in data:
            UOM.objects.get_or_create(tenant=self.tenant, code=code, defaults={"name": name})
            created += 1
        self.stdout.write(f"  Seeded {created} UOMs")
        return created

    def _seed_seasons(self):
        data = [
            ("SS25", "Spring/Summer 2025", "2025-01-01", "2025-06-30"),
            ("FW25", "Fall/Winter 2025", "2025-07-01", "2025-12-31"),
            ("SS26", "Spring/Summer 2026", "2026-01-01", "2026-06-30"),
            ("FW26", "Fall/Winter 2026", "2026-07-01", "2026-12-31"),
            ("RES26", "Resort 2026", "2026-04-01", "2026-09-30"),
        ]
        created = 0
        for code, name, s, e in data:
            Season.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name,
                    "start_date": s,
                    "end_date": e,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} seasons")
        return created

    def _seed_product_categories(self):
        data = [
            ("TSH", "T-Shirts"), ("POL", "Polo Shirts"), ("HOD", "Hoodies"),
            ("SWT", "Sweatshirts"), ("JKT", "Jackets"), ("PNT", "Pants"),
            ("JNS", "Jeans"), ("SHT", "Shorts"), ("DRS", "Dresses"), ("TOP", "Tops"),
        ]
        created = 0
        for code, name in data:
            ProductCategory.objects.get_or_create(
                tenant=self.tenant, code=code, defaults={"name": name}
            )
            created += 1
        self.stdout.write(f"  Seeded {created} product categories")
        return created

    def _seed_product_types(self):
        categories = list(ProductCategory.objects.filter(tenant=self.tenant))
        if not categories:
            return 0
        data = [
            ("CAS", "Casual"), ("FOR", "Formal"), ("SPT", "Sportswear"),
            ("WRK", "Workwear"), ("LN", "Lounge"), ("ACT", "Activewear"),
            ("OUT", "Outdoor"), ("BSC", "Basic"),
        ]
        created = 0
        for code, name in data:
            cat = random.choice(categories)
            ProductType.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "category": cat},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} product types")
        return created

    def _seed_product_departments(self):
        data = [
            ("MEN", "Mens"), ("WMN", "Womens"), ("KID", "Kids"),
            ("JNR", "Juniors"), ("UNI", "Unisex"),
        ]
        created = 0
        for code, name in data:
            ProductDepartment.objects.get_or_create(
                tenant=self.tenant, code=code, defaults={"name": name}
            )
            created += 1
        self.stdout.write(f"  Seeded {created} product departments")
        return created

    def _seed_colors(self):
        data = [
            ("BLK", "Black", "#000000"), ("WHT", "White", "#FFFFFF"),
            ("NVY", "Navy Blue", "#000080"), ("RYL", "Royal Blue", "#4169E1"),
            ("SKY", "Sky Blue", "#87CEEB"), ("RED", "Red", "#FF0000"),
            ("BUR", "Burgundy", "#800020"), ("FRG", "Forest Green", "#228B22"),
            ("OLV", "Olive", "#808000"), ("YLW", "Yellow", "#FFD700"),
            ("ORG", "Orange", "#FF8C00"), ("PNK", "Pink", "#FFC0CB"),
            ("COR", "Coral", "#FF7F50"), ("BEG", "Beige", "#F5F5DC"),
            ("GRY", "Grey", "#808080"), ("CHC", "Charcoal", "#36454F"),
            ("BRN", "Brown", "#8B4513"), ("MRN", "Maroon", "#800000"),
            ("TEA", "Teal", "#008080"), ("LAV", "Lavender", "#E6E6FA"),
        ]
        created = 0
        for code, name, hex_code in data:
            ColorCode.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "hex_code": hex_code},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} colors")
        return created

    def _seed_compliance_doc_types(self):
        data = [
            ("OEK", "OEKO-TEX", "Standard 100 for textile safety", 365),
            ("BSCI", "BSCI", "Business Social Compliance Initiative", 365),
            ("SXD", "SEDEX", "Supplier Ethical Data Exchange", 365),
            ("WRP", "WRAP", "Worldwide Responsible Accredited Production", 365),
            ("GOT", "GOTS", "Global Organic Textile Standard", 365),
        ]
        created = 0
        for code, name, desc, validity in data:
            ComplianceDocumentType.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "description": desc, "validity_days": validity},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} compliance doc types")
        return created

    def _seed_delivery_modes(self):
        data = [
            ("SEA", "Sea Freight", "Ocean container shipping"),
            ("AIR", "Air Freight", "Air cargo shipping"),
            ("ROAD", "Road Transport", "Truck/road logistics"),
            ("RAIL", "Rail Freight", "Railway transport"),
        ]
        created = 0
        for code, name, desc in data:
            DeliveryMode.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "description": desc},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} delivery modes")
        return created

    def _seed_risk_levels(self):
        data = [
            ("none", "None", "#808080", "No risk identified", 0),
            ("green", "Low Risk", "#00FF00", "On track with no concerns", 1),
            ("amber", "Medium Risk", "#FFA500", "Requires monitoring", 2),
            ("red", "High Risk", "#FF0000", "Critical - immediate action needed", 3),
            ("cyan", "Info", "#00FFFF", "Informational notice", 4),
        ]
        created = 0
        for code, name, color, desc, sort_order in data:
            RiskLevel.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "color": color, "description": desc, "sort_order": sort_order},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} risk levels")
        return created

    # ── Entity masters ─────────────────────────────────────────────────

    def _seed_buyers(self):
        data = [
            ("H&M", "H&M", "Lars Nilsson", "lars@hm.com"),
            ("ZRA", "Zara", "Maria Garcia", "maria@zara.com"),
            ("PRM", "Primark", "Sean O'Brien", "sean@primark.com"),
            ("CNA", "C&A", "Hans Mueller", "hans@ca.com"),
            ("DEC", "Decathlon", "Pierre Dupont", "pierre@decathlon.com"),
            ("TGT", "Target", "Sarah Johnson", "sarah@target.com"),
            ("WMT", "Walmart", "James Williams", "james@walmart.com"),
            ("CST", "Costco", "Mike Chen", "mike@costco.com"),
            ("ALD", "Aldi", "Thomas Schmidt", "thomas@aldi.com"),
            ("NIK", "Nike", "Mark Parker", "mark@nike.com"),
        ]
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first()
        eur = Currency.objects.filter(tenant=self.tenant, code="EUR").first()
        tt30 = PaymentTerms.objects.filter(tenant=self.tenant, code="TT30").first()
        lc01 = PaymentTerms.objects.filter(tenant=self.tenant, code="LC01").first()
        sweden = Country.objects.filter(tenant=self.tenant, code="SWE").first()
        spain = Country.objects.filter(tenant=self.tenant, code="ESP").first()
        gbr = Country.objects.filter(tenant=self.tenant, code="GBR").first()
        deu = Country.objects.filter(tenant=self.tenant, code="DEU").first()
        fra = Country.objects.filter(tenant=self.tenant, code="FRA").first()
        usa = Country.objects.filter(tenant=self.tenant, code="USA").first()

        country_map = {
            "H&M": sweden, "Zara": spain, "Primark": gbr,
            "C&A": deu, "Decathlon": fra, "Target": usa,
            "Walmart": usa, "Costco": usa, "Aldi": deu, "Nike": usa,
        }
        created = 0
        for code, name, contact, email in data:
            Buyer.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name, "contact_person": contact, "email": email,
                    "country": country_map.get(name),
                    "currency": usd if name in ("H&M", "Nike", "Target", "Walmart", "Costco") else eur,
                    "payment_terms": lc01 if name in ("H&M", "Zara") else tt30,
                    "credit_limit": Decimal(str(random.randint(50000, 500000))),
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} buyers")
        return created

    def _seed_brands(self):
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        data = [
            ("FPL", "FashionPlus"), ("SPE", "SportElite"),
            ("CMF", "ComfortWear"), ("UBS", "UrbanStyle"),
            ("ACP", "ActivePro"),
        ]
        created = 0
        for code, name in data:
            buyer = random.choice(buyers)
            Brand.objects.get_or_create(
                tenant=self.tenant, buyer=buyer, code=code,
                defaults={"name": name},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} brands")
        return created

    def _seed_factories(self):
        data = [
            ("ATM", "Apex Textile Mills Ltd", "knitting", "Dhaka", 50000),
            ("FKW", "Fakir Knitwears Ltd", "knitting", "Gazipur", 35000),
            ("DBL", "DBL Group", "woven", "Dhaka", 60000),
            ("BXT", "Beximco Textiles Ltd", "woven", "Dhaka", 45000),
            ("SQF", "Square Fashions Ltd", "knitting", "Gazipur", 30000),
            ("EPG", "Epyllion Group", "knitting", "Dhaka", 40000),
            ("MGM", "Mahmud Group", "woven", "Chattogram", 25000),
            ("HMG", "Ha-Meem Group", "woven", "Dhaka", 55000),
        ]
        created = 0
        for code, name, ftype, city, cap in data:
            Factory.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name, "factory_type": ftype, "city": city,
                    "capacity": cap, "capacity_unit": "pieces",
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} factories")
        return created

    def _seed_vendors(self):
        data = [
            ("PDM", "Pacific Denim Mills"), ("NMG", "Noman Group"),
            ("PDT", "Padma Textile"), ("SDG", "Sadat Garments"),
            ("STG", "Stylo garments"),
        ]
        tt30 = PaymentTerms.objects.filter(tenant=self.tenant, code="TT30").first()
        created = 0
        for code, name in data:
            Vendor.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name, "payment_terms": tt30,
                    "lead_time_days": random.randint(14, 45),
                    "rating": Decimal(str(round(random.uniform(3.5, 5.0), 2))),
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} vendors")
        return created

    # ── Freight forwarders ─────────────────────────────────────────────

    def _seed_freight_forwarders(self):
        data = [
            ("DHL", "DHL Global Forwarding", "contact@dhl.com"),
            ("MSK", "Maersk Logistics", "contact@maersk.com"),
            ("FPT", "Flexport", "contact@flexport.com"),
        ]
        created = 0
        for code, name, email in data:
            FreightForwarder.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "email": email},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} freight forwarders")
        return created

    # ── Merchandising ──────────────────────────────────────────────────

    def _seed_styles(self):
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        brands = list(Brand.objects.filter(tenant=self.tenant))
        categories = list(ProductCategory.objects.filter(tenant=self.tenant))
        types = list(ProductType.objects.filter(tenant=self.tenant))
        departments = list(ProductDepartment.objects.filter(tenant=self.tenant))
        seasons = list(Season.objects.filter(tenant=self.tenant))

        styles_data = [
            ("STY-001", "Classic Crew Neck Tee", "draft"),
            ("STY-002", "Performance Polo", "active"),
            ("STY-003", "Urban Hoodie", "approved"),
            ("STY-004", "Cargo Tech Pants", "active"),
            ("STY-005", "Relaxed Fit Sweatshirt", "draft"),
        ]
        created = 0
        for number, name, status in styles_data:
            Style.objects.get_or_create(
                tenant=self.tenant, style_number=number,
                defaults={
                    "name": name,
                    "buyer": random.choice(buyers),
                    "brand": random.choice(brands),
                    "category": random.choice(categories),
                    "product_type": random.choice(types),
                    "department": random.choice(departments),
                    "season": random.choice(seasons),
                    "status": status,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} styles")
        return created

    def _seed_file_openings(self):
        styles = list(Style.objects.filter(tenant=self.tenant))
        factories = list(Factory.objects.filter(tenant=self.tenant))

        if not styles:
            self.stdout.write("  Skipped file openings (no styles)")
            return 0

        openings = [
            ("FO-2025-001", "open"),
            ("FO-2025-002", "confirmed"),
            ("FO-2025-003", "open"),
            ("FO-2025-004", "confirmed"),
            ("FO-2025-005", "open"),
        ]
        created = 0
        for number, status in openings:
            style = random.choice(styles)
            FileOpening.objects.get_or_create(
                tenant=self.tenant, file_number=number,
                defaults={
                    "style": style,
                    "buyer": style.buyer,
                    "factory": random.choice(factories),
                    "file_date": self.today - timedelta(days=random.randint(5, 30)),
                    "status": status,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} file openings")
        return created

    def _seed_quick_lead_data(self):
        fos = {fo.file_number: fo for fo in FileOpening.objects.filter(tenant=self.tenant)}
        fo = fos.get("FO-2025-003") or fos.get("FO-2025-001")
        if not fo:
            self.stdout.write("  Skipped quick lead data (no file openings)")
            return 0
        all_parties = FileOpening.QUICK_LEAD_PARTIES
        fo.is_quick_lead = True
        fo.quick_lead_agreed_by = list(all_parties)
        fo.save(update_fields=["is_quick_lead", "quick_lead_agreed_by", "updated_at"])
        fo2 = fos.get("FO-2025-005") or fos.get("FO-2025-002")
        if fo2:
            fo2.is_quick_lead = True
            fo2.quick_lead_agreed_by = all_parties[:2]
            fo2.save(update_fields=["is_quick_lead", "quick_lead_agreed_by", "updated_at"])
        self.stdout.write("  Seeded 2 quick lead file openings (1 fully agreed, 1 partial)")
        return 2

    def _seed_repeat_data(self):
        fos = {fo.file_number: fo for fo in FileOpening.objects.filter(tenant=self.tenant)}
        original = fos.get("FO-2025-001") or fos.get("FO-2025-002")
        if not original:
            self.stdout.write("  Skipped repeat data (no file openings)")
            return 0
        repeat, created = FileOpening.objects.get_or_create(
            tenant=self.tenant, file_number="FO-2025-006",
            defaults={
                "style": original.style,
                "style_version": original.style_version,
                "buyer": original.buyer,
                "brand": original.brand,
                "factory": original.factory,
                "file_date": self.today,
                "status": "open",
                "remarks": f"Repeat of {original.file_number}",
                "is_repeat": True,
                "original_fn": original,
            },
        )
        if not created:
            repeat.original_fn = original
            repeat.is_repeat = True
            repeat.save(update_fields=["original_fn", "is_repeat", "updated_at"])
        for party in FileOpening.REPEAT_APPROVAL_PARTIES:
            repeat.add_repeat_approval(party)
        repeat2, created2 = FileOpening.objects.get_or_create(
            tenant=self.tenant, file_number="FO-2025-007",
            defaults={
                "style": original.style,
                "style_version": original.style_version,
                "buyer": original.buyer,
                "brand": original.brand,
                "factory": original.factory,
                "file_date": self.today,
                "status": "open",
                "remarks": f"Repeat of {original.file_number}",
                "is_repeat": True,
                "original_fn": original,
            },
        )
        if created2:
            repeat2.add_repeat_approval("technical")
        self.stdout.write("  Seeded 2 repeat file openings (1 fully approved, 1 partial)")
        return 2

    def _seed_stock_fabric_data(self):
        fos = {fo.file_number: fo for fo in FileOpening.objects.filter(tenant=self.tenant)}
        template = fos.get("FO-2025-001") or fos.get("FO-2025-002")
        if not template:
            self.stdout.write("  Skipped stock fabric data (no file openings)")
            return 0
        stock1, created = FileOpening.objects.get_or_create(
            tenant=self.tenant, file_number="FO-2025-008",
            defaults={
                "style": template.style,
                "style_version": template.style_version,
                "buyer": template.buyer,
                "brand": template.brand,
                "factory": template.factory,
                "file_date": self.today,
                "status": "open",
                "remarks": "Stock fabric - moved to own FN",
                "is_stock_fabric": True,
                "stock_fabric_description": "stock fabric",
                "total_meters": 500,
            },
        )
        if not created:
            stock1.is_stock_fabric = True
            stock1.stock_fabric_description = "stock fabric"
            stock1.total_meters = 500
            stock1.save(update_fields=[
                "is_stock_fabric", "stock_fabric_description", "total_meters", "updated_at",
            ])
        target = fos.get("FO-2025-003") or template
        if stock1.stock_allocations.count() == 0:
            stock1.allocate_stock(target, 200, notes="Allocated to order")
        stock2, created2 = FileOpening.objects.get_or_create(
            tenant=self.tenant, file_number="FO-2025-009",
            defaults={
                "style": template.style,
                "style_version": template.style_version,
                "buyer": template.buyer,
                "brand": template.brand,
                "factory": template.factory,
                "file_date": self.today,
                "status": "open",
                "remarks": "Stock fabric - moved to own FN",
                "is_stock_fabric": True,
                "stock_fabric_description": "stock fabric",
                "total_meters": 1000,
            },
        )
        if not created2:
            stock2.is_stock_fabric = True
            stock2.stock_fabric_description = "stock fabric"
            stock2.total_meters = 1000
            stock2.save(update_fields=[
                "is_stock_fabric", "stock_fabric_description", "total_meters", "updated_at",
            ])
        self.stdout.write(
            "  Seeded 2 stock fabric file openings (1 allocated, 1 full balance)"
        )
        return 2

    def _seed_fabric_tolerance_data(self):
        from apps.fabric.models import FabricTolerance

        bands = [
            ("primark", "0.01", "2999", "5.00"),
            ("primark", "3001", "4999", "3.00"),
            ("primark", "5000", None, "2.00"),
            ("other", "0.01", "4999", "5.00"),
            ("other", "5000", "9999", "3.00"),
            ("other", "10000", None, "2.00"),
            ("fur", "0.01", None, "2.00"),
        ]
        created = 0
        for customer_type, qty_from, qty_to, pct in bands:
            _, was_created = FabricTolerance.objects.get_or_create(
                tenant=self.tenant, customer_type=customer_type, qty_from=qty_from,
                defaults={"qty_to": qty_to, "tolerance_pct": pct},
            )
            created += int(was_created)
        self.stdout.write(f"  Seeded {created} fabric tolerance bands (GC-005)")
        return created

    def _seed_purchase_orders(self):
        file_openings = list(FileOpening.objects.filter(tenant=self.tenant))
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        factories = list(Factory.objects.filter(tenant=self.tenant))
        colors = list(ColorCode.objects.filter(tenant=self.tenant))
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first()
        tt30 = PaymentTerms.objects.filter(tenant=self.tenant, code="TT30").first()
        sea = DeliveryMode.objects.filter(tenant=self.tenant, code="SEA").first()
        gbr = Country.objects.filter(tenant=self.tenant, code="GBR").first()
        usa = Country.objects.filter(tenant=self.tenant, code="USA").first()
        deu = Country.objects.filter(tenant=self.tenant, code="DEU").first()

        dest_countries = [c for c in [gbr, usa, deu] if c]
        statuses = ["draft", "open", "confirmed", "in_production", "ready"]

        po_data = [
            ("PO-2025-0001", 0), ("PO-2025-0002", 1), ("PO-2025-0003", 2),
            ("PO-2025-0004", 0), ("PO-2025-0005", 3), ("PO-2025-0006", 1),
            ("PO-2025-0007", 4), ("PO-2025-0008", 2),
        ]

        created = 0
        for i, (po_number, fo_idx) in enumerate(po_data):
            buyer = random.choice(buyers)
            factory = random.choice(factories)
            fo = file_openings[fo_idx % len(file_openings)] if file_openings else None
            status = statuses[i % len(statuses)]
            qty = random.randint(500, 5000)
            unit_price = Decimal(str(round(random.uniform(3.50, 18.00), 2)))
            total = unit_price * qty
            dest = random.choice(dest_countries) if dest_countries else None

            po, _ = PurchaseOrder.objects.get_or_create(
                tenant=self.tenant, po_number=po_number,
                defaults={
                    "file_opening": fo,
                    "buyer": buyer,
                    "factory": factory,
                    "po_date": self.today - timedelta(days=random.randint(10, 60)),
                    "delivery_date": self.today + timedelta(days=random.randint(30, 120)),
                    "destination_country": dest,
                    "destination_port": "Felixstowe" if dest and dest.code == "GBR" else "Los Angeles",
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_value": total,
                    "currency": usd,
                    "payment_terms": tt30,
                    "delivery_mode": sea,
                    "status": status,
                },
            )

            num_items = random.randint(2, 3)
            for _ in range(num_items):
                color = random.choice(colors)
                size = random.choice(["S", "M", "L", "XL", "XXL"])
                item_qty = random.randint(100, 1500)
                PurchaseOrderItem.objects.get_or_create(
                    tenant=self.tenant,
                    purchase_order=po,
                    color=color,
                    size=size,
                    defaults={
                        "quantity": item_qty,
                        "unit_price": unit_price,
                    },
                )
            created += 1
        self.stdout.write(f"  Seeded {created} purchase orders with items")
        return created

    def _seed_po_amendments(self):
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        created = 0
        for i, po in enumerate(pos[:3]):
            fields = [
                ("delivery_date", str(self.today + timedelta(days=90)), "Customer requested delivery push"),
                ("quantity", "3000", "Buyer increased order quantity"),
                ("destination_port", "Southampton", "Port change requested"),
            ]
            field_name, new_value, reason = fields[i % len(fields)]
            amendment, _ = POAmendment.objects.get_or_create(
                tenant=self.tenant, purchase_order=po, amendment_number=f"AMD-{1001 + i:04d}",
                defaults={
                    "field_name": field_name,
                    "old_value": str(getattr(po, field_name, "")),
                    "new_value": new_value,
                    "reason": reason,
                    "status": "pending",
                },
            )
            created += 1
        if created:
            self.stdout.write(f"  Seeded {created} purchase order amendments")
        return created

    def _seed_shipments(self):
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        factories = list(Factory.objects.filter(tenant=self.tenant))
        forwarders = list(FreightForwarder.objects.filter(tenant=self.tenant))

        if not pos:
            self.stdout.write("  Skipped shipments (no purchase orders)")
            return 0


        shipment_data = [
            ("SHP-2025-001", "booked", "sea"),
            ("SHP-2025-002", "in_transit", "sea"),
            ("SHP-2025-003", "at_port", "air"),
            ("SHP-2025-004", "cleared", "sea"),
            ("SHP-2025-005", "booking", "road"),
        ]

        created = 0
        for number, status, mode in shipment_data:
            po = random.choice(pos)
            factory = random.choice(factories)
            forwarder = random.choice(forwarders) if forwarders else None
            today = self.today

            Shipment.objects.get_or_create(
                tenant=self.tenant, shipment_number=number,
                defaults={
                    "purchase_order": po,
                    "factory": factory,
                    "freight_forwarder": forwarder,
                    "mode": mode,
                    "status": status,
                    "booking_date": today - timedelta(days=random.randint(1, 14)),
                    "etd": today + timedelta(days=random.randint(5, 30)),
                    "eta": today + timedelta(days=random.randint(35, 60)),
                    "port_of_loading": "Chattogram",
                    "port_of_discharge": "Felixstowe" if mode == "sea" else "Heathrow",
                    "container_number": f"MSKU{random.randint(1000000, 9999999)}" if mode == "sea" else None,
                    "container_size": random.choice(["20GP", "40GP"]) if mode == "sea" else None,
                    "quantity": Decimal(str(random.randint(500, 5000))),
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} shipments")
        return created

    def _seed_booking_ref_data(self):
        """GC-018: demo booking references. One shipment carries a filled
        freight booking ref (ok); one cleared shipment has a past ETA with no
        ref so it surfaces on the 14-day booking-ref alert."""
        filled = Shipment.objects.filter(
            tenant=self.tenant, shipment_number="SHP-2025-002"
        ).first()
        due = Shipment.objects.filter(
            tenant=self.tenant, shipment_number="SHP-2025-004"
        ).first()

        updated = 0
        if filled:
            filled.booking_reference = "BRF-2025-1184"
            filled.save(update_fields=["booking_reference"])
            updated += 1
        if due:
            due.eta = self.today - timedelta(days=2)
            due.save()
            updated += 1
        self.stdout.write(f"  Seeded {updated} booking refs (GC-018)")
        return updated

    def _seed_paperwork_comparison_data(self):
        """GC-022: dedicated POs demonstrating the shipped-vs-ordered analysis.

        PO-PC-OVER over-ships by 8% (over-tolerance while the docket fabric
        still covers the order); PO-PC-SHORT ships in line but its docket
        fabric cannot produce the ordered quantity (sales alert).
        """
        styles = list(Style.objects.filter(tenant=self.tenant))
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        factories = list(Factory.objects.filter(tenant=self.tenant))
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first()
        sea = DeliveryMode.objects.filter(tenant=self.tenant, code="SEA").first()
        fo = FileOpening.objects.filter(tenant=self.tenant).first()
        if not (styles and buyers and factories and usd and sea and fo):
            self.stdout.write("  Skipped paperwork comparison (missing masters)")
            return 0

        today = self.today
        scenarios = [
            ("PO-PC-OVER", 2000, "SHP-PC-OVER", "in_transit",
             Decimal("2160.00"), "DK-PC-OVER", Decimal("2400.00")),
            ("PO-PC-SHORT", 5000, "SHP-PC-SHORT", "cleared",
             Decimal("5000.00"), "DK-PC-SHORT", Decimal("300.00")),
        ]

        created = 0
        for po_no, po_qty, ship_no, ship_status, ship_qty, dk_no, meters in scenarios:
            po, _ = PurchaseOrder.objects.get_or_create(
                tenant=self.tenant, po_number=po_no,
                defaults={
                    "file_opening": fo,
                    "buyer": random.choice(buyers),
                    "factory": random.choice(factories),
                    "po_date": today - timedelta(days=30),
                    "delivery_date": today + timedelta(days=60),
                    "quantity": po_qty,
                    "unit_price": Decimal("8.50"),
                    "total_value": Decimal("8.50") * po_qty,
                    "currency": usd,
                    "delivery_mode": sea,
                    "status": "in_production",
                },
            )
            po.quantity = po_qty
            po.save(update_fields=["quantity"])

            shipment, _ = Shipment.objects.get_or_create(
                tenant=self.tenant, shipment_number=ship_no,
                defaults={
                    "purchase_order": po,
                    "factory": random.choice(factories),
                    "mode": "sea",
                    "etd": today + timedelta(days=5),
                    "eta": today + timedelta(days=35),
                },
            )
            shipment.status = ship_status
            shipment.quantity = ship_qty
            shipment.save(update_fields=["status", "quantity"])

            docket, _ = Docket.objects.get_or_create(
                tenant=self.tenant, docket_number=dk_no,
                defaults={"shipment": shipment, "date_raised": today - timedelta(days=2)},
            )
            docket.total_fabric_meters = meters
            docket.save(update_fields=["total_fabric_meters"])
            created += 1

        self.stdout.write(f"  Seeded {created} paperwork comparison scenarios (GC-022)")
        return created

    def _seed_dockets(self):
        """GC-020: dockets carrying contract price/fabric meters; one final
        docket demonstrates the over-200m unusable-fabric sales notification."""
        shipments = list(Shipment.objects.filter(tenant=self.tenant))
        if not shipments:
            self.stdout.write("  Skipped dockets (no shipments)")
            return 0

        docket_data = [
            ("DK-2025-001", 0, Decimal("950.00"), Decimal("40.00"), False),
            ("DK-2025-002", 1, Decimal("1500.00"), Decimal("80.00"), False),
            ("DK-2025-003", 2, Decimal("2100.00"), Decimal("265.00"), True),
            ("DK-2025-004", 3, Decimal("620.00"), Decimal("0.00"), False),
        ]
        created = 0
        for number, ship_idx, total_meters, unused_meters, is_final in docket_data:
            shipment = shipments[ship_idx % len(shipments)]
            Docket.objects.get_or_create(
                tenant=self.tenant, docket_number=number,
                defaults={
                    "shipment": shipment,
                    "contract_price": Decimal("8.50"),
                    "date_raised": self.today - timedelta(days=7),
                    "delivery_date": shipment.purchase_order.delivery_date,
                    "total_fabric_meters": total_meters,
                    "unused_fabric_meters": unused_meters,
                    "is_final": is_final,
                    "notes": (
                        "Excess fabric over 200m - sent to sales for direction"
                        if is_final and unused_meters > 200 else ""
                    ),
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} dockets")
        return created

    def _seed_final_hit_reconciliations(self):
        """GC-021: one final hit reconciliation per delivered hit. The first
        two demo the over-20-unit short debit rule; the next two are clean."""
        items = list(
            BookingScheduleItem.objects.filter(
                tenant=self.tenant, status="delivered", hit__isnull=False
            )
        )
        if not items:
            self.stdout.write("  Skipped final hit reconciliations (no delivered hits)")
            return 0

        user = self.tenant.created_by if hasattr(self.tenant, "created_by") else None
        created = 0
        for i, item in enumerate(items):
            shipment = item.shipment
            po = shipment.purchase_order
            docket_qty = po.quantity if po else shipment.quantity
            if i < 2:
                shipped_qty = docket_qty - Decimal("45.00")
                status_value = "debited"
                notes = "Shipped 45 units short of docket - debit raised per GC rule"
            elif i < 4:
                shipped_qty = docket_qty
                status_value = "reconciled"
                notes = "Shipped in line with docket - no shortage"
            else:
                shipped_qty = shipment.quantity
                status_value = "pending"
                notes = "Awaiting final hit reconciliation review"
            rec, _ = FinalHitReconciliation.objects.get_or_create(
                tenant=self.tenant,
                shipment=shipment,
                defaults={
                    "created_by": user,
                    "docket_quantity": docket_qty,
                    "shipped_quantity": shipped_qty,
                },
            )
            rec.schedule_item = item
            rec.docket_quantity = docket_qty
            rec.shipped_quantity = shipped_qty
            rec.status = status_value
            if status_value == "reconciled":
                rec.reconciled_at = self.now
                rec.reconciled_by = user
            rec.notes = notes
            rec.save()
            created += 1

        self.stdout.write(f"  Seeded {created} final hit reconciliations")
        return created

    def _seed_order_manager_demo(self):
        """RQ-028: deterministic demo rows for the Order Manager dashboard.

        One overdue open order with an overdue production job (risk/red) and
        one fully delivered order with an approved gold seal and a clean
        reconciliation (ok/green), so the daily critical-path review has both
        ends of the colour scale to display. Reuses the seeded base data so it
        never adds new styles/file openings.
        """
        buyer = Buyer.objects.filter(tenant=self.tenant).first()
        factory = Factory.objects.filter(tenant=self.tenant).first()
        currency = Currency.objects.filter(tenant=self.tenant).first()
        file_opening = FileOpening.objects.filter(tenant=self.tenant).first()
        if not (buyer and factory and currency and file_opening):
            self.stdout.write("  Skipped order manager demo (missing base data)")
            return 0

        today = self.today
        style = file_opening.style

        risk_po, _ = PurchaseOrder.objects.get_or_create(
            tenant=self.tenant, po_number="PO-DEMO-01",
            defaults={
                "file_opening": file_opening, "buyer": buyer, "factory": factory,
                "po_date": today - timedelta(days=60),
                "delivery_date": today - timedelta(days=30),
                "quantity": 1000, "unit_price": Decimal("10.00"),
                "total_value": Decimal("10000.00"), "currency": currency,
                "status": "open",
            },
        )
        JobRequest.objects.get_or_create(
            tenant=self.tenant, job_number="JOB-DEMO-01",
            defaults={
                "job_type": JobType.PATTERN, "style": style,
                "purchase_order": risk_po, "required_by_date": today - timedelta(days=10),
                "priority": JobPriority.HIGH, "status": JobStatus.PENDING,
            },
        )

        ok_po, _ = PurchaseOrder.objects.get_or_create(
            tenant=self.tenant, po_number="PO-DEMO-02",
            defaults={
                "file_opening": file_opening, "buyer": buyer, "factory": factory,
                "po_date": today - timedelta(days=45),
                "delivery_date": today + timedelta(days=60),
                "quantity": 1000, "unit_price": Decimal("10.00"),
                "total_value": Decimal("10000.00"), "currency": currency,
                "status": "delivered",
            },
        )
        shipment, _ = Shipment.objects.get_or_create(
            tenant=self.tenant, shipment_number="SHP-DEMO-01",
            defaults={
                "purchase_order": ok_po, "factory": factory, "status": "delivered",
                "mode": "sea", "quantity": Decimal("1000.00"),
            },
        )
        BookingScheduleItem.objects.get_or_create(
            tenant=self.tenant, shipment=shipment, week_ending=today + timedelta(days=56),
            hit=None,
            defaults={
                "status": "delivered", "cut_qty": Decimal("1000.00"),
                "garments_ready_qty": Decimal("1000.00"),
            },
        )
        GoldSeal.objects.get_or_create(
            tenant=self.tenant, shipment=shipment,
            defaults={"status": "approved", "approval_date": today - timedelta(days=20)},
        )
        rec, _ = FinalHitReconciliation.objects.get_or_create(
            tenant=self.tenant, shipment=shipment,
            defaults={
                "docket_quantity": Decimal("1000.00"), "shipped_quantity": Decimal("1000.00"),
                "status": "reconciled", "reconciled_at": self.now,
            },
        )
        if rec.status != "reconciled":
            rec.status = "reconciled"
            rec.reconciled_at = self.now
            rec.save(update_fields=["status", "reconciled_at"])

        created = PurchaseOrder.objects.filter(
            tenant=self.tenant, po_number__in=["PO-DEMO-01", "PO-DEMO-02"]
        ).count()
        self.stdout.write(f"  Seeded {created} order manager demo orders")
        return created

    # ── Commercial (LC, Bank, PI, SC) ────────────────────────────────────

    def _seed_banks(self):
        data = [
            ("SCBL", "Standard Chartered Bank", "SCBLUS33", "New York", "John Smith", "+1-212-555-0101", "john.smith@sc.com"),
            ("HSBC", "HSBC Holdings", "HSBCUS44", "London", "Sarah Lee", "+44-20-7991-0000", "sarah.lee@hsbc.com"),
            ("CITI", "Citibank NA", "CITIUS33", "New York", "Mike Brown", "+1-212-555-0202", "mike.brown@citi.com"),
            ("SONA", "Sonali Bank Ltd", "SONABDDH", "Motijheel, Dhaka", "Md. Akhter Hamid", "+880-2-955-0426", "info@sonalibankbd.com"),
            ("SBIN", "State Bank of India", "SBININBB", "Mumbai", "Raj Patel", "+91-22-2202-1111", "raj.patel@sbi.co.in"),
            ("PUBL", "Pubali Bank Ltd", "PUBLBDDH", "Dhaka", "Fazlur Rahman", "+880-2-955-9999", "fazlur@pubalibank.com"),
        ]
        created = 0
        for code, name, swift, address, contact, phone, email in data:
            Bank.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name, "swift_code": swift, "address": address,
                    "contact_person": contact, "phone": phone, "email": email,
                    "status": "active",
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} banks")
        return created

    def _seed_lcs(self):
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        banks = list(Bank.objects.filter(tenant=self.tenant))
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first()

        if not buyers or not pos:
            self.stdout.write("  Skipped LCs (no buyers or purchase orders)")
            return 0

        lc_data = [
            ("LC-2025-001", "master", 0, 0, Decimal("150000.00"), 45),
            ("LC-2025-002", "master", 1, 1, Decimal("200000.00"), 60),
            ("LC-2025-003", "b2b", 2, 2, Decimal("85000.00"), 10),
            ("LC-2025-004", "master", 3, 0, Decimal("300000.00"), 90),
            ("LC-2025-005", "b2b", 4, 1, Decimal("120000.00"), 120),
        ]
        created = 0
        for i, (lc_num, lc_type, buyer_idx, bank_idx, amount, days_to_expiry) in enumerate(lc_data):
            buyer = buyers[buyer_idx % len(buyers)]
            bank = banks[bank_idx % len(banks)] if banks else None
            po = pos[i % len(pos)] if pos else None
            status = "draft" if i < 2 else "received" if i < 3 else "accepted"
            parent_lc = None
            if lc_type == "b2b" and created > 0:
                parent = LC.objects.filter(tenant=self.tenant, lc_type="master").first()
                parent_lc = parent

            LC.objects.get_or_create(
                tenant=self.tenant, lc_number=lc_num,
                defaults={
                    "lc_type": lc_type, "buyer": buyer, "purchase_order": po,
                    "parent_lc": parent_lc, "bank": bank, "amount": amount,
                    "currency": usd, "issued_date": self.today,
                    "expiry_date": self.today + timedelta(days=days_to_expiry),
                    "status": status,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} LCs")
        return created

    def _seed_lc_amendments(self):
        lcs = list(LC.objects.filter(tenant=self.tenant))
        created = 0
        for i, lc in enumerate(lcs[:3]):
            changes = [
                (Decimal("15000.00"), None, None, "Buyer requested amount increase"),
                (None, self.today + timedelta(days=60), None, "Extended expiry date"),
                (Decimal("-5000.00"), None, 500, "Reduced quantity per buyer request"),
            ]
            amount_change, expiry_change, qty_change, reason = changes[i % len(changes)]
            amendment, _ = LCAmendment.objects.get_or_create(
                tenant=self.tenant, lc=lc, amendment_number=i + 1,
                defaults={
                    "amount_change": amount_change,
                    "expiry_date_change": expiry_change,
                    "quantity_change": qty_change,
                    "reason": reason,
                    "status": "approved" if i > 0 else "pending",
                },
            )
            created += 1
        if created:
            self.stdout.write(f"  Seeded {created} LC amendments")
        return created

    def _seed_proforma_invoices(self):
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        lcs = list(LC.objects.filter(tenant=self.tenant))

        if not pos or not buyers:
            self.stdout.write("  Skipped proforma invoices (no purchase orders or buyers)")
            return 0

        pi_data = [
            ("PI-2025-001", 0, 0, Decimal("45000.00"), "sent"),
            ("PI-2025-002", 1, 1, Decimal("78000.00"), "accepted"),
            ("PI-2025-003", 2, 2, Decimal("32000.00"), "draft"),
            ("PI-2025-004", 3, 3, Decimal("125000.00"), "sent"),
            ("PI-2025-005", 4, 4, Decimal("56000.00"), "accepted"),
        ]
        created = 0
        for pi_num, po_idx, buyer_idx, amount, status in pi_data:
            po = pos[po_idx % len(pos)]
            buyer = buyers[buyer_idx % len(buyers)]
            lc = lcs[po_idx % len(lcs)] if lcs else None
            ProformaInvoice.objects.get_or_create(
                tenant=self.tenant, pi_number=pi_num,
                defaults={
                    "purchase_order": po, "buyer": buyer, "lc": lc,
                    "amount": amount, "currency": "USD",
                    "validity_date": self.today + timedelta(days=30),
                    "status": status,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} proforma invoices")
        return created

    def _seed_sales_contracts(self):
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        buyers = list(Buyer.objects.filter(tenant=self.tenant))
        tt30 = PaymentTerms.objects.filter(tenant=self.tenant, code="TT30").first()

        if not pos or not buyers:
            self.stdout.write("  Skipped sales contracts (no purchase orders or buyers)")
            return 0

        sc_data = [
            ("SC-2025-001", 0, 0, Decimal("45000.00"), "active", "FOB Chattogram"),
            ("SC-2025-002", 1, 1, Decimal("78000.00"), "active", "CIF Felixstowe"),
            ("SC-2025-003", 2, 2, Decimal("32000.00"), "draft", "FOB Chattogram"),
        ]
        created = 0
        for sc_num, po_idx, buyer_idx, amount, status, delivery_terms in sc_data:
            po = pos[po_idx % len(pos)]
            buyer = buyers[buyer_idx % len(buyers)]
            SalesContract.objects.get_or_create(
                tenant=self.tenant, contract_number=sc_num,
                defaults={
                    "purchase_order": po, "buyer": buyer,
                    "total_amount": amount, "currency": "USD",
                    "payment_terms": tt30,
                    "delivery_terms": delivery_terms,
                    "status": status,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} sales contracts")
        return created

    def _seed_sales_confirmations(self):
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        buyers = list(Buyer.objects.filter(tenant=self.tenant))

        if not pos or not buyers:
            self.stdout.write("  Skipped sales confirmations (no purchase orders or buyers)")
            return 0

        conf_data = [
            ("SCF-2025-001", 0, 0, "sent", False, self.now - timedelta(hours=10)),
            ("SCF-2025-002", 1, 1, "sent", False, self.now - timedelta(hours=72)),
            ("SCF-2025-003", 2, 2, "disputed", False, self.now - timedelta(hours=5)),
            ("SCF-2025-004", 3, 3, "accepted", True, self.now - timedelta(hours=60)),
            ("SCF-2025-005", 4, 4, "draft", False, None),
        ]
        created = 0
        for num, po_idx, buyer_idx, status, auto_accepted, sent_at in conf_data:
            po = pos[po_idx % len(pos)]
            buyer = buyers[buyer_idx % len(buyers)]
            defaults = {
                "purchase_order": po, "buyer": buyer,
                "status": status, "auto_accepted": auto_accepted,
            }
            if sent_at is not None:
                defaults["sent_at"] = sent_at
                if status == "accepted":
                    defaults["accepted_at"] = sent_at + timedelta(hours=50)
                elif status == "disputed":
                    defaults["disputed_at"] = sent_at + timedelta(hours=3)
                    defaults["dispute_reason"] = "Fabric composition differs from agreed spec"
            SalesConfirmation.objects.get_or_create(
                tenant=self.tenant, confirmation_number=num, defaults=defaults,
            )
            created += 1
        self.stdout.write(f"  Seeded {created} sales confirmations")
        return created

    def _seed_debit_notes(self):
        """GC-023: debit-note lifecycle demo — pro forma, issued, paid, plus a
        final-hit shortage debit linked to a >20-unit-short reconciliation."""
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        currencies = list(Currency.objects.filter(tenant=self.tenant))
        if not pos or not currencies:
            self.stdout.write("  Skipped debit notes (no purchase orders or currencies)")
            return 0

        from django.contrib.auth import get_user_model

        User = get_user_model()
        raiser = User.objects.filter(tenant=self.tenant, status="active").first()
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first() or currencies[0]

        # Final-hit shortage debit candidate: a reconciliation needing a debit
        # (RQ-027: anything over 20 units short must be debited unless reasons
        # evident). First one wins, else we fall back to the first PO.
        recon = next(
            (r for r in FinalHitReconciliation.objects.filter(tenant=self.tenant)
             if r.requires_debit),
            None,
        )
        shortage_po = recon.shipment.purchase_order if recon else pos[0]

        today = self.now
        dn_data = [
            {
                "debit_number": "DN-2025-001",
                "po_idx": 0, "debit_type": "fabric_over_tolerance",
                "party_type": "factory", "amount": Decimal("425.00"),
                "tolerance_pct": Decimal("2.00"), "shortage_units": Decimal("0.00"),
                "status": "pro_forma",
                "reason": "Fabric shipped 8% over the 2% Primark/Penney tolerance",
            },
            {
                "debit_number": "DN-2025-002",
                "po_idx": 1, "debit_type": "fabric_shortage",
                "party_type": "fabric_supplier", "amount": Decimal("1200.00"),
                "tolerance_pct": Decimal("5.00"), "shortage_units": Decimal("0.00"),
                "status": "issued",
                "reason": "Fabric shortfall of 120 kg confirmed on delivery",
                "issued_at": today - timedelta(days=3),
            },
            {
                "debit_number": "DN-2025-003",
                "po_idx": 2, "debit_type": "trims_shortage",
                "party_type": "trim_supplier", "amount": Decimal("310.50"),
                "tolerance_pct": Decimal("5.00"), "shortage_units": Decimal("0.00"),
                "status": "paid",
                "reason": "Button shortage of 1,250 pcs confirmed",
                "issued_at": today - timedelta(days=20),
                "paid_at": today - timedelta(days=5),
            },
        ]
        created = 0
        for row in dn_data:
            po = pos[row.pop("po_idx") % len(pos)]
            defaults = {
                "purchase_order": po,
                "amount": row["amount"],
                "currency": usd,
                "reason": row["reason"],
                "raised_by": raiser,
            }
            if row["status"] == "issued":
                defaults["compliance_email_sent"] = True
                defaults["email_sent_at"] = row["issued_at"]
            elif row["status"] == "paid":
                defaults["compliance_email_sent"] = True
                defaults["email_sent_at"] = row["issued_at"]
            dn, _ = DebitNote.objects.get_or_create(
                tenant=self.tenant, debit_number=row["debit_number"],
                defaults=defaults,
            )
            # keep lifecycle state deterministic on re-runs
            dn.debit_type = row["debit_type"]
            dn.party_type = row["party_type"]
            dn.tolerance_pct = row["tolerance_pct"]
            dn.shortage_units = row["shortage_units"]
            dn.status = row["status"]
            if row.get("issued_at"):
                dn.issued_at = row["issued_at"]
            if row.get("paid_at"):
                dn.paid_at = row["paid_at"]
            if row["status"] in ("issued", "paid"):
                dn.compliance_email_sent = True
            dn.save()
            created += 1

        # RQ-027 link: a final-hit shortage debit raised from the reconciliation
        dn_recon, _ = DebitNote.objects.get_or_create(
            tenant=self.tenant, debit_number="DN-2025-004",
            defaults={
                "purchase_order": shortage_po,
                "reconciliation": recon,
                "debit_type": "final_hit_shortage",
                "party_type": "factory",
                "debited_party": shortage_po.factory.name if shortage_po.factory_id else "",
                "amount": (recon.shortage_units * Decimal("8.50")) if recon else Decimal("300.00"),
                "currency": usd,
                "shortage_units": recon.shortage_units if recon else Decimal("40.00"),
                "tolerance_pct": Decimal("5.00"),
                "status": "pro_forma",
                "reason": (
                    f"Final hit shortage of {recon.shortage_units} units (>20) "
                    "raised as soon as the issue was confirmed"
                ),
                "raised_by": raiser,
            },
        )
        if recon:
            dn_recon.reconciliation = recon
            dn_recon.shortage_units = recon.shortage_units
            dn_recon.amount = recon.shortage_units * Decimal("8.50")
            dn_recon.debited_party = shortage_po.factory.name if shortage_po.factory_id else ""
            dn_recon.save()
        created += 1

        self.stdout.write(f"  Seeded {created} debit notes (GC-023)")
        return created

    def _seed_invoice_approvals(self):
        """RQ-035 (GC-024): invoice approval demo — matching, mismatched,
        over-tolerance (with a linked GC-023 debit), and an approved invoice."""
        pos = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        currencies = list(Currency.objects.filter(tenant=self.tenant))
        if not pos or not currencies:
            self.stdout.write("  Skipped invoice approvals (no purchase orders or currencies)")
            return 0

        from django.contrib.auth import get_user_model

        User = get_user_model()
        reviewer = User.objects.filter(tenant=self.tenant, status="active").first()
        usd = Currency.objects.filter(tenant=self.tenant, code="USD").first() or currencies[0]
        po = pos[0]
        qty = Decimal(po.quantity)
        price = Decimal(po.unit_price)
        delivery = po.delivery_date or self.today

        over_qty = (qty * Decimal("1.10")).quantize(Decimal("0.01"))
        over_amount = (over_qty * price).quantize(Decimal("0.01"))

        ia_data = [
            {
                "invoice_number": "IA-2025-001", "invoice_type": "fabric",
                "status": "pending", "quantity": qty, "unit_price": price,
                "amount": (qty * price).quantize(Decimal("0.01")),
                "invoice_date": delivery,
            },
            {
                "invoice_number": "IA-2025-002", "invoice_type": "trimmings",
                "status": "pending", "quantity": qty,
                "unit_price": price + Decimal("1.00"),
                "amount": (qty * (price + Decimal("1.00"))).quantize(Decimal("0.01")),
                "invoice_date": delivery,
            },
            {
                "invoice_number": "IA-2025-003", "invoice_type": "fabric",
                "status": "pending", "quantity": over_qty, "unit_price": price,
                "amount": over_amount, "invoice_date": delivery,
            },
            {
                "invoice_number": "IA-2025-004", "invoice_type": "factory",
                "status": "approved", "quantity": qty, "unit_price": price,
                "amount": (qty * price).quantize(Decimal("0.01")),
                "invoice_date": delivery,
            },
        ]
        created = 0
        debit_link = DebitNote.objects.filter(
            tenant=self.tenant, debit_number="DN-2025-001"
        ).first()
        for row in ia_data:
            defaults = {
                "purchase_order": po,
                "currency": usd,
                "invoice_date": row["invoice_date"],
                "quantity": row["quantity"],
                "unit_price": row["unit_price"],
                "amount": row["amount"],
                "status": row["status"],
            }
            if row["status"] == "approved":
                defaults["approved_by"] = reviewer
                defaults["approved_at"] = self.now - timedelta(days=1)
            if row["invoice_number"] == "IA-2025-003" and debit_link:
                defaults["debit_note"] = debit_link
            inv, _ = InvoiceApproval.objects.get_or_create(
                tenant=self.tenant, invoice_number=row["invoice_number"],
                defaults=defaults,
            )
            # keep match state deterministic on re-runs
            inv.invoice_type = row["invoice_type"]
            inv.status = row["status"]
            inv.quantity = row["quantity"]
            inv.unit_price = row["unit_price"]
            inv.amount = row["amount"]
            inv.invoice_date = row["invoice_date"]
            if row["status"] == "approved":
                inv.approved_by = reviewer
                inv.approved_at = inv.approved_at or (self.now - timedelta(days=1))
            else:
                inv.approved_by = None
                inv.approved_at = None
                inv.rejected_by = None
                inv.rejected_at = None
            if row["invoice_number"] == "IA-2025-003":
                inv.debit_note = debit_link
            inv.save()
            created += 1

        self.stdout.write(f"  Seeded {created} invoice approvals (RQ-035)")
        return created

    # ── Fabric Management ────────────────────────────────────────────────

    def _seed_fabric_categories(self):
        data = [
            ("KNIT", "Knit Fabric", None, "Knitted fabrics"),
            ("WOVEN", "Woven Fabric", None, "Woven fabrics"),
            ("NONWOVEN", "Non-Woven Fabric", None, "Non-woven fabrics"),
            ("JERSEY", "Jersey", "KNIT", "Single/double jersey knit"),
            ("RIB", "Rib Knit", "KNIT", "Ribbed knit fabric"),
            ("INTERLOCK", "Interlock", "KNIT", "Interlock knit fabric"),
            ("POPLIN", "Poplin", "WOVEN", "Plain weave poplin"),
            ("TWILL", "Twill", "WOVEN", "Twill weave fabric"),
            ("DENIM", "Denim", "WOVEN", "Denim fabric"),
            ("OXFORD", "Oxford", "WOVEN", "Oxford weave fabric"),
            ("SATIN", "Satin", "WOVEN", "Satin weave fabric"),
            ("SPUNBOND", "Spunbond", "NONWOVEN", "Spunbond non-woven"),
        ]
        created = 0
        cat_map = {}
        for code, name, parent_code, desc in data:
            parent = cat_map.get(parent_code) if parent_code else None
            cat, _ = FabricCategory.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"name": name, "parent": parent, "description": desc},
            )
            cat_map[code] = cat
            created += 1
        self.stdout.write(f"  Seeded {created} fabric categories")
        return created

    def _seed_hts_codes(self):
        cat_map = {c.code: c for c in FabricCategory.objects.filter(tenant=self.tenant)}
        data = [
            ("6006.10", "Cotton knit fabrics", "JERSEY", "12.00"),
            ("6006.20", "Synthetic knit fabrics", "RIB", "14.50"),
            ("5209.42", "Denim fabrics of cotton", "DENIM", "8.50"),
            ("5210.11", "Plain weave cotton <200g/m2", "POPLIN", "10.00"),
            ("5407.10", "Woven nylon fabrics", "TWILL", "12.00"),
            ("5515.11", "Polyester woven fabrics", "OXFORD", "11.00"),
            ("5007.20", "Silk woven fabrics", "SATIN", "6.50"),
            ("5603.11", "Non-woven fabrics of man-made filaments", "SPUNBOND", "5.00"),
        ]
        created = 0
        for code, desc, cat_code, duty in data:
            cat = cat_map.get(cat_code) if cat_code else None
            HTSCode.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={"description": desc, "fabric_category": cat, "duty_rate": Decimal(duty)},
            )
            created += 1
        self.stdout.write(f"  Seeded {created} HTS codes")
        return created

    def _seed_fabric_suppliers(self):
        vendors = list(Vendor.objects.filter(tenant=self.tenant))
        countries = list(Country.objects.filter(tenant=self.tenant))
        data = [
            ("FS001", "Shanghai Textiles Co.", "Li Wei", "liwei@shanghaitex.com", "CHN", True, 30, 500),
            ("FS002", "Zhejiang Fabrics Ltd", "Zhang Min", "zhang@zjfabrics.com", "CHN", True, 25, 1000),
            ("FS003", "Guangzhou Mills Corp", "Chen Yu", "chen@gzmills.cn", "CHN", False, 40, 300),
            ("FS004", "Karachi Textile Mills", "Ahmed Khan", "ahmed@ktm.pk", "PAK", True, 20, 800),
            ("FS005", "Istanbul Fabric Co.", "Mehmet Yilmaz", "mehmet@istanbulfabric.com", "TUR", False, 35, 600),
            ("FS006", "Bangladesh Knit Composite", "Rafiq Hasan", "rafiq@bkcd.com", "BGD", True, 15, 2000),
            ("FS007", "Premium Cotton Supplies", "Sarah Connor", "sarah@pcs.com", "IND", False, 28, 400),
        ]
        country_map = {c.code: c for c in countries}
        created = 0
        for code, name, contact, email, country_code, is_mill, lead, moq in data:
            vendor = random.choice(vendors) if vendors and random.random() > 0.5 else None
            country = country_map.get(country_code)
            FabricSupplier.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name, "vendor": vendor, "contact_person": contact,
                    "email": email, "country": country, "is_mill": is_mill,
                    "lead_time_days": lead, "moq_meters": Decimal(str(moq)),
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} fabric suppliers")
        return created

    def _seed_fabric_mills(self):
        countries = list(Country.objects.filter(tenant=self.tenant))
        country_map = {c.code: c for c in countries}
        data = [
            ("M001", "Yangtze River Mills", "CHN", "Shanghai", 200000, "4.50", "OEKO-TEX, GOTS"),
            ("M002", "Pearl River Textiles", "CHN", "Guangzhou", 150000, "4.20", "OEKO-TEX"),
            ("M003", "Indus Valley Mills", "PAK", "Karachi", 120000, "3.80", "GOTS"),
            ("M004", "Anatolia Textile Corp", "TUR", "Istanbul", 180000, "4.60", "OEKO-TEX, GOTS, BSCI"),
            ("M005", "Bengal Fibre Mills", "BGD", "Dhaka", 90000, "3.90", "BSCI"),
            ("M006", "Gujarat Spinning Co", "IND", "Ahmedabad", 250000, "4.30", "OEKO-TEX"),
        ]
        created = 0
        for code, name, country_code, city, cap, rating, cert in data:
            FabricMill.objects.get_or_create(
                tenant=self.tenant, code=code,
                defaults={
                    "name": name, "country": country_map.get(country_code),
                    "city": city, "capacity_meters_month": cap,
                    "rating": Decimal(rating), "certification": cert,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} fabric mills")
        return created

    def _seed_rfqs(self):
        suppliers = list(FabricSupplier.objects.filter(tenant=self.tenant))
        categories = list(FabricCategory.objects.filter(tenant=self.tenant))
        statuses = ["draft", "sent", "responded", "closed"]
        rfq_data = [
            ("RFQ-2025-0001", 0, 0, "Q1 knit fabric requirement"),
            ("RFQ-2025-0002", 1, 2, "Denim for fall collection"),
            ("RFQ-2025-0003", 2, 1, "Poplin for spring line"),
            ("RFQ-2025-0004", 3, 3, "Twill fabric for workwear"),
            ("RFQ-2025-0005", 0, 0, "Satin for evening wear"),
        ]
        created = 0
        for rfq_num, supplier_idx, status_idx, notes in rfq_data:
            supplier = suppliers[supplier_idx % len(suppliers)] if suppliers else None
            if not supplier:
                continue
            rfq, _ = RFQ.objects.get_or_create(
                tenant=self.tenant, rfq_number=rfq_num,
                defaults={
                    "supplier": supplier,
                    "status": statuses[status_idx % len(statuses)],
                    "notes": notes,
                },
            )
            # Create 2-3 line items per RFQ
            for _ in range(random.randint(2, 3)):
                qty = random.randint(500, 5000)
                target = Decimal(str(round(random.uniform(2.00, 8.00), 2)))
                cat = random.choice(categories) if categories else None
                RFQLineItem.objects.get_or_create(
                    tenant=self.tenant, rfq=rfq,
                    fabric_category=cat, quantity_meters=qty,
                    defaults={"target_price": target},
                )
            created += 1
        self.stdout.write(f"  Seeded {created} RFQs with line items")
        return created

    def _seed_fabric_rfq_responses(self):
        rfqs = RFQ.objects.filter(tenant=self.tenant)
        suppliers = list(FabricSupplier.objects.filter(tenant=self.tenant))
        today = self.today
        created = 0
        for rfq in rfqs:
            if rfq.status not in ("sent", "responded"):
                continue
            # 1-2 responses per RFQ
            suppliers_to_use = random.sample(
                suppliers, min(random.randint(1, 2), len(suppliers))
            )
            for supplier in suppliers_to_use:
                resp, resp_created = RFQResponse.objects.get_or_create(
                    tenant=self.tenant, rfq=rfq, supplier=supplier,
                    defaults={
                        "valid_until": today + timedelta(days=random.randint(30, 60)),
                        "notes": f"Quote from {supplier.name}",
                    },
                )
                if not resp_created:
                    continue
                # Quote for each line item
                for line in RFQLineItem.objects.filter(rfq=rfq):
                    base_price = float(line.target_price or Decimal("3.00"))
                    variation = Decimal(str(round(random.uniform(-0.50, 0.50), 2)))
                    quoted = max(Decimal("0.50"), Decimal(str(base_price)) + variation)
                    RFQResponseItem.objects.get_or_create(
                        tenant=self.tenant, response=resp, line_item=line,
                        defaults={
                            "quoted_price": quoted,
                            "available_qty_meters": line.quantity_meters + random.randint(-200, 500),
                            "lead_days": random.randint(20, 45),
                        },
                    )
                created += 1
        self.stdout.write(f"  Seeded {created} RFQ responses with line item quotes")
        return created

    def _seed_fabric_bookings(self):
        suppliers = list(FabricSupplier.objects.filter(tenant=self.tenant))
        categories = list(FabricCategory.objects.filter(tenant=self.tenant))
        countries = list(Country.objects.filter(tenant=self.tenant))
        statuses = ["pending", "booked", "confirmed", "in_transit", "delivered"]
        today = self.today
        booking_data = [
            ("BK-2025-001", 0, 0, 5000, 2, "Regular knit order"),
            ("BK-2025-002", 1, 2, 10000, 0, "Bulk denim order"),
            ("BK-2025-003", 2, 1, 3000, 3, "Poplin for trial"),
            ("BK-2025-004", 3, 4, 8000, 1, "Twill order confirmed"),
            ("BK-2025-005", 0, 0, 2000, 4, "Express satin delivery"),
        ]
        created = 0
        for bk_num, s_idx, c_idx, qty, status_idx, notes in booking_data:
            supplier = suppliers[s_idx % len(suppliers)] if suppliers else None
            cat = categories[c_idx % len(categories)] if categories else None
            country = random.choice(countries) if countries else None
            if not supplier:
                continue
            status = statuses[status_idx % len(statuses)]
            expected = today + timedelta(days=random.randint(15, 60))
            actual = expected + timedelta(days=random.randint(-3, 5)) if status in ("delivered", "in_transit") else None
            FabricBooking.objects.get_or_create(
                tenant=self.tenant, booking_number=bk_num,
                defaults={
                    "supplier": supplier, "fabric_category": cat,
                    "quantity_meters": qty, "status": status,
                    "origin_country": country, "expected_delivery": expected,
                    "actual_delivery": actual, "notes": notes,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} fabric bookings")
        return created

    def _seed_fabric_orders(self):
        suppliers = list(FabricSupplier.objects.filter(tenant=self.tenant))
        categories = list(FabricCategory.objects.filter(tenant=self.tenant))
        today = self.today
        order_data = [
            ("FO-2026-1001", 0, 0, "5000.00", "2.50", "draft", None),
            ("FO-2026-1002", 1, 2, "10000.00", "3.20", "bulk_approved", today - timedelta(days=5)),
            ("FO-2026-1003", 2, 1, "3000.00", "4.00", "delivered", today - timedelta(days=20)),
        ]
        created = 0
        for onum, s_idx, c_idx, qty, price, status, lab_dip_approved in order_data:
            supplier = suppliers[s_idx % len(suppliers)] if suppliers else None
            cat = categories[c_idx % len(categories)] if categories else None
            if not supplier:
                continue
            qty_d = Decimal(qty)
            price_d = Decimal(price)
            FabricOrder.objects.get_or_create(
                tenant=self.tenant, order_number=onum,
                defaults={
                    "supplier": supplier, "fabric_category": cat,
                    "quantity_meters": qty_d, "unit_price": price_d,
                    "total_price": qty_d * price_d, "status": status,
                    "lab_dip_approval_date": lab_dip_approved,
                    "bulk_approved_date": lab_dip_approved,
                    "onboard_date": today - timedelta(days=10),
                    "eta_date": today + timedelta(days=14),
                    "clearance_date": today + timedelta(days=20),
                    "notes": f"Sample order: {qty}m of {cat.name if cat else 'fabric'}",
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} fabric orders")
        return created

    def _seed_fabric_risk_data(self):
        from apps.fabric.models import FabricOrder

        orders = list(FabricOrder.objects.filter(tenant=self.tenant))
        if not orders:
            self.stdout.write("  Skipped fabric risk data (no fabric orders)")
            return 0
        for order in orders:
            if order.status == "draft":
                order.risk_level = RiskLevel.objects.filter(
                    tenant=self.tenant, code="none"
                ).first()
                order.save(update_fields=["risk_level", "updated_at"])
            elif order.status == "bulk_approved":
                order.risk_level = RiskLevel.objects.filter(
                    tenant=self.tenant, code="red"
                ).first()
                order.risk_notes = "Mill production delayed - onboard date at risk"
                order.save(update_fields=["risk_level", "risk_notes", "updated_at"])
            else:
                order.apply_risk_policy()
        self.stdout.write("  Seeded fabric risk levels (amber->red override, delivered green)")
        return 2

    def _seed_fabric_schedule_data(self):
        from apps.fabric.models import FabricOrder

        orders = list(FabricOrder.objects.filter(tenant=self.tenant))
        if not orders:
            self.stdout.write("  Skipped fabric schedule data (no fabric orders)")
            return 0
        users = self._get_users()
        seed_user = users.first()
        created = 0
        for order in orders:
            if order.schedule_handoffs.exists() or order.status == "draft":
                continue
            for key in ("onboard", "eta"):
                order.schedule_handoff(
                    key, "sales", "merchandising",
                    by_user=seed_user, trigger="dip_approved",
                )
                order.schedule_handoff(
                    key, "merchandising", "planning",
                    by_user=seed_user, trigger="bulk_approved",
                )
            order.schedule_handoff(
                "lab_dip", "sales", "merchandising",
                by_user=seed_user, trigger="bulk_approved",
            )
            created += 5
        self.stdout.write(
            f"  Seeded {created} fabric schedule handoffs "
            "(sales->merch->planning; clearance=logistics)"
        )
        return created

    def _seed_fabric_utilization_data(self):
        from apps.fabric.models import FabricOrder, FabricUtilization

        orders = list(FabricOrder.objects.filter(tenant=self.tenant))
        if not orders:
            self.stdout.write("  Skipped fabric utilization data (no fabric orders)")
            return 0
        today = self.today
        current = today.strftime("%Y-%m")
        previous = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        users = self._get_users()
        seed_user = users.first()
        # Docket-stage utilization: received (actual rating) vs ordered (final
        # rating), with used/wasted/damaged split to surface excess fabric.
        by_number = {o.order_number: o for o in orders}
        records = [
            ("FO-2026-1002", previous, "10150", "9900", "150", "60",
             "Final rating vs actual rating - docket reconciliation"),
            ("FO-2026-1003", current, "3100", "2950", "100", "25",
             "Excess fabric identified at docket stage"),
        ]
        created = 0
        for onum, period, received, used, wasted, damaged, notes in records:
            order = by_number.get(onum)
            if not order:
                continue
            _, was_created = FabricUtilization.objects.get_or_create(
                tenant=self.tenant, order=order, period=period,
                defaults={
                    "received_meters": Decimal(received),
                    "used_meters": Decimal(used),
                    "wasted_meters": Decimal(wasted),
                    "damaged_meters": Decimal(damaged),
                    "notes": notes,
                    "recorded_by": seed_user,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(
            f"  Seeded {created} fabric utilization records "
            "(docket stage: final vs actual rating)"
        )
        return created

    def _seed_boms(self):
        styles = list(Style.objects.filter(tenant=self.tenant))
        uoms = list(UOM.objects.filter(tenant=self.tenant))
        vendors = list(Vendor.objects.filter(tenant=self.tenant))
        today = self.today

        if not styles or not uoms:
            self.stdout.write("  Skipped BOMs (no styles or UOMs)")
            return 0

        bom_count = 0
        for style in styles:
            sv, _ = StyleVersion.objects.get_or_create(
                tenant=self.tenant, style=style, version_number=1,
                defaults={"revision_notes": "Initial version", "status": "active"},
            )

            bom, _ = BOM.objects.get_or_create(
                tenant=self.tenant, style_version=sv, version=1,
                defaults={"name": f"BOM - {style.style_number}", "status": "active"},
            )

            bom_items_data = [
                ("Fabric", "Cotton Jersey 180gsm", uoms[0] if uoms else None, Decimal("0.18"), Decimal("5.0"), Decimal("3.50"), None, None, None, None, None, None, TrimStatus.TBC),
                ("Trim", "Woven Neck Label", uoms[1] if len(uoms) > 1 else None, Decimal("1.0"), Decimal("2.0"), Decimal("0.08"), vendors[0] if vendors else None, Decimal("5000"), Decimal("2000"), today + timedelta(days=14), today - timedelta(days=1), today - timedelta(days=1), TrimStatus.ORDERED),
                ("Trim", "Care Label", uoms[1] if len(uoms) > 1 else None, Decimal("1.0"), Decimal("1.0"), Decimal("0.05"), vendors[1] if len(vendors) > 1 else None, Decimal("10000"), Decimal("7500"), today + timedelta(days=7), today - timedelta(days=5), None, TrimStatus.PARTIAL),
                ("Trim", "Hang Tag", uoms[1] if len(uoms) > 1 else None, Decimal("1.0"), Decimal("1.5"), Decimal("0.12"), vendors[2] if len(vendors) > 2 else None, Decimal("8000"), Decimal("8000"), today - timedelta(days=3), today - timedelta(days=10), today - timedelta(days=2), TrimStatus.COMPLETED),
                ("Packing", "Poly Bag", uoms[1] if len(uoms) > 1 else None, Decimal("1.0"), Decimal("1.0"), Decimal("0.02"), None, None, None, None, None, None, TrimStatus.TBC),
            ]

            for cat, item_name, uom, consumption, waste, up, vendor, oqty, dqty, eta, confirmed, actual, status in bom_items_data:
                BOMItem.objects.get_or_create(
                    tenant=self.tenant, bom=bom, item_name=item_name,
                    defaults={
                        "category": cat,
                        "description": f"{item_name} specification",
                        "uom": uom,
                        "consumption": consumption,
                        "waste_percent": waste,
                        "unit_price": up,
                        "vendor": vendor,
                        "supplier": vendor,
                        "ordered_qty": oqty,
                        "delivered_qty": dqty,
                        "eta_date": eta,
                        "confirmed_date": confirmed,
                        "actual_date": actual,
                        "status": status,
                    },
                )
                bom_count += 1

        self.stdout.write(f"  Seeded {bom_count} BOM items (including trim schedule)")
        return bom_count

    def _seed_hits(self):
        purchase_orders = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        factories = list(Factory.objects.filter(tenant=self.tenant))

        if not purchase_orders:
            self.stdout.write("  Skipped hits (no purchase orders)")
            return 0

        hit_count = 0
        for i, po in enumerate(purchase_orders):
            colour_ids = list(
                PurchaseOrderItem.objects.filter(
                    tenant=self.tenant, purchase_order=po
                )
                .values_list("color_id", flat=True)
                .distinct()
            )
            if not colour_ids:
                colour = ColorCode.objects.filter(tenant=self.tenant).first()
                if colour is None:
                    colour = ColorCode.objects.create(
                        tenant=self.tenant, code="COL-01", name="COL-01",
                        hex_code="#CCCCCC",
                    )
                colour_ids = [colour.id]
            for colour_id in colour_ids:
                idx = hit_count
                delivery_mode = HitDeliveryMode.HANGING if idx % 2 else HitDeliveryMode.BOXED
                delivery_type = HitDeliveryType.AIR if idx % 3 == 2 else HitDeliveryType.SEA
                factory_override = factories[idx % len(factories)] if factories else None
                original_delivery_date = po.delivery_date
                actual_delivery_date = (
                    original_delivery_date - timedelta(days=5)
                    if original_delivery_date and idx % 2 else None
                )
                hit, _ = Hit.objects.get_or_create(
                    tenant=self.tenant, purchase_order=po, colour_id=colour_id,
                    defaults={
                        "hit_number": f"HIT-{1001 + idx:04d}",
                        "delivery_mode": delivery_mode,
                        "delivery_type": delivery_type,
                        "factory_override": factory_override,
                        "original_delivery_date": original_delivery_date,
                        "actual_delivery_date": actual_delivery_date,
                    },
                )
                hit_count += 1

        self.stdout.write(f"  Seeded {hit_count} hits (breakdown management)")
        return hit_count

    def _seed_fit_specs(self):
        purchase_orders = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        if not purchase_orders:
            self.stdout.write("  Skipped fit specs (no purchase orders)")
            return 0

        spec_count = 0
        for i, po in enumerate(purchase_orders):
            if i % 2 == 1:
                stages = [
                    (FitStage.DEV, True, {"chest": "52cm", "length": "70cm", "waist": "40cm"}),
                    (FitStage.FIRST, False, {"chest": "51cm", "length": "69cm", "waist": "39cm"}),
                ]
            else:
                stages = [
                    (FitStage.DEV, True, {"chest": "54cm", "shoulder": "44cm", "sleeve": "62cm"}),
                    (FitStage.SECOND, False, {"chest": "53cm", "shoulder": "44cm", "sleeve": "61cm"}),
                    (FitStage.THIRD, False, {"chest": "53.5cm", "shoulder": "44cm", "sleeve": "61.5cm"}),
                ]
            for version, (stage, is_current, measurements) in enumerate(stages, start=1):
                FitSpec.objects.get_or_create(
                    tenant=self.tenant, purchase_order=po, fit_stage=stage, version=version,
                    defaults={
                        "measurements": measurements,
                        "is_current": is_current,
                        "notes": f"{po.po_number} {stage} fit measurement sheet",
                    },
                )
                spec_count += 1

        self.stdout.write(f"  Seeded {spec_count} fit specs (fit specification system)")
        return spec_count

    def _seed_jobs(self):
        styles = list(Style.objects.filter(tenant=self.tenant))
        purchase_orders = list(PurchaseOrder.objects.filter(tenant=self.tenant))
        users = list(self._get_users())

        if not styles:
            self.stdout.write("  Skipped job requests (no styles)")
            return 0

        job_types = [JobType.PATTERN, JobType.SAMPLE, JobType.THREE_D, JobType.MINI_MARKER]
        statuses = [JobStatus.PENDING, JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CANCELLED]
        priorities = [JobPriority.LOW, JobPriority.NORMAL, JobPriority.HIGH, JobPriority.URGENT]
        work_locations = ["Pattern Room 1", "Pattern Room 2", "Sample Room", "3D Design Studio", "Marker Room"]

        job_count = 0
        for i, style in enumerate(styles):
            for j in range(2):
                job_type = job_types[(i + j) % len(job_types)]
                job, _ = JobRequest.objects.get_or_create(
                    tenant=self.tenant, job_number=f"JOB-{1001 + job_count:04d}",
                    defaults={
                        "job_type": job_type,
                        "style": style,
                        "purchase_order": purchase_orders[(i + j) % len(purchase_orders)] if purchase_orders else None,
                        "description": f"{job_type} job for {style.style_number}",
                        "work_location": work_locations[(i + j) % len(work_locations)],
                        "assigned_to": users[(i + j) % len(users)] if users else None,
                        "required_by_date": self.today + timedelta(days=(j * 7) + 5),
                        "priority": priorities[(i + j) % len(priorities)],
                        "status": statuses[(i + j) % len(statuses)],
                        "notes": "Cross-department job queue demo entry" if j == 0 else "",
                    },
                )
                job_count += 1

        self.stdout.write(f"  Seeded {job_count} job requests (cross-department queue)")
        return job_count

    def _seed_unsold_analysis_data(self):
        styles = list(Style.objects.filter(tenant=self.tenant))
        users = list(self._get_users())

        if not styles:
            self.stdout.write("  Skipped unsold analysis (no styles)")
            return 0

        opened_style_ids = set(
            FileOpening.objects.filter(tenant=self.tenant).values_list("style_id", flat=True)
        )
        created = 0
        for i, style in enumerate(styles):
            job_number = f"JOB-9{i + 1:04d}"
            job, created_flag = JobRequest.objects.get_or_create(
                tenant=self.tenant, job_number=job_number,
                defaults={
                    "job_type": JobType.SAMPLE,
                    "style": style,
                    "description": f"Unsold analysis sample for {style.style_number}",
                    "work_location": "Sample Room",
                    "assigned_to": users[i % len(users)] if users else None,
                    "required_by_date": self.today - timedelta(days=((i * 3) % 60) + 5),
                    "priority": JobPriority.NORMAL,
                    "status": JobStatus.COMPLETED,
                    "notes": "Completed sample (unsold analysis demo)" if style.id in opened_style_ids else "Completed sample (no file opening yet)",
                },
            )
            if created_flag:
                created += 1
                JobRequest.objects.filter(pk=job.pk).update(
                    created_at=self.now - timedelta(days=((i * 3) % 60) + 5)
                )

        self.stdout.write(
            f"  Seeded {created} completed sample jobs for unsold analysis "
            f"({len(opened_style_ids)} styles with file openings)"
        )
        return created

    def _seed_booking_schedule(self):
        shipments = list(Shipment.objects.filter(tenant=self.tenant))
        hits = list(Hit.objects.filter(tenant=self.tenant))
        risk_levels = list(RiskLevel.objects.filter(tenant=self.tenant))

        if not shipments:
            self.stdout.write("  Skipped booking schedule (no shipments)")
            return 0

        statuses = ["live", "in_work", "delivered"]
        item_count = 0
        for i, shipment in enumerate(shipments):
            week_offset = i % 4
            for week in range(3):
                status_value = statuses[(i + week) % len(statuses)]
                shipment_hits = [h for h in hits if h.purchase_order_id == shipment.purchase_order_id]
                hit = shipment_hits[i % len(shipment_hits)] if shipment_hits else None
                cut_qty = Decimal(str(random.randint(400, 2000)))
                if status_value == "delivered":
                    garments_ready = cut_qty
                elif status_value == "in_work":
                    garments_ready = cut_qty * Decimal("0.6")
                else:
                    garments_ready = Decimal("0")
                item, _ = BookingScheduleItem.objects.get_or_create(
                    tenant=self.tenant,
                    shipment=shipment,
                    week_ending=self.today + timedelta(days=(7 * (week + week_offset)) + (4 - self.today.weekday())),
                    hit=hit,
                    defaults={
                        "status": status_value,
                        "cut_qty": cut_qty,
                        "garments_ready_qty": garments_ready,
                        "ex_factory_date": self.today + timedelta(days=(7 * (week + week_offset)) + 2),
                        "ex_factory_notes": "Confirmed by planning" if status_value in ["in_work", "delivered"] else "",
                        "risk_level": risk_levels[i % len(risk_levels)] if risk_levels else None,
                        "notes": "Weekly booking schedule entry",
                    },
                )
                item_count += 1

        self.stdout.write(f"  Seeded {item_count} booking schedule items (weekly schedule)")
        return item_count

    def _seed_gold_seals(self):
        shipments = list(Shipment.objects.filter(tenant=self.tenant))

        if not shipments:
            self.stdout.write("  Skipped gold seals (no shipments)")
            return 0

        statuses = ["pending", "sent", "approved", "rejected"]
        created = 0
        for i, shipment in enumerate(shipments):
            status_value = statuses[i % len(statuses)]
            sent_date = self.today - timedelta(days=(i % 4) + 2)
            defaults = {
                "status": status_value,
                "notes": "Customer technical gold seal sample" if i % 2 == 0 else "Gold seal re-send",
            }
            if status_value in ("sent", "approved", "rejected"):
                defaults["sent_date"] = sent_date
            if status_value in ("approved", "rejected"):
                defaults["approval_date"] = sent_date + timedelta(days=3)
            _, created_flag = GoldSeal.objects.get_or_create(
                tenant=self.tenant, shipment=shipment, status=status_value,
                defaults=defaults,
            )
            if created_flag:
                created += 1

        self.stdout.write(f"  Seeded {created} gold seals (customer technical sign-off)")
        return created

    def _seed_compliance_audits(self):
        pos = list(
            PurchaseOrder.objects.filter(tenant=self.tenant).exclude(status="cancelled")[:12]
        )

        if not pos:
            self.stdout.write("  Skipped compliance audits (no purchase orders)")
            return 0

        stored_keys = [
            "fabric_paperwork", "dockets", "fabric_utilisation", "factory_invoice",
            "fabric_rating", "recon_costed_vs_actual", "final_hits",
        ]
        pass_defaults = {f"{k}_status": "pass" for k in stored_keys}

        this_week = self.today - timedelta(days=self.today.weekday())

        # pass / fail / pending cycle across POs
        configs = ["pass", "pass", "fail", "pass", "pending", "fail", "pass", "fail"]
        created = 0

        for i, po in enumerate(pos):
            mode = "fail" if i < 2 else configs[i % len(configs)]
            defaults = dict(pass_defaults)
            if mode == "pending":
                defaults = {f"{k}_status": "na" for k in stored_keys}
                defaults["efficiency_rate"] = None
                defaults["notes"] = "Weekly compliance audit not yet performed."
            elif mode == "fail":
                defaults["fabric_paperwork_status"] = "fail"
                defaults["final_hits_status"] = "fail"
                defaults["efficiency_rate"] = Decimal("84.00")
                defaults["notes"] = "Fabric paperwork discrepancy and final hits shortage flagged."
            else:
                defaults["efficiency_rate"] = Decimal("90.25")
                defaults["notes"] = "All compliance items verified — order on track."

            _, created_flag = ComplianceAudit.objects.get_or_create(
                tenant=self.tenant, purchase_order=po, week_start=this_week,
                defaults=defaults,
            )
            if created_flag:
                created += 1

            if i < 2:
                # consecutive failing weeks to demonstrate the 3-warning policy
                for offset, note in [(7, "1st consecutive failing audit"), (14, "2nd consecutive failing audit")]:
                    failing = dict(pass_defaults)
                    failing["fabric_paperwork_status"] = "fail"
                    failing["final_hits_status"] = "fail"
                    failing["efficiency_rate"] = Decimal("83.00")
                    failing["notes"] = note
                    _, cf = ComplianceAudit.objects.get_or_create(
                        tenant=self.tenant, purchase_order=po,
                        week_start=this_week - timedelta(days=offset),
                        defaults=failing,
                    )
                    if cf:
                        created += 1

        self.stdout.write(
            f"  Seeded {created} compliance audits "
            "(weekly 8-item review, pass/fail/pending + 3-warning scenario)"
        )
        return created


    def _seed_design_images(self):
        styles = list(Style.objects.filter(tenant=self.tenant))

        if not styles:
            self.stdout.write("  Skipped design images (no styles)")
            return 0

        import io

        from django.core.files.base import ContentFile
        from PIL import Image

        role_plan = [
            ("main", "Front flat sketch", (30, 120, 180)),
            ("range", "Range plan photo", (180, 90, 30)),
            ("detail", "Back detail", (90, 150, 60)),
        ]
        created = 0
        for i, style in enumerate(styles):
            for idx, (role, caption, color) in enumerate(role_plan):
                shift = ((i * 40 + idx * 25) % 255)
                buf = io.BytesIO()
                Image.new("RGB", (160, 160), (color[0], (color[1] + shift) % 255, color[2])).save(buf, format="PNG")
                _, created_flag = DesignImage.objects.get_or_create(
                    tenant=self.tenant, style=style, role=role,
                    defaults={
                        "image": ContentFile(buf.getvalue(), name=f"design_{style.style_number}_{role}.png"),
                        "caption": caption,
                        "sort_order": idx,
                        "is_main": role == "main",
                    },
                )
                if created_flag:
                    created += 1

        self.stdout.write(f"  Seeded {created} design images (main/range/detail per style)")
        return created

    def _seed_saved_reports(self):
        reports_data = [
            ("Monthly Order Summary", "orders", "Monthly aggregation of all purchase orders by status"),
            ("Production Efficiency", "production", "Daily production efficiency and DHU report"),
            ("Shipment Tracker", "commercial", "All active shipments and their status"),
            ("Quality Dashboard", "quality", "Inspection pass/fail rates by factory"),
        ]
        created = 0
        user = self.tenant.created_by if hasattr(self.tenant, "created_by") else None
        for name, rtype, desc in reports_data:
            report, _ = SavedReport.objects.get_or_create(
                tenant=self.tenant, name=name,
                defaults={
                    "report_type": rtype,
                    "description": desc,
                    "config": {"filters": {}, "columns": []},
                    "created_by": user,
                },
            )
            created += 1
        self.stdout.write(f"  Seeded {created} saved reports")
        return created
