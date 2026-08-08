import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0003_alter_shipment_freight_forwarder_and_more'),
        ('tenants', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='freightforwarder',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='freightforwarder',
            name='status',
        ),
        migrations.AddField(
            model_name='freightforwarder',
            name='country',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='freightforwarder',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='freightforwarder',
            name='code',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='freightforwarder',
            name='name',
            field=models.CharField(max_length=200),
        ),
        migrations.AlterField(
            model_name='freightforwarder',
            name='contact_person',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name='freightforwarder',
            name='email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name='freightforwarder',
            name='phone',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='freightforwarder',
            name='address',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='freight_forwarder',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='shipments', to='logistics.freightforwarder'),
        ),
    ]
