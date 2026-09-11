"""
Buyer/Customer merge: fold the free-text ``customer`` into the buyer FK.

Existing ``Style.customer`` / ``StyleTechPack.customer`` text is resolved
against the tenant's Setup -> Buyers master (case-insensitive) and written to
the ``buyer`` FK — the pack's customer wins over the current buyer. Names that
resolve to no master buyer are left untouched (the text is dropped with the
column; the register keeps the buyer it had). Reversible via noop.
"""
from django.db import migrations


def backfill_customer_to_buyer(apps, schema_editor):
    Style = apps.get_model("merchandising", "Style")
    StyleTechPack = apps.get_model("merchandising", "StyleTechPack")
    Buyer = apps.get_model("setup", "Buyer")

    def resolve(tenant_id, name):
        if not name or not str(name).strip():
            return None
        return (
            Buyer.objects.filter(
                tenant_id=tenant_id, name__iexact=str(name).strip()
            )
            .values_list("id", flat=True)
            .first()
        )

    for style in Style.objects.exclude(customer="").iterator():
        buyer_id = resolve(style.tenant_id, style.customer)
        if buyer_id and style.buyer_id != buyer_id:
            style.buyer_id = buyer_id
            style.save(update_fields=["buyer"])

    for techpack in StyleTechPack.objects.exclude(customer="").iterator():
        buyer_id = resolve(techpack.tenant_id, techpack.customer)
        if buyer_id and techpack.buyer_id != buyer_id:
            techpack.buyer_id = buyer_id
            techpack.save(update_fields=["buyer"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("merchandising", "0040_add_style_design_info_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_customer_to_buyer, noop),
        migrations.RemoveField(
            model_name="style",
            name="customer",
        ),
        migrations.RemoveField(
            model_name="styletechpack",
            name="customer",
        ),
    ]