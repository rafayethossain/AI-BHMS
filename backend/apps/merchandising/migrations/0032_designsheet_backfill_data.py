"""
Day 6 leftover: backfill a DesignSheet for every existing tech-pack.

Tech-packs that predate the design-sheet workflow have no linked design sheet.
This migration creates one (status ``new``) per tech-pack using ``get_or_create``
semantics so existing sheets (TP-1002 and later) are left untouched.
"""
from django.db import migrations


def create_design_sheets(apps, schema_editor):
    StyleTechPack = apps.get_model("merchandising", "StyleTechPack")
    DesignSheet = apps.get_model("merchandising", "DesignSheet")
    created = 0
    for techpack in StyleTechPack.objects.all().iterator():
        if DesignSheet.objects.filter(tech_pack=techpack).exists():
            continue
        DesignSheet.objects.create(tenant_id=techpack.tenant_id, tech_pack=techpack)
        created += 1
    if created:
        print(f"  [ok] backfilled {created} design sheet(s) for existing tech-packs")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("merchandising", "0031_designsheet_sketch_annotations"),
    ]

    operations = [
        migrations.RunPython(create_design_sheets, noop),
    ]