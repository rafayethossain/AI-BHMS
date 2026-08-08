# Phase 0.2 (RQ-010): Hit.colour free-text -> FK setup.ColorCode.
# Backfills existing string colours into ColorCode master data (matched by
# name, created if missing), then drops the free-text column.
import re

import django.db.models.deletion
from django.db import migrations, models


def _resolve_colour(apps, tenant_id, raw, cache):
    """Return a ColorCode for a free-text colour value (match by name, else create)."""
    ColorCode = apps.get_model("setup", "ColorCode")
    key = (tenant_id, raw.lower())
    if key not in cache:
        cc = (
            ColorCode.objects.filter(tenant_id=tenant_id, name__iexact=raw)
            .order_by("created_at")
            .first()
        )
        if cc is None:
            code = re.sub(r"[^A-Z0-9]", "", raw.upper())[:20] or "COL"
            cc = ColorCode.objects.create(
                tenant_id=tenant_id,
                code=code,
                name=raw[:100],
                hex_code="#CCCCCC",
                status="active",
            )
        cache[key] = cc
    return cache[key]


def backfill_colour(apps, schema_editor):
    Hit = apps.get_model("merchandising", "Hit")
    cache = {}
    for hit in Hit.objects.filter(colour_id__isnull=True).iterator():
        raw = (hit.colour_old or "").strip()
        if not raw:
            hit.delete()
            continue
        hit.colour_id = _resolve_colour(apps, hit.tenant_id, raw, cache).id
        hit.save(update_fields=["colour_id"])


def reverse_colour(apps, schema_editor):
    Hit = apps.get_model("merchandising", "Hit")
    for hit in Hit.objects.select_related("colour").iterator():
        if hit.colour_id is not None:
            hit.colour_old = hit.colour.name[:100]
            hit.save(update_fields=["colour_old"])


class Migration(migrations.Migration):

    dependencies = [
        ("merchandising", "0022_costing_confirmed_costing_confirmed_at_and_more"),
        ("setup", "0006_vendor_approved_at_vendor_approved_by_and_more"),  # ColorCode exists here
    ]

    operations = [
        migrations.RenameField(
            model_name="hit",
            old_name="colour",
            new_name="colour_old",
        ),
        migrations.AddField(
            model_name="hit",
            name="colour",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="hits",
                to="setup.colorcode",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="hit",
            unique_together=set(),
        ),
        migrations.RunPython(backfill_colour, reverse_colour),
        migrations.RemoveField(
            model_name="hit",
            name="colour_old",
        ),
        migrations.AlterField(
            model_name="hit",
            name="colour",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="hits",
                to="setup.colorcode",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="hit",
            unique_together={("tenant", "purchase_order", "colour")},
        ),
    ]
