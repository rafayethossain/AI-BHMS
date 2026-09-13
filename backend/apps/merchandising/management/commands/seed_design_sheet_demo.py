"""
Seed 5 demo design sheets with populated design information, materials,
fit specs and job requests.

Each design sheet is backed by Style -> StyleVersion (active) -> StyleTechPack
-> DesignSheet, plus an active BOM carrying the Material Breakdown rows so the
design-sheet detail page renders:

1. **Design Information** (header block) - the ``StyleTechPack`` fields
   mirrored by ``DesignSheetSerializer`` (block / based-on / relationship /
   buyer / designer / pattern-cutter / issuer / cloth-code / size / length /
   issue-date / risk-date / pattern-request-date / note).
2. **Material Breakdown** (material block) - ``BOMItem`` rows surfaced as
   ``material_items`` in grid field names.
3. **Fit Specs** - ``FitSpecification`` stages along the reference fit label
   sequence (DEV SPEC / 1ST FIT / 2ND FIT / 3RD FIT), rotating exactly one
   selected per sheet so the unique-selected constraint holds.
4. **Job Requests** - ``DesignJobRequest`` rows (patterns / samples / 3D) with
   a due date, work location, status, notes and a rotating allocation to
   active tenant users.

Idempotent: rows are keyed by style number / tech-pack number / BOM version /
item name / fit stage / job type+due date, so re-running updates in place
instead of duplicating.

Usage: ``python manage.py seed_design_sheet_demo [--tenant <slug>]``
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.merchandising.models import (
    BOM,
    BOMItem,
    DesignJobRequest,
    DesignSheet,
    FitSpecification,
    Style,
    StyleTechPack,
    StyleVersion,
)
from apps.setup.models import Buyer, UOM, Vendor
from apps.tenants.models import Tenant
from apps.users.models import User


DEMO_DESIGNS = [
    {
        "number": "DSD-1001",
        "name": "Relaxed Jogger",
        "sheet_status": "new",
        "design_info": {
            "block": "59073T",
            "based_on": "59073T",
            "relationship": "based_on",
            "designer": "Emmi.Huynh",
            "pattern_cutter": "HAI",
            "issuer": "Clone",
            "cloth_code": "SANDWASH LINEN",
            "size": "10-14",
            "length": "32 inch",
            "issue_date": "2022-03-22",
            "risk_date": "2022-05-10",
            "pattern_request_date": "2022-04-01",
            "note": "BASED ON THE BLOCK OF 59073T. FRONT POCKET CHANGED TO ZIP CLOSURE.",
            "description": "565235 LB LIZZIE WIDE LEG PANT",
        },
        "materials": [
            {"type": "Cloth", "description_code": "SANDWASH LINEN XK-529",
             "location": "MAIN", "supplier": "FOURSEASONS", "colour": "BLACK",
             "width_size": "132 CM", "qty": "1.67", "match": ""},
            {"type": "Cloth", "description_code": "PIQUE MESH 220GSM",
             "location": "MAIN", "supplier": "ALICE-", "colour": "WHITE",
             "width_size": "150 CM", "qty": "1.20", "match": ""},
            {"type": "Trims", "description_code": "WOVEN NECK LABEL",
             "location": "NECK", "supplier": "NEW SUP", "colour": "BLACK",
             "width_size": "75 MM", "qty": "1", "match": "FULL"},
            {"type": "Trims", "description_code": "SIZE LABEL",
             "location": "SIDE SEAM", "supplier": "NEW SUP", "colour": "WHITE",
             "width_size": "40 MM", "qty": "1", "match": "SELF"},
            {"type": "Trims", "description_code": "METAL ZIPPER #5",
             "location": "FRONT", "supplier": "ALICE-", "colour": "ANTIQUE BRASS",
             "width_size": "55 CM", "qty": "1", "match": ""},
        ],
    },
    {
        "number": "DSD-1002",
        "name": "Classic Crew Neck Tee",
        "sheet_status": "production",
        "design_info": {
            "block": "59072T",
            "based_on": "59072T",
            "relationship": "based_on",
            "designer": "Mia.Tran",
            "pattern_cutter": "SON",
            "issuer": "Clone",
            "cloth_code": "COTTON JERSEY",
            "size": "XS-XXL",
            "length": "28 inch",
            "issue_date": "2024-01-15",
            "risk_date": "2024-02-20",
            "pattern_request_date": "2024-01-28",
            "note": "RIBBED COLLAR SPEC UPDATED PER BUYER COMMENT.",
            "description": "XK-110 CLASSIC CREW NECK TEE",
        },
        "materials": [
            {"type": "Cloth", "description_code": "COTTON JERSEY 180GSM",
             "location": "BODY", "supplier": "FOURSEASONS", "colour": "WHITE",
             "width_size": "180 CM", "qty": "1.30", "match": ""},
            {"type": "Cloth", "description_code": "COTTON JERSEY 180GSM",
             "location": "HEM", "supplier": "FOURSEASONS", "colour": "BLACK",
             "width_size": "180 CM", "qty": "0.35", "match": ""},
            {"type": "Trims", "description_code": "WOVEN NECK LABEL",
             "location": "NECK", "supplier": "NEW SUP", "colour": "BLACK",
             "width_size": "65 MM", "qty": "1", "match": "FULL"},
            {"type": "Trims", "description_code": "CARE LABEL",
             "location": "SIDE SEAM", "supplier": "NEW SUP", "colour": "WHITE",
             "width_size": "60 MM", "qty": "1", "match": "FULL"},
            {"type": "Trims", "description_code": "RIB COLLAR",
             "location": "NECK", "supplier": "ALICE-", "colour": "DARK GREY",
             "width_size": "8 CM", "qty": "0.18", "match": ""},
        ],
    },
    {
        "number": "DSD-1003",
        "name": "Performance Polo Shirt",
        "sheet_status": "new",
        "design_info": {
            "block": "59074T",
            "based_on": "59074T",
            "relationship": "recut",
            "designer": "Tom.Farmer",
            "pattern_cutter": "TOMMY",
            "issuer": "Clone",
            "cloth_code": "PIQUE",
            "size": "M-3XL",
            "length": "30 inch",
            "issue_date": "2025-06-02",
            "risk_date": "2025-07-10",
            "pattern_request_date": "2025-06-18",
            "note": "FLAT KNIT COLLAR + PLACKET BUTTONS, RECUT FROM 59074T.",
            "description": "PIPE PERFORMANCE POLO",
        },
        "materials": [
            {"type": "Cloth", "description_code": "PIQUE MESH 220GSM",
             "location": "BODY", "supplier": "FOURSEASONS", "colour": "NAVY",
             "width_size": "150 CM", "qty": "1.35", "match": ""},
            {"type": "Trims", "description_code": "BUTTON 4 HOLES FV9757",
             "location": "PLACKET", "supplier": "ALICE-", "colour": "NAVY",
             "width_size": "15 MM", "qty": "3", "match": "FULL"},
            {"type": "Trims", "description_code": "WOVEN NECK LABEL",
             "location": "NECK", "supplier": "NEW SUP", "colour": "NAVY",
             "width_size": "70 MM", "qty": "1", "match": "FULL"},
            {"type": "Trims", "description_code": "FLAT KNIT COLLAR",
             "location": "COLLAR", "supplier": "ALICE-", "colour": "NAVY",
             "width_size": "10 CM", "qty": "0.25", "match": ""},
            {"type": "Packaging", "description_code": "POLY BAG 30X40CM",
             "location": "PACKING", "supplier": "NEW SUP", "colour": "CLEAR",
             "width_size": "40 CM", "qty": "1", "match": ""},
        ],
    },
    {
        "number": "DSD-1004",
        "name": "Tech Windbreaker",
        "sheet_status": "rejected",
        "design_info": {
            "block": "59075T",
            "based_on": "59075T",
            "relationship": "na",
            "designer": "Ruth.Diaz",
            "pattern_cutter": "RAY",
            "issuer": "Clone",
            "cloth_code": "RIPSTOP NYLON",
            "size": "S-XL",
            "length": "26 inch",
            "issue_date": "2025-03-08",
            "risk_date": "2025-04-12",
            "pattern_request_date": "2025-03-20",
            "note": "DWR FINISH REJECTED BY BUYING TEAM; RE-ISSUE AFTER RE-SUBMIT.",
            "description": "SHELL/STORM TECH WINDBREAKER",
        },
        "materials": [
            {"type": "Cloth", "description_code": "RIPSTOP NYLON 70D",
             "location": "SHELL", "supplier": "FOURSEASONS", "colour": "AQUA",
             "width_size": "148 CM", "qty": "1.60", "match": ""},
            {"type": "Cloth", "description_code": "MESH FABRIC 150GSM",
             "location": "LINING", "supplier": "FOURSEASONS", "colour": "GREY",
             "width_size": "150 CM", "qty": "1.10", "match": ""},
            {"type": "Trims", "description_code": "METAL ZIPPER #5",
             "location": "FRONT", "supplier": "ALICE-", "colour": "SILVER",
             "width_size": "60 CM", "qty": "1", "match": "FULL"},
            {"type": "Trims", "description_code": "SNAP BUTTONS",
             "location": "CUFF", "supplier": "NEW SUP", "colour": "SILVER",
             "width_size": "15 MM", "qty": "4", "match": ""},
            {"type": "Trims", "description_code": "ELASTIC WAISTBAND",
             "location": "HEM", "supplier": "NEW SUP", "colour": "BLACK",
             "width_size": "45 MM", "qty": "1", "match": ""},
        ],
    },
    {
        "number": "DSD-1005",
        "name": "Striped Long Sleeve Tee",
        "sheet_status": "new",
        "design_info": {
            "block": "59071T",
            "based_on": "",
            "relationship": "new",
            "designer": "Emmi.Huynh",
            "pattern_cutter": "SON",
            "issuer": "Clone",
            "cloth_code": "FRENCH TERRY",
            "size": "XS-XXL",
            "length": "30 inch",
            "issue_date": "2025-08-19",
            "risk_date": None,
            "pattern_request_date": "2025-09-05",
            "note": "AWAITING STRIPE COLOURWAYS CONFIRMATION.",
            "description": "STRIPE LONG SLEEVE TEE",
        },
        "materials": [
            {"type": "Cloth", "description_code": "FRENCH TERRY 280GSM",
             "location": "BODY", "supplier": "FOURSEASONS", "colour": "GREY STRIPE",
             "width_size": "175 CM", "qty": "1.30", "match": ""},
            {"type": "Cloth", "description_code": "COTTON JERSEY 180GSM",
             "location": "COLLAR", "supplier": "FOURSEASONS", "colour": "GREY",
             "width_size": "180 CM", "qty": "0.20", "match": ""},
            {"type": "Trims", "description_code": "WOVEN NECK LABEL",
             "location": "NECK", "supplier": "NEW SUP", "colour": "BLACK",
             "width_size": "70 MM", "qty": "1", "match": "FULL"},
            {"type": "Trims", "description_code": "DRAWSTRING",
             "location": "HOOD", "supplier": "ALICE-", "colour": "GREY",
             "width_size": "80 CM", "qty": "1", "match": ""},
            {"type": "Trims", "description_code": "SNAP BUTTONS",
             "location": "PLACKET", "supplier": "NEW SUP", "colour": "GREY",
             "width_size": "15 MM", "qty": "4", "match": ""},
        ],
    },
]

DEMO_FIT_SPECS = {
    "DSD-1001": [
        {"fit_number": "DEV SPEC", "fit_date": "2022-03-25",
         "description": "Initial dev sample from block 59073T, zip front pocket.",
         "notes": "Check hem allowance and pocket zip length.", "selected": True},
        {"fit_number": "1ST FIT", "fit_date": "2022-04-18",
         "description": "1st fit after front pocket pattern changes.",
         "notes": "Re-check seat rise and thigh ease.", "selected": False},
    ],
    "DSD-1002": [
        {"fit_number": "DEV SPEC", "fit_date": "2024-01-22",
         "description": "Dev spec for classic crew neck tee.",
         "notes": "Rib collar spec updated per buyer comment.", "selected": False},
        {"fit_number": "1ST FIT", "fit_date": "2024-02-15",
         "description": "1st fit sample reviewed.", "notes": "Shoulder drop OK.", "selected": False},
        {"fit_number": "2ND FIT", "fit_date": "2024-03-10",
         "description": "2nd fit with updated rib collar.", "notes": "Approved for bulk.", "selected": False},
        {"fit_number": "3RD FIT", "fit_date": "2024-03-28",
         "description": "3rd fit in production colours.", "notes": "PP fit - final sign off.", "selected": True},
    ],
    "DSD-1003": [
        {"fit_number": "DEV SPEC", "fit_date": "2025-06-10",
         "description": "Dev spec for performance polo, flat knit collar.",
         "notes": "Placket button spacing to verify.", "selected": False},
        {"fit_number": "1ST FIT", "fit_date": "2025-07-01",
         "description": "1st fit review.", "notes": "Reduce hem side slits by 1cm.", "selected": True},
        {"fit_number": "2ND FIT", "fit_date": "2025-07-22",
         "description": "2nd fit after side slit adjustment.",
         "notes": "Awaiting collar colourway.", "selected": False},
    ],
    "DSD-1004": [
        {"fit_number": "DEV SPEC", "fit_date": "2025-03-15",
         "description": "Dev spec for windbreaker shell.", "notes": "DWR finish check.", "selected": False},
        {"fit_number": "1ST FIT", "fit_date": "2025-04-02",
         "description": "1st fit rejected by buying team.",
         "notes": "Re-issue after re-submit.", "selected": True},
    ],
    "DSD-1005": [
        {"fit_number": "DEV SPEC", "fit_date": "2025-08-25",
         "description": "Dev spec awaiting stripe colourways.",
         "notes": "Stripe alignment to match body.", "selected": True},
        {"fit_number": "1ST FIT", "fit_date": "2025-09-20",
         "description": "1st fit planned after colourway confirmation.", "notes": "", "selected": False},
    ],
}

DEMO_JOB_REQUESTS = {
    "DSD-1001": [
        {"job_type": "new_pattern", "required_by": "2026-09-25", "work_location": "Pattern Room 2",
         "no_of_garments": 1, "status": "in_progress",
         "notes": "Full pattern set from 59073T block."},
        {"job_type": "tech_sample", "required_by": "2026-10-09", "work_location": "Sewing Bay A",
         "no_of_garments": 2, "status": "pending",
         "notes": "Submit dev sample in Black."},
    ],
    "DSD-1002": [
        {"job_type": "fit_sample", "required_by": "2026-09-05", "work_location": "Fitting Room",
         "no_of_garments": 1, "status": "completed",
         "notes": "Bulk fit sample reviewed and signed off."},
        {"job_type": "3d", "required_by": "2026-09-10", "work_location": "",
         "no_of_garments": 1, "status": "completed",
         "notes": "3D render approved for buyer."},
        {"job_type": "mini_marker", "required_by": "2026-10-01", "work_location": "Marker Office",
         "no_of_garments": 1, "status": "in_progress",
         "notes": "Mini marker for 3% fabric saving."},
    ],
    "DSD-1003": [
        {"job_type": "new_pattern", "required_by": "2026-09-20", "work_location": "Pattern Room 1",
         "no_of_garments": 1, "status": "in_progress",
         "notes": "Recut pattern from 59074T."},
        {"job_type": "3d", "required_by": "2026-10-08", "work_location": "",
         "no_of_garments": 1, "status": "pending",
         "notes": "3D for buyer review."},
    ],
    "DSD-1004": [
        {"job_type": "tech_sample", "required_by": "2026-08-28", "work_location": "Sewing Bay A",
         "no_of_garments": 2, "status": "completed",
         "notes": "Rejected - revise DWR finish."},
        {"job_type": "fit_sample", "required_by": "2026-09-22", "work_location": "Fitting Room",
         "no_of_garments": 1, "status": "in_progress",
         "notes": "Refit on revised shell."},
    ],
    "DSD-1005": [
        {"job_type": "new_pattern", "required_by": "2026-09-28", "work_location": "Pattern Room 2",
         "no_of_garments": 1, "status": "pending",
         "notes": "Waiting stripe colourways confirmation."},
        {"job_type": "mini_marker", "required_by": "2026-10-15", "work_location": "Marker Office",
         "no_of_garments": 1, "status": "pending",
         "notes": "Marker once stripe confirmed."},
    ],
}


class Command(BaseCommand):
    help = "Seed demo design sheets with design info, materials, fit specs and job requests"

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

        self.stdout.write(f"Seeding design-sheet demo data for: {tenant.name}")

        buyer, _ = Buyer.objects.get_or_create(
            tenant=tenant, code="DSD1", defaults={"name": "DOTTI"},
        )
        uom_mtr, _ = UOM.objects.get_or_create(
            tenant=tenant, code="MTR", defaults={"name": "Metres"},
        )
        uom_pcs, _ = UOM.objects.get_or_create(
            tenant=tenant, code="PCS", defaults={"name": "Pieces"},
        )

        supplier_names = sorted({m["supplier"] for d in DEMO_DESIGNS for m in d["materials"]})
        suppliers = {}
        for idx, name in enumerate(supplier_names, start=1):
            vendor, _ = Vendor.objects.get_or_create(
                tenant=tenant, name=name, code=f"DSD{idx:02d}",
            )
            suppliers[name] = vendor

        for design in DEMO_DESIGNS:
            style, _ = Style.objects.get_or_create(
                tenant=tenant, style_number=design["number"],
                defaults={
                    "name": design["name"],
                    "buyer": buyer,
                    "description": design["design_info"]["description"],
                },
            )
            style.name = design["name"]
            style.buyer = buyer
            style.description = design["design_info"]["description"]
            style.save(update_fields=["name", "buyer", "description"])

            techpack, _ = StyleTechPack.objects.get_or_create(
                tenant=tenant, techpack_number=f"TP-{design['number']}",
                defaults={"style": style},
            )
            techpack.style = style
            info = design["design_info"]
            for field in (
                "block", "based_on", "relationship", "designer", "pattern_cutter",
                "issuer", "cloth_code", "size", "length", "note", "description",
            ):
                setattr(techpack, field, info.get(field, ""))
            techpack.buyer = buyer
            techpack.issue_date = info.get("issue_date") or None
            techpack.risk_date = info.get("risk_date") or None
            techpack.pattern_request_date = info.get("pattern_request_date") or None
            techpack.save()

            version, _ = StyleVersion.objects.get_or_create(
                tenant=tenant, style=style, version_number=1,
                defaults={"status": "active"},
            )
            if version.status != "active":
                version.status = "active"
                version.save(update_fields=["status"])

            bom, _ = BOM.objects.get_or_create(
                tenant=tenant, style_version=version, version=1,
                defaults={"name": f"BOM - {style.style_number}", "status": "active"},
            )
            bom.name = f"BOM - {style.style_number}"
            bom.status = "active"
            bom.save(update_fields=["name", "status"])

            for material in design["materials"]:
                item, _ = BOMItem.objects.get_or_create(
                    tenant=tenant, bom=bom, item_name=material["description_code"],
                    defaults={"category": material["type"]},
                )
                item.category = material["type"]
                item.location = material["location"]
                item.supplier = suppliers[material["supplier"]]
                item.vendor = suppliers[material["supplier"]]
                item.colour = material["colour"]
                item.width_size = material["width_size"]
                item.ordered_qty = material["qty"]
                item.match = material["match"]
                item.uom = uom_pcs if material["type"] == "Trims" else uom_mtr
                item.save(update_fields=[
                    "category", "location", "supplier", "vendor", "colour",
                    "width_size", "ordered_qty", "match", "uom",
                ])

            sheet, _ = DesignSheet.objects.get_or_create(
                tenant=tenant, tech_pack=techpack,
            )
            sheet.status = design["sheet_status"]
            sheet.save(update_fields=["status"])

            active_users = list(
                User.objects.filter(tenant=tenant, status="active").order_by("id")
            )

            selected_fit_number = next(
                (
                    spec["fit_number"]
                    for spec in DEMO_FIT_SPECS.get(design["number"], [])
                    if spec["selected"]
                ),
                None,
            )
            fit_spec_count = 0
            for spec in DEMO_FIT_SPECS.get(design["number"], []):
                fit, _ = FitSpecification.objects.get_or_create(
                    tenant=tenant, design_sheet=sheet,
                    fit_number=spec["fit_number"],
                    defaults={
                        "fit_date": spec["fit_date"],
                        "description": spec["description"],
                        "notes": spec.get("notes", ""),
                    },
                )
                fit.fit_date = spec["fit_date"]
                fit.description = spec["description"]
                fit.notes = spec.get("notes", "")
                fit.save(update_fields=["fit_date", "description", "notes"])
                fit_spec_count += 1

            FitSpecification.objects.filter(
                tenant=tenant, design_sheet=sheet
            ).update(is_selected=False)
            if selected_fit_number:
                FitSpecification.objects.filter(
                    tenant=tenant, design_sheet=sheet,
                    fit_number=selected_fit_number,
                ).update(is_selected=True)

            job_request_count = 0
            for index, job in enumerate(
                DEMO_JOB_REQUESTS.get(design["number"], [])
            ):
                allocated = (
                    active_users[index % len(active_users)]
                    if active_users
                    else None
                )
                request, _ = DesignJobRequest.objects.get_or_create(
                    tenant=tenant, design_sheet=sheet,
                    job_type=job["job_type"], required_by=job["required_by"],
                    defaults={
                        "work_location": job.get("work_location", ""),
                        "no_of_garments": job.get("no_of_garments", 1),
                        "allocated_to": allocated,
                        "notes": job.get("notes", ""),
                        "status": job.get(
                            "status", DesignJobRequest.Status.PENDING
                        ),
                    },
                )
                request.work_location = job.get("work_location", "")
                request.no_of_garments = job.get("no_of_garments", 1)
                request.allocated_to = allocated
                request.notes = job.get("notes", "")
                request.status = job.get("status", DesignJobRequest.Status.PENDING)
                request.save(update_fields=[
                    "work_location", "no_of_garments", "allocated_to",
                    "notes", "status", "created_at",
                ])
                job_request_count += 1

            self.stdout.write(
                f"  - {design['number']} {design['name']} "
                f"({len(design['materials'])} material rows, "
                f"{fit_spec_count} fit specs, {job_request_count} job requests)"
            )

        self.stdout.write(self.style.SUCCESS(
            "Design-sheet demo data seeded: "
            f"{len(DEMO_DESIGNS)} sheets with material breakdown, fit specs and "
            "job requests. Open a design sheet to see Design Information, "
            "Material Breakdown, Fit Specs and Job Requests."
        ))