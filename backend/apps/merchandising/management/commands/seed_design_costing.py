"""
Seed 5 demo DesignCosting records, each connected to a design register style.

The style-level design costing is the source of truth for how much one garment
costs per Style. This command creates one ``DesignCosting`` per design-register
style (REG-1001..REG-1005), each with cost lines and exercising the
**per-piece price ladder** (selling price, customer discount %, origin/UK
overhead %, exchange rate) from the cost-report layout.

Design connection: styles are resolved by ``style_number`` (REG-1001..1005) so
costings attach to the records created by ``seed_design_register`` /
``seed_design_sheet_demo``. If the design register was not seeded, demo styles
are created (with a default buyer) so the command still works standalone.

Idempotent: costings are keyed by (tenant, style, version) and lines by
(tenant, costing, category, description); re-running updates in place.

Usage: ``python manage.py seed_design_costing [--tenant <slug>]``
"""
from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.merchandising.models import DesignCosting, DesignCostingLine, Style
from apps.setup.models import Buyer
from apps.tenants.models import Tenant
from apps.users.models import User


DEMO_COSTINGS = [
    {
        "style_number": "REG-1001",
        "name": "Relaxed Jogger",
        "version": 1,
        "status": "approved",
        "sheet_type": "bd",
        "is_live": True,
        "target_price": Decimal("18.50"),
        "fabric_cost": Decimal("6.20"),
        "trim_cost": Decimal("1.30"),
        "cm_cost": Decimal("2.80"),
        "overhead_cost": Decimal("0.90"),
        "selling_price": Decimal("19.95"),
        "customer_discount_pct": Decimal("5.00"),
        "origin_overhead_pct": Decimal("4.00"),
        "uk_overhead_pct": Decimal("2.00"),
        "exchange_rate": Decimal("0.790000"),
        "is_single_size": False,
        "is_patterned": True,
        "patterned_fabric_options": [
            {"name": "Striped 2x2", "ratio": "60%"},
            {"name": "Match point", "ratio": "40%"},
        ],
        "notes": "Approved single-piece cost for the relaxed jogger with striped match-point fabric.",
        "lines": [
            {"category": "fabric", "description": "Sandwash linen", "unit_price": "6.2000", "consumption": "1.0000", "sort_order": 1},
            {"category": "trim", "description": "Zip + drawcords", "unit_price": "1.1000", "consumption": "1.0000", "sort_order": 2},
            {"category": "label", "description": "Main + washcare", "unit_price": "0.2000", "consumption": "1.0000", "sort_order": 3},
            {"category": "making", "description": "CM sewing", "unit_price": "2.8000", "consumption": "1.0000", "sort_order": 4},
            {"category": "overhead", "description": "Factory overheads", "unit_price": "0.9000", "consumption": "1.0000", "sort_order": 5},
        ],
    },
    {
        "style_number": "REG-1002",
        "name": "Classic Crew Neck Tee",
        "version": 1,
        "status": "approved",
        "sheet_type": "bd",
        "is_live": True,
        "target_price": Decimal("9.50"),
        "fabric_cost": Decimal("3.40"),
        "trim_cost": Decimal("0.70"),
        "cm_cost": Decimal("1.60"),
        "overhead_cost": Decimal("0.45"),
        "selling_price": Decimal("9.99"),
        "customer_discount_pct": Decimal("3.00"),
        "origin_overhead_pct": Decimal("3.00"),
        "uk_overhead_pct": Decimal("1.50"),
        "exchange_rate": Decimal("0.790000"),
        "is_single_size": False,
        "is_patterned": False,
        "notes": "High-volume basic tee; tight margin.",
        "lines": [
            {"category": "fabric", "description": "Jersey 180gsm", "unit_price": "3.4000", "consumption": "1.0000", "sort_order": 1},
            {"category": "trim", "description": "Neck rib", "unit_price": "0.5500", "consumption": "1.0000", "sort_order": 2},
            {"category": "label", "description": "Main label", "unit_price": "0.1500", "consumption": "1.0000", "sort_order": 3},
            {"category": "making", "description": "CM sewing", "unit_price": "1.6000", "consumption": "1.0000", "sort_order": 4},
            {"category": "overhead", "description": "Factory overheads", "unit_price": "0.4500", "consumption": "1.0000", "sort_order": 5},
        ],
    },
    {
        "style_number": "REG-1003",
        "name": "Performance Polo Shirt",
        "version": 1,
        "status": "pending",
        "sheet_type": "bd",
        "is_live": True,
        "target_price": Decimal("12.50"),
        "fabric_cost": Decimal("4.80"),
        "trim_cost": Decimal("1.05"),
        "cm_cost": Decimal("2.20"),
        "overhead_cost": Decimal("0.70"),
        "selling_price": Decimal("13.50"),
        "customer_discount_pct": Decimal("2.50"),
        "origin_overhead_pct": Decimal("3.50"),
        "uk_overhead_pct": Decimal("2.00"),
        "exchange_rate": Decimal("0.790000"),
        "is_single_size": False,
        "is_patterned": True,
        "patterned_fabric_options": [
            {"name": "Pique stripe", "ratio": "100%"},
        ],
        "notes": "Awaiting commercial approval.",
        "lines": [
            {"category": "fabric", "description": "Pique knit", "unit_price": "4.8000", "consumption": "1.0000", "sort_order": 1},
            {"category": "trim", "description": "Buttons + tape", "unit_price": "0.9000", "consumption": "1.0000", "sort_order": 2},
            {"category": "label", "description": "Main + size label", "unit_price": "0.1500", "consumption": "1.0000", "sort_order": 3},
            {"category": "making", "description": "CM sewing", "unit_price": "2.2000", "consumption": "1.0000", "sort_order": 4},
            {"category": "overhead", "description": "Factory overheads", "unit_price": "0.7000", "consumption": "1.0000", "sort_order": 5},
        ],
    },
    {
        "style_number": "REG-1004",
        "name": "Tech Windbreaker",
        "version": 1,
        "status": "approved",
        "sheet_type": "cn",
        "is_live": True,
        "target_price": Decimal("24.00"),
        "fabric_cost": Decimal("8.50"),
        "trim_cost": Decimal("2.05"),
        "cm_cost": Decimal("3.20"),
        "overhead_cost": Decimal("1.40"),
        "selling_price": Decimal("26.00"),
        "customer_discount_pct": Decimal("6.00"),
        "origin_overhead_pct": Decimal("4.50"),
        "uk_overhead_pct": Decimal("2.50"),
        "exchange_rate": Decimal("0.790000"),
        "is_single_size": True,
        "is_patterned": False,
        "notes": "Single-size watermarked windbreaker sourced from CN.",
        "lines": [
            {"category": "fabric", "description": "Nylon ripstop", "unit_price": "8.5000", "consumption": "1.0000", "sort_order": 1},
            {"category": "trim", "description": "YKK zip + cord stops", "unit_price": "1.8000", "consumption": "1.0000", "sort_order": 2},
            {"category": "label", "description": "Brand + washcare", "unit_price": "0.2500", "consumption": "1.0000", "sort_order": 3},
            {"category": "making", "description": "CM sewing", "unit_price": "3.2000", "consumption": "1.0000", "sort_order": 4},
            {"category": "overhead", "description": "Factory overheads", "unit_price": "1.4000", "consumption": "1.0000", "sort_order": 5},
        ],
    },
    {
        "style_number": "REG-1005",
        "name": "Striped Long Sleeve Tee",
        "version": 1,
        "status": "draft",
        "sheet_type": "vn",
        "is_live": True,
        "target_price": Decimal("10.50"),
        "fabric_cost": Decimal("3.90"),
        "trim_cost": Decimal("0.80"),
        "cm_cost": Decimal("1.70"),
        "overhead_cost": Decimal("0.50"),
        "selling_price": Decimal("11.50"),
        "customer_discount_pct": Decimal("4.00"),
        "origin_overhead_pct": Decimal("3.00"),
        "uk_overhead_pct": Decimal("2.00"),
        "exchange_rate": Decimal("0.790000"),
        "is_single_size": False,
        "is_patterned": True,
        "patterned_fabric_options": [
            {"name": "Vertical stripe", "ratio": "100%"},
        ],
        "notes": "Draft costing pending price negotiation.",
        "lines": [
            {"category": "fabric", "description": "Striped jersey", "unit_price": "3.9000", "consumption": "1.0000", "sort_order": 1},
            {"category": "trim", "description": "Ribbed cuffs", "unit_price": "0.6500", "consumption": "1.0000", "sort_order": 2},
            {"category": "label", "description": "Main label", "unit_price": "0.1500", "consumption": "1.0000", "sort_order": 3},
            {"category": "making", "description": "CM sewing", "unit_price": "1.7000", "consumption": "1.0000", "sort_order": 4},
            {"category": "overhead", "description": "Factory overheads", "unit_price": "0.5000", "consumption": "1.0000", "sort_order": 5},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed 5 demo DesignCosting records connected to the design register styles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant", type=str, default=None,
            help="Tenant slug (default: first active tenant)",
        )

    def handle(self, *args, **options):
        if options["tenant"]:
            tenant = Tenant.objects.filter(slug=options["tenant"]).first()
            if not tenant:
                self.stdout.write(self.style.ERROR(
                    f"No tenant with slug {options['tenant']!r}."
                ))
                return
        else:
            tenant = Tenant.objects.filter(is_active=True).first()
            if not tenant:
                self.stdout.write(self.style.ERROR(
                    "No active tenant. Run seed_demo_data first."
                ))
                return

        created_costings = 0
        upserted_lines = 0
        approver = (
            User.objects.filter(tenant=tenant, is_active=True)
            .order_by("created_at").first()
        )

        for spec in DEMO_COSTINGS:
            style = self._resolve_style(tenant, spec)
            costing, was_created = DesignCosting.objects.get_or_create(
                tenant=tenant,
                style=style,
                version=spec["version"],
                defaults={
                    "status": spec["status"],
                    "sheet_type": spec["sheet_type"],
                    "is_live": spec["is_live"],
                    "target_price": spec["target_price"],
                    "fabric_cost": spec["fabric_cost"],
                    "trim_cost": spec["trim_cost"],
                    "cm_cost": spec["cm_cost"],
                    "overhead_cost": spec["overhead_cost"],
                    "selling_price": spec["selling_price"],
                    "customer_discount_pct": spec["customer_discount_pct"],
                    "origin_overhead_pct": spec["origin_overhead_pct"],
                    "uk_overhead_pct": spec["uk_overhead_pct"],
                    "exchange_rate": spec["exchange_rate"],
                    "is_single_size": spec["is_single_size"],
                    "is_patterned": spec["is_patterned"],
                    "patterned_fabric_options": spec.get("patterned_fabric_options", []),
                    "notes": spec["notes"],
                },
            )

            # Re-write mutable fields so re-runs refresh values (get_or_create
            # only guards creation; it does not update existing rows).
            for field, value in {
                "status": spec["status"],
                "is_live": spec["is_live"],
                "target_price": spec["target_price"],
                "fabric_cost": spec["fabric_cost"],
                "trim_cost": spec["trim_cost"],
                "cm_cost": spec["cm_cost"],
                "overhead_cost": spec["overhead_cost"],
                "selling_price": spec["selling_price"],
                "customer_discount_pct": spec["customer_discount_pct"],
                "origin_overhead_pct": spec["origin_overhead_pct"],
                "uk_overhead_pct": spec["uk_overhead_pct"],
                "exchange_rate": spec["exchange_rate"],
                "is_single_size": spec["is_single_size"],
                "is_patterned": spec["is_patterned"],
                "patterned_fabric_options": spec.get("patterned_fabric_options", []),
                "notes": spec["notes"],
            }.items():
                setattr(costing, field, value)

            if spec["status"] == "approved" and approver is not None:
                costing.approved_by = approver
                costing.approved_at = costing.approved_at or timezone.now()

            costing.save(update_fields=[
                "status", "is_live", "target_price", "fabric_cost",
                "trim_cost", "cm_cost", "overhead_cost", "selling_price",
                "customer_discount_pct", "origin_overhead_pct",
                "uk_overhead_pct", "exchange_rate", "is_single_size",
                "is_patterned", "patterned_fabric_options", "notes",
                "approved_by", "approved_at", "total_cost",
            ])

            if was_created:
                created_costings += 1

            for line in spec["lines"]:
                _, line_created = DesignCostingLine.objects.get_or_create(
                    tenant=tenant,
                    costing=costing,
                    category=line["category"],
                    description=line["description"],
                    defaults={
                        "unit_price": Decimal(line["unit_price"]),
                        "consumption": Decimal(line["consumption"]),
                        "sort_order": line["sort_order"],
                    },
                )
                if line_created:
                    upserted_lines += 1
                else:
                    DesignCostingLine.objects.filter(
                        tenant=tenant,
                        costing=costing,
                        category=line["category"],
                        description=line["description"],
                    ).update(
                        unit_price=Decimal(line["unit_price"]),
                        consumption=Decimal(line["consumption"]),
                        sort_order=line["sort_order"],
                    )
                    upserted_lines += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created_costings} design costings, "
            f"{upserted_lines} cost lines across {len(DEMO_COSTINGS)} styles "
            f"(tenant {tenant.slug})."
        ))

    def _resolve_style(self, tenant, spec):
        """Return the design-register style for this spec, creating it if absent."""
        style_number = spec["style_number"]
        style = Style.objects.filter(
            tenant=tenant, style_number=style_number
        ).first()
        if style:
            return style

        buyer = (
            Buyer.objects.filter(tenant=tenant, status="active").first()
            or Buyer.objects.filter(tenant=tenant).first()
            or Buyer.objects.create(
                tenant=tenant, name="Seed Buyer", code="SB",
                status="active",
            )
        )
        style, _ = Style.objects.get_or_create(
            tenant=tenant,
            style_number=style_number,
            defaults={
                "name": spec["name"],
                "buyer": buyer,
                "status": "active",
            },
        )
        return style