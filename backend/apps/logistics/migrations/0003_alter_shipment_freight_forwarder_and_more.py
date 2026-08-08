import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0002_initial'),
        ('setup', '0002_initial'),
        ('tenants', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='shipment',
            name='shipment_number',
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='status',
            field=models.CharField(choices=[('booking', 'Booking'), ('booked', 'Booked'), ('picked_up', 'Picked Up'), ('in_transit', 'In Transit'), ('at_port', 'At Port'), ('on_water', 'On Water'), ('arrived', 'Arrived'), ('cleared', 'Cleared'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='booking', max_length=20),
        ),
        migrations.AddField(
            model_name='shipment',
            name='mode',
            field=models.CharField(choices=[('sea', 'Sea'), ('air', 'Air'), ('road', 'Road'), ('rail', 'Rail'), ('multi', 'Multi-Modal')], default='sea', max_length=20),
        ),
        migrations.AddField(
            model_name='shipment',
            name='booking_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='factory',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='shipments', to='setup.factory'),
        ),
        migrations.AddField(
            model_name='shipment',
            name='seal_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='quantity',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='shipment',
            name='weight_kg',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='cbm',
            field=models.DecimalField(blank=True, decimal_places=3, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='shipment',
            name='marks',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='etd',
            field=models.DateField(blank=True, help_text='Estimated Time of Departure', null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='eta',
            field=models.DateField(blank=True, help_text='Estimated Time of Arrival', null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='atd',
            field=models.DateField(blank=True, help_text='Actual Time of Departure', null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='ata',
            field=models.DateField(blank=True, help_text='Actual Time of Arrival', null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='port_of_loading',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='port_of_discharge',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='vessel_name',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='voyage_number',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='container_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='container_size',
            field=models.CharField(blank=True, help_text='20GP, 40GP, 40HC', max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='shipment',
            name='remarks',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='ShippingDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('document_type', models.CharField(choices=[('pl', 'Packing List'), ('ci', 'Commercial Invoice'), ('bl', 'Bill of Lading'), ('co', 'Certificate of Origin'), ('fumigation', 'Fumigation Certificate'), ('inspection', 'Inspection Certificate'), ('insurance', 'Insurance Certificate'), ('other', 'Other')], max_length=20)),
                ('document_number', models.CharField(blank=True, max_length=100, null=True)),
                ('document_date', models.DateField(blank=True, null=True)),
                ('file', models.FileField(upload_to='shipping_docs/%Y/%m/')),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(class)s_created', to=settings.AUTH_USER_MODEL)),
                ('shipment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='logistics.shipment')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_set', to='tenants.tenant')),
            ],
            options={
                'ordering': ['-document_date'],
            },
        ),
        migrations.RemoveField(
            model_name='shipment',
            name='lc',
        ),
        migrations.RemoveField(
            model_name='shipment',
            name='shipping_line',
        ),
        migrations.RemoveField(
            model_name='shipment',
            name='freight_forwarder',
        ),
    ]
