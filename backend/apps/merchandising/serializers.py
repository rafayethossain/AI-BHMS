"""
Merchandising serializers for BHMS.
"""
from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.setup.serializers import RiskLevelSerializer

from . import risk_engine
from .models import (
    BOM,
    TA,
    BOMItem,
    Costing,
    CostingLine,
    DesignCosting,
    DesignCostingLine,
    DesignImage,
    DesignJobRequest,
    DesignSheet,
    FileOpening,
    FileOpeningNote,
    FitImage,
    FitSpec,
    FitSpecification,
    FitStage,
    Hit,
    JobPriority,
    JobRequest,
    JobStatus,
    POAmendment,
    PurchaseOrder,
    PurchaseOrderItem,
    StockFabricAllocation,
    Style,
    StyleItem,
    StyleTechPack,
    StyleVersion,
    TAMilestone,
)


class StyleItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    uom_name = serializers.CharField(source="uom.name", read_only=True)

    class Meta:
        model = StyleItem
        fields = [
            "id", "style", "category", "item_name", "description", "uom", "uom_name",
            "consumption", "waste_percent", "unit_price", "vendor", "vendor_name",
            "sort_order", "line_total"
        ]
        read_only_fields = ["id"]

    def get_line_total(self, obj):
        if obj.consumption and obj.unit_price:
            waste = (obj.waste_percent if obj.waste_percent is not None else Decimal("0")) / Decimal("100")
            return float(obj.consumption * obj.unit_price * (1 + waste))
        return None


class StyleSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    season_name = serializers.CharField(source="season.name", read_only=True)
    file_openings_count = serializers.SerializerMethodField()
    purchase_orders_count = serializers.SerializerMethodField()
    line_items = StyleItemSerializer(many=True, required=False)
    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Style
        fields = [
            "id", "style_number", "name", "description", "buyer", "buyer_name",
            "brand", "category", "product_type", "department", "season", "season_name",
            "tech_pack", "sketch_front", "sketch_back", "sketch_side", "sketch_detail",
            "current_version", "status", "file_openings_count",
            "purchase_orders_count", "line_items", "main_image", "created_at",
            # Design info fields (techpack-equivalent, manual entry)
            "block", "based_on", "relationship", "customer", "designer",
            "pattern_cutter", "issuer", "cloth_code", "size", "length",
            "issue_date", "risk_date", "pattern_request_date", "design_note",
        ]
        read_only_fields = ["id", "created_at", "current_version", "style_number"]
        extra_kwargs = {}

    def get_file_openings_count(self, obj):
        return obj.file_openings.count() if obj.id else 0

    def get_purchase_orders_count(self, obj):
        return PurchaseOrder.objects.filter(
            file_opening__style=obj
        ).count() if obj.id else 0

    def get_main_image(self, obj):
        img = obj.design_images.filter(is_main=True).first() or obj.design_images.first()
        return img.image.url if img and img.image else None

    def create(self, validated_data):
        items_data = validated_data.pop("line_items", [])
        style = Style.objects.create(**validated_data)
        for idx, item in enumerate(items_data):
            StyleItem.objects.create(tenant=style.tenant, created_by=self.context["request"].user, style=style, sort_order=idx, **item)
        return style


class DesignImageSerializer(serializers.ModelSerializer):
    style_number = serializers.CharField(source="style.style_number", read_only=True)

    class Meta:
        model = DesignImage
        fields = [
            "id", "style", "style_number", "image", "role", "caption",
            "colourway", "sort_order", "is_main", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class StyleVersionSerializer(serializers.ModelSerializer):
    style_number = serializers.CharField(source="style.style_number", read_only=True)

    class Meta:
        model = StyleVersion
        fields = ["id", "style", "style_number", "version_number", "revision_notes", "status", "created_at"]
        read_only_fields = ["id", "created_at", "version_number"]


class StyleTechPackSerializer(serializers.ModelSerializer):
    source_pdf_url = serializers.SerializerMethodField()
    excel_url = serializers.SerializerMethodField()
    sketch_image_url = serializers.SerializerMethodField()
    sketch_thumbnail_url = serializers.SerializerMethodField()
    bom_items_count = serializers.SerializerMethodField()

    def get_source_pdf_url(self, obj):
        return obj.source_pdf.url if obj.source_pdf else None

    def get_excel_url(self, obj):
        return obj.excel_file.url if obj.excel_file else None

    def get_sketch_image_url(self, obj):
        return obj.sketch_image.url if obj.sketch_image else None

    def get_sketch_thumbnail_url(self, obj):
        return obj.sketch_thumbnail.url if obj.sketch_thumbnail else None

    def get_bom_items_count(self, obj):
        return len(obj.extracted_data.get("bom_rows", []) or [])

    class Meta:
        model = StyleTechPack
        fields = [
            "id", "techpack_number", "style", "status",
            "source_pdf_url", "excel_url", "sketch_image_url",
            "sketch_thumbnail_url", "bom_items_count",
            "issue_date", "block", "based_on", "customer", "style_number",
            "size", "designer", "pattern_cutter", "issuer", "cloth_code",
            "length", "sketch", "description", "note",
            "sketch_image", "sketch_thumbnail", "other_images",
            "notes_initials", "notes_date",
            "errors", "warnings", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "techpack_number", "style", "status",
            "source_pdf_url", "excel_url", "sketch_image_url",
            "sketch_thumbnail_url", "bom_items_count",
            "errors", "warnings", "created_at", "updated_at",
        ]


class StockFabricAllocationSerializer(serializers.ModelSerializer):
    allocated_to_number = serializers.CharField(read_only=True, default="")

    class Meta:
        model = StockFabricAllocation
        fields = [
            "id", "stock", "allocated_to", "allocated_to_number",
            "meters", "allocated_date", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class FileOpeningSerializer(serializers.ModelSerializer):
    style_number = serializers.CharField(source="style.style_number", read_only=True)
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    factory_name = serializers.CharField(source="factory.name", read_only=True)
    style_version = serializers.PrimaryKeyRelatedField(
        queryset=StyleVersion.objects.all(), required=False, allow_null=True
    )
    purchase_orders_count = serializers.IntegerField(read_only=True, default=0)
    quick_lead_agreement_complete = serializers.BooleanField(read_only=True)
    missing_agreements = serializers.ListField(read_only=True, default=list)
    original_fn = serializers.SerializerMethodField()
    original_fn_number = serializers.CharField(read_only=True, default="")
    repeat_approval_complete = serializers.BooleanField(read_only=True)
    missing_repeat_approvals = serializers.ListField(read_only=True, default=list)
    stock_balance_meters = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    stock_allocations = StockFabricAllocationSerializer(
        many=True, read_only=True, required=False
    )

    def get_original_fn(self, obj):
        return str(obj.original_fn_id) if obj.original_fn_id else None

    class Meta:
        model = FileOpening
        fields = [
            "id", "file_number", "style", "style_number", "style_version",
            "buyer", "buyer_name", "brand", "factory", "factory_name",
            "file_date", "status", "remarks", "purchase_orders_count", "created_at",
            "is_quick_lead", "quick_lead_agreed_by",
            "quick_lead_agreement_complete", "missing_agreements",
            "original_fn", "original_fn_number", "is_repeat",
            "repeat_approved_by", "repeat_approval_complete",
            "missing_repeat_approvals",
            "is_stock_fabric", "stock_fabric_description", "total_meters",
            "allocated_meters", "stock_balance_meters", "stock_photo",
            "stock_allocations",
        ]
        read_only_fields = [
            "id", "created_at", "file_number", "quick_lead_agreed_by",
            "repeat_approved_by", "allocated_meters",
        ]

    def create(self, validated_data):
        if not validated_data.get("style_version") and validated_data.get("style"):
            sv = StyleVersion.objects.filter(style=validated_data["style"]).order_by("-version_number").first()
            if sv:
                validated_data["style_version"] = sv
        return super().create(validated_data)


class FileOpeningNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.CharField(read_only=True)

    class Meta:
        model = FileOpeningNote
        fields = ["id", "file_opening", "text", "author", "author_name", "author_initials", "is_active", "created_at"]
        read_only_fields = ["id", "file_opening", "author", "author_initials", "is_active", "created_at"]

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or str(obj.author)
        return None


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    color_name = serializers.CharField(source="color.name", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "purchase_order", "color", "color_name", "size", "quantity", "unit_price"]
        read_only_fields = ["id"]


class HitSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    factory_name = serializers.CharField(source="factory_override.name", read_only=True)
    colour_name = serializers.CharField(source="colour.name", read_only=True)
    purchase_order = serializers.PrimaryKeyRelatedField(
        queryset=PurchaseOrder.objects.all(), required=False
    )

    class Meta:
        model = Hit
        fields = [
            "id", "purchase_order", "po_number", "hit_number", "colour",
            "colour_name",
            "delivery_mode", "delivery_type", "factory_override", "factory_name",
            "original_delivery_date", "actual_delivery_date", "created_at"
        ]
        read_only_fields = ["id", "created_at", "hit_number"]

    def _purchase_order_from_context(self):
        po_id = self.context.get("purchase_order_id")
        if not po_id:
            return None
        try:
            return PurchaseOrder.objects.filter(pk=po_id).first()
        except (ValueError, ValidationError):
            return None

    def validate(self, attrs):
        tenant = self.context["request"].tenant
        # The nested route pins the purchase order; a body value is ignored.
        purchase_order = self._purchase_order_from_context() or attrs.get("purchase_order")
        if purchase_order is not None and tenant and purchase_order.tenant_id != tenant.id:
            raise serializers.ValidationError(
                {"purchase_order": "Purchase order not found in this tenant."}
            )
        colour = attrs.get("colour", getattr(self.instance, "colour", None))
        if purchase_order and colour:
            po_colours = set(
                purchase_order.items.values_list("color_id", flat=True)
            )
            if colour.id not in po_colours:
                raise serializers.ValidationError(
                    {"colour": "Colour must be one of this PO's item colours."}
                )
            qs = Hit.objects.filter(tenant=tenant, purchase_order=purchase_order, colour=colour)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError(
                    {"colour": "A hit already exists for this colour on this PO."}
                )
        return attrs


class FitSpecSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)

    class Meta:
        model = FitSpec
        fields = [
            "id", "purchase_order", "po_number", "fit_stage", "version",
            "measurements", "images", "notes", "is_current", "created_at"
        ]
        read_only_fields = ["id", "created_at", "version"]

    def validate_measurements(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Measurements must be a JSON object.")
        return value


class JobPriorityField(serializers.Field):
    """Accepts an integer value or its display label ('high' / 3)."""

    def to_representation(self, value):
        return value

    def to_internal_value(self, data):
        if isinstance(data, bool):
            raise serializers.ValidationError("Invalid priority.")
        if isinstance(data, int):
            if data not in [v for v, _ in JobPriority.choices]:
                raise serializers.ValidationError("Invalid priority.")
            return data
        if isinstance(data, str):
            try:
                value = int(data)
                if value in [v for v, _ in JobPriority.choices]:
                    return value
            except ValueError:
                pass
            label_map = {label.lower(): value for value, label in JobPriority.choices}
            if data.lower() in label_map:
                return label_map[data.lower()]
        raise serializers.ValidationError("Invalid priority.")


class JobRequestSerializer(serializers.ModelSerializer):
    style_number = serializers.CharField(source="style.style_number", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.username", read_only=True)
    priority = JobPriorityField()
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    job_type_display = serializers.CharField(source="get_job_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = JobRequest
        fields = [
            "id", "job_number", "job_type", "job_type_display", "style",
            "style_number", "purchase_order", "po_number", "description",
            "work_location", "assigned_to", "assigned_to_name",
            "required_by_date", "priority", "priority_display", "status",
            "status_display", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at", "job_number"]

    def validate_style(self, value):
        tenant = self.context["request"].tenant
        if tenant and value.tenant_id != tenant.id:
            raise serializers.ValidationError("Style not found in this tenant.")
        return value

    def validate_purchase_order(self, value):
        tenant = self.context["request"].tenant
        if tenant and value is not None and value.tenant_id != tenant.id:
            raise serializers.ValidationError("Purchase order not found in this tenant.")
        return value


class POAmendmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = POAmendment
        fields = [
            "id", "purchase_order", "amendment_number", "field_name",
            "old_value", "new_value", "reason", "status",
            "approved_by", "approved_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "amendment_number", "status", "approved_by", "approved_at"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    factory_name = serializers.CharField(source="factory.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    currency_name = serializers.CharField(source="currency.name", read_only=True)
    currency_code = serializers.CharField(source="currency.code", read_only=True)
    destination_country_name = serializers.CharField(source="destination_country.name", read_only=True)
    payment_terms_name = serializers.CharField(source="payment_terms.name", read_only=True)
    delivery_mode_name = serializers.CharField(source="delivery_mode.name", read_only=True)
    risk_level_detail = RiskLevelSerializer(source="risk_level", read_only=True)
    risk = serializers.SerializerMethodField()
    file_number = serializers.SerializerMethodField()
    style_number = serializers.SerializerMethodField()
    actual_completion_date = serializers.SerializerMethodField()

    def get_risk(self, obj):
        return risk_engine.compute_order_risk(obj)

    def get_file_number(self, obj):
        return obj.file_opening.file_number if obj.file_opening else None

    def get_style_number(self, obj):
        return obj.file_opening.style.style_number if obj.file_opening and obj.file_opening.style else None

    def get_actual_completion_date(self, obj):
        dates = obj.hits.exclude(actual_delivery_date=None).values_list(
            "actual_delivery_date", flat=True
        )
        return max(dates).isoformat() if dates else None

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "file_number", "style_number",
            "file_opening", "buyer", "buyer_name",
            "brand", "brand_name", "factory", "factory_name", "po_date", "delivery_date",
            "actual_completion_date",
            "destination_country", "destination_country_name", "destination_port",
            "quantity", "unit_price", "total_value",
            "currency", "currency_name", "currency_code",
            "payment_terms", "payment_terms_name",
            "delivery_mode", "delivery_mode_name",
            "status", "remarks", "items", "created_at",
            "risk_level", "risk_level_detail", "risk"
        ]
        read_only_fields = ["id", "created_at", "po_number", "total_value"]

    def to_internal_value(self, data):
        result = super().to_internal_value(data)
        for field in ["destination_country", "currency", "brand", "payment_terms", "delivery_mode", "file_opening"]:
            if field in self.initial_data and self.initial_data[field] == "":
                result[field] = None
        return result

    def create(self, validated_data):
        qty = validated_data.get("quantity") or 0
        price = validated_data.get("unit_price") or Decimal("0")
        validated_data["total_value"] = Decimal(str(qty)) * price
        return super().create(validated_data)


class BOMItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    uom_name = serializers.CharField(source="uom.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = BOMItem
        fields = [
            "id", "bom", "category", "item_name", "description", "uom", "uom_name",
            "consumption", "waste_percent", "unit_price", "vendor", "vendor_name",
            "supplier", "supplier_name", "ordered_qty", "delivered_qty",
            "eta_date", "confirmed_date", "actual_date", "status",
            "location", "colour", "width_size", "match",
            "line_total"
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "bom": {"required": False},
        }

    def get_line_total(self, obj):
        if obj.consumption and obj.unit_price:
            waste = (obj.waste_percent if obj.waste_percent is not None else Decimal("0")) / Decimal("100")
            return float(obj.consumption * obj.unit_price * (1 + waste))
        return None


class BOMSerializer(serializers.ModelSerializer):
    items = BOMItemSerializer(many=True)
    style_number = serializers.CharField(source="style_version.style.style_number", read_only=True)
    style_id = serializers.CharField(source="style_version.style.id", read_only=True)
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = BOM
        fields = ["id", "style_version", "style_number", "style_id", "name", "version", "status", "items", "total_cost", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_total_cost(self, obj):
        total = Decimal("0")
        for item in obj.items.all():
            if item.consumption and item.unit_price:
                waste = (item.waste_percent if item.waste_percent is not None else Decimal("0")) / Decimal("100")
                total += item.consumption * item.unit_price * (1 + waste)
        return float(total)

    def create(self, validated_data):
        from django.db.models import Max
        items_data = validated_data.pop("items", [])
        tenant = self.context["request"].tenant
        style_version = validated_data.get("style_version")
        last_version = BOM.objects.filter(
            tenant=tenant, style_version=style_version
        ).aggregate(m=Max("version"))["m"] or 0
        validated_data["version"] = last_version + 1
        bom = BOM.objects.create(tenant=tenant, created_by=self.context["request"].user, **validated_data)
        for item_data in items_data:
            BOMItem.objects.create(tenant=tenant, created_by=self.context["request"].user, bom=bom, **item_data)
        return bom

    def update(self, instance, validated_data):
        if instance.status in ("active", "archived"):
            raise serializers.ValidationError({"status": "Cannot edit an active or archived BOM. Create a new version instead."})
        items_data = validated_data.pop("items", None)
        tenant = self.context["request"].tenant

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                BOMItem.objects.create(tenant=tenant, created_by=self.context["request"].user, bom=instance, **item_data)

        return instance


class CostingLineSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default=None)
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = CostingLine
        fields = [
            "id", "costing", "category", "category_label", "description", "unit_price", "consumption",
            "is_additional", "original_description", "approved_by", "approved_by_name",
            "approved_at", "sort_order", "line_total", "size_width", "created_at"
        ]
        read_only_fields = ["id", "created_at", "approved_by", "approved_at"]

    def get_line_total(self, obj):
        return str(obj.line_total)

    def validate(self, attrs):
        if attrs.get("is_additional") and not attrs.get("original_description"):
            raise serializers.ValidationError({
                "original_description": "An additional cost line requires the original description."
            })
        return attrs


class CostingSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    bom_name = serializers.CharField(source="bom.name", read_only=True, default=None)
    bom_style_number = serializers.SerializerMethodField()
    margin_percent = serializers.SerializerMethodField()
    sheet_type_label = serializers.CharField(source="get_sheet_type_display", read_only=True)
    landed_cost = serializers.SerializerMethodField()
    single_size_watermark = serializers.BooleanField(read_only=True)
    is_live = serializers.BooleanField(default=True)
    lines = CostingLineSerializer(many=True, read_only=True)

    class Meta:
        model = Costing
        fields = [
            "id", "purchase_order", "po_number", "bom", "bom_name", "bom_style_number",
            "version", "status", "sheet_type", "sheet_type_label", "is_live",
            "exchange_rate", "landed_cost",
            "target_price", "fabric_cost", "trim_cost", "cm_cost",
            "overhead_cost", "total_cost", "margin", "margin_percent",
            "approved_by", "approved_at", "created_at", "lines",
            "notes", "is_single_size", "single_size_watermark", "size_ratio",
            "confirmed", "confirmed_by", "confirmed_at",
            "is_patterned", "patterned_fabric_options",
        ]
        read_only_fields = [
            "id", "created_at", "total_cost", "approved_by", "approved_at",
            "confirmed_by", "confirmed_at",
        ]

    def get_bom_style_number(self, obj):
        if obj.bom and obj.bom.style_version and obj.bom.style_version.style:
            return obj.bom.style_version.style.style_number
        return None

    def get_margin_percent(self, obj):
        if obj.total_cost and obj.target_price and obj.total_cost > 0:
            return round(float((obj.target_price - obj.total_cost) / obj.total_cost * 100), 2)
        return None

    def get_landed_cost(self, obj):
        return str(obj.landed_cost) if obj.landed_cost is not None else None

    def validate_patterned_fabric_options(self, value):
        allowed = {option for option, _ in Costing.PATTERN_OPTIONS}
        invalid = set(value) - allowed
        if invalid:
            raise serializers.ValidationError(
                f"Unknown pattern option(s): {sorted(invalid)}"
            )
        return value

    def validate_size_ratio(self, value):
        for entry in value:
            if not isinstance(entry, dict) or not entry.get("size", "").strip():
                raise serializers.ValidationError(
                    "Each size ratio entry requires a non-empty size."
                )
            ratio = entry.get("ratio")
            if not isinstance(ratio, (int, float)) or ratio <= 0:
                raise serializers.ValidationError(
                    "Each size ratio entry requires a positive numeric ratio."
                )
        return value

    def validate(self, attrs):
        is_patterned = attrs.get("is_patterned", self.instance.is_patterned if self.instance else False)
        options = attrs.get("patterned_fabric_options", self.instance.patterned_fabric_options if self.instance else [])
        if is_patterned and not options:
            raise serializers.ValidationError({
                "patterned_fabric_options": "A patterned fabric requires at least one of the 4 pattern options."
            })
        if not is_patterned and options:
            raise serializers.ValidationError({
                "patterned_fabric_options": "Pattern options can only be set when is_patterned is true."
            })
        return attrs

    def save(self, **kwargs):
        fabric = Decimal(str(self.validated_data.get("fabric_cost", 0)))
        trim = Decimal(str(self.validated_data.get("trim_cost", 0)))
        cm = Decimal(str(self.validated_data.get("cm_cost", 0)))
        overhead = Decimal(str(self.validated_data.get("overhead_cost", 0)))
        total = fabric + trim + cm + overhead
        self.validated_data["total_cost"] = total
        return super().save(**kwargs)


class DesignCostingLineSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = DesignCostingLine
        fields = [
            "id", "costing", "category", "category_label", "description",
            "unit_price", "consumption", "size_width", "sort_order", "line_total", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def get_line_total(self, obj):
        return str(obj.line_total)


class DesignCostingSerializer(serializers.ModelSerializer):
    """Style-level single-piece design costing (RQ-013 / G-12)."""
    style_number = serializers.CharField(source="style.style_number", read_only=True)
    style_name = serializers.CharField(source="style.name", read_only=True)
    sheet_type_label = serializers.CharField(source="get_sheet_type_display", read_only=True)
    margin_percent = serializers.SerializerMethodField()
    is_live = serializers.BooleanField(default=True)
    lines = DesignCostingLineSerializer(many=True, read_only=True)

    class Meta:
        model = DesignCosting
        fields = [
            "id", "style", "style_number", "style_name",
            "version", "status", "sheet_type", "sheet_type_label", "is_live",
            "target_price", "fabric_cost", "trim_cost", "cm_cost",
            "overhead_cost", "total_cost", "margin", "margin_percent",
            "is_single_size", "size_ratio", "is_patterned", "patterned_fabric_options",
            "approved_by", "approved_at", "created_at", "lines", "notes",
        ]
        read_only_fields = ["id", "created_at", "total_cost", "approved_by", "approved_at"]

    def get_margin_percent(self, obj):
        return obj.margin_percent

    def validate_patterned_fabric_options(self, value):
        allowed = {option for option, _ in DesignCosting.PATTERN_OPTIONS}
        invalid = set(value) - allowed
        if invalid:
            raise serializers.ValidationError(
                f"Unknown pattern option(s): {sorted(invalid)}"
            )
        return value

    def validate_size_ratio(self, value):
        for entry in value:
            if not isinstance(entry, dict) or not entry.get("size", "").strip():
                raise serializers.ValidationError(
                    "Each size ratio entry requires a non-empty size."
                )
            ratio = entry.get("ratio")
            if not isinstance(ratio, (int, float)) or ratio <= 0:
                raise serializers.ValidationError(
                    "Each size ratio entry requires a positive numeric ratio."
                )
        return value

    def validate(self, attrs):
        is_patterned = attrs.get("is_patterned", self.instance.is_patterned if self.instance else False)
        options = attrs.get("patterned_fabric_options", self.instance.patterned_fabric_options if self.instance else [])
        if is_patterned and not options:
            raise serializers.ValidationError({
                "patterned_fabric_options": "A patterned fabric requires at least one of the 4 pattern options."
            })
        if not is_patterned and options:
            raise serializers.ValidationError({
                "patterned_fabric_options": "Pattern options can only be set when is_patterned is true."
            })
        return attrs


class TAMilestoneSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True)

    class Meta:
        model = TAMilestone
        fields = [
            "id", "ta", "name", "description", "planned_date", "actual_date",
            "status", "assigned_to", "assigned_to_name", "is_critical", "sort_order",
            "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class TASerializer(serializers.ModelSerializer):
    milestones = TAMilestoneSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)

    class Meta:
        model = TA
        fields = [
            "id", "purchase_order", "po_number", "status", "delivery_date",
            "critical_path", "milestones", "created_at"
        ]
        read_only_fields = ["id", "created_at"]


class OrderManagerSerializer(serializers.Serializer):
    """RQ-028 (GC-019): per-order summary row for the Order Manager dashboard.

    Read-mostly aggregate over directly PO-linked surfaces (production jobs,
    fit specs, shipments/dockets/reconciliations/schedule items, gold seals).
    Risk is colour-coded for the critical-path review: 'risk' (red) /
    'watch' (amber) / 'ok' (green).
    """

    def to_representation(self, po):
        today = self.context.get("today", timezone.localdate())

        shipments = list(po.shipments.all()) if po.pk else []
        jobs = list(po.job_requests.all()) if po.pk else []
        fit_specs = list(po.fit_specs.all()) if po.pk else []
        current_fit = next((f for f in fit_specs if f.is_current), None)
        if current_fit is None and fit_specs:
            current_fit = fit_specs[0]

        production = {
            "total": len(jobs),
            "open": sum(
                1 for j in jobs if j.status in (JobStatus.PENDING, JobStatus.IN_PROGRESS)
            ),
            "overdue": sum(
                1 for j in jobs
                if j.status not in (JobStatus.COMPLETED, JobStatus.CANCELLED)
                and j.required_by_date and j.required_by_date < today
            ),
            "completed": sum(1 for j in jobs if j.status == JobStatus.COMPLETED),
        }

        technical = {
            "fit_stage": current_fit.fit_stage if current_fit else None,
            "fit_stage_label": (
                current_fit.get_fit_stage_display() if current_fit else "No Fit Spec"
            ),
        }

        dockets = [d for s in shipments for d in s.dockets.all()]
        dockets_tile = {
            "total": len(dockets),
            "final_raised": sum(1 for d in dockets if d.is_final),
            "over_limit_pending": sum(
                1 for d in dockets
                if d.is_final and (d.unused_fabric_meters or 0) > 200 and not d.sales_notified
            ),
        }

        reconciliations = [r for s in shipments for r in s.reconciliations.all()]
        pending = [r for r in reconciliations if r.requires_debit and r.status != "debited"]
        reconciliation_tile = {
            "pending_debits": len(pending),
            "shortage_units": str(sum((r.shortage_units for r in pending), Decimal("0"))),
        }

        schedule_items = [i for s in shipments for i in s.schedule_items.all()]
        items_total = len(schedule_items)
        items_delivered = sum(1 for i in schedule_items if i.status == "delivered")
        schedule_tile = {
            "items_total": items_total,
            "items_delivered": items_delivered,
            "delivered_pct": round(items_delivered / items_total * 100) if items_total else 0,
        }

        gold_seals = [gs for s in shipments for gs in s.gold_seals.all()]
        gold_seal = max(gold_seals, key=lambda gs: gs.created_at) if gold_seals else None
        gold_seal_tile = {
            "status": gold_seal.status if gold_seal else None,
            "status_label": gold_seal.get_status_display() if gold_seal else "None",
        }

        logistics_tile = {
            "shipments_total": len(shipments),
            "delivered": sum(1 for s in shipments if s.status == "delivered"),
            "in_transit": sum(
                1 for s in shipments if s.status not in ("delivered", "cancelled")
            ),
        }
        logistics_tile["delivered_pct"] = (
            round(logistics_tile["delivered"] / logistics_tile["shipments_total"] * 100)
            if logistics_tile["shipments_total"] else 0
        )

        flags = []
        if (
            po.status not in ("delivered", "cancelled")
            and po.delivery_date and po.delivery_date < today
        ):
            flags.append(f"Overdue completion ({po.delivery_date})")
        if production["overdue"]:
            flags.append(f"Overdue production jobs ({production['overdue']})")
        if reconciliation_tile["pending_debits"]:
            flags.append(f"Pending debit ({reconciliation_tile['pending_debits']})")
        if dockets_tile["over_limit_pending"]:
            flags.append("Fabric over 200 m not sent to sales")
        level = "risk" if flags else "ok"

        if level != "risk":
            if production["open"]:
                flags.append(f"Open production jobs ({production['open']})")
            if schedule_tile["items_total"] and schedule_tile["delivered_pct"] < 100:
                flags.append(f"Schedule {schedule_tile['delivered_pct']}% delivered")
            if current_fit and current_fit.fit_stage != FitStage.PP:
                flags.append(f"Fit at {current_fit.get_fit_stage_display()}")
            if gold_seal and gold_seal.status != "approved":
                flags.append("Gold seal not approved")
            if flags:
                level = "watch"

        return {
            "po_id": str(po.id),
            "po_number": po.po_number,
            "file_number": po.file_opening.file_number if po.file_opening else None,
            "buyer_name": po.buyer.name if po.buyer else None,
            "style_number": (
                po.file_opening.style.style_number
                if po.file_opening and po.file_opening.style else None
            ),
            "delivery_date": po.delivery_date.isoformat() if po.delivery_date else None,
            "quantity": po.quantity,
            "status": po.status,
            "status_label": po.get_status_display(),
            "production": production,
            "technical": technical,
            "logistics": logistics_tile,
            "dockets": dockets_tile,
            "reconciliation": reconciliation_tile,
            "schedule": schedule_tile,
            "gold_seal": gold_seal_tile,
            "critical_path": self._critical_path(po, today),
            "risk": {"level": level, "flags": flags},
        }

    def _critical_path(self, po, today):
        """Per-PO T&A critical-path milestone summary for the Order Manager.

        Derives on-track/off-track status from the authoritative T&A milestone
        plan (TAMilestone). No TA -> 'no-ta'; all milestones completed ->
        'complete'; any delayed or overdue-critical milestone -> 'off-track';
        otherwise 'on-track'.
        """
        ta = getattr(po, "ta", None)
        if ta is None or not ta.pk:
            return {
                "has_ta": False,
                "status": "no-ta",
                "milestones_total": 0,
                "milestones_completed": 0,
                "milestones_delayed": 0,
                "critical_milestones_total": 0,
                "critical_milestones_completed": 0,
                "next_milestone": None,
            }

        milestones = sorted(
            list(ta.milestones.all()),
            key=lambda m: (m.sort_order, m.planned_date or date.max, m.name),
        )
        total = len(milestones)
        completed = sum(1 for m in milestones if m.status == "completed")
        delayed = sum(1 for m in milestones if m.status == "delayed")
        critical_total = sum(1 for m in milestones if m.is_critical)
        critical_completed = sum(
            1 for m in milestones if m.is_critical and m.status == "completed"
        )

        overdue_critical = any(
            m.is_critical
            and m.status != "completed"
            and m.planned_date
            and m.planned_date < today
            for m in milestones
        )
        incomplete = [m for m in milestones if m.status != "completed"]
        next_milestone = min(
            incomplete,
            key=lambda m: (m.planned_date or date.max, m.name),
        ) if incomplete else None

        if total and completed == total:
            status = "complete"
        elif delayed or overdue_critical:
            status = "off-track"
        else:
            status = "on-track"

        return {
            "has_ta": True,
            "status": status,
            "milestones_total": total,
            "milestones_completed": completed,
            "milestones_delayed": delayed,
            "critical_milestones_total": critical_total,
            "critical_milestones_completed": critical_completed,
            "next_milestone": (
                {
                    "name": next_milestone.name,
                    "planned_date": next_milestone.planned_date.isoformat()
                    if next_milestone.planned_date else None,
                    "is_critical": next_milestone.is_critical,
                    "days_until": (
                        (next_milestone.planned_date - today).days
                        if next_milestone.planned_date else None
                    ),
                }
                if next_milestone else None
            ),
        }


# ---------------------------------------------------------------------------
# Design Sheet Serializers (Week 2)
# ---------------------------------------------------------------------------

class FitImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitImage
        fields = ["id", "fit_spec", "image", "caption", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class FitSpecificationSerializer(serializers.ModelSerializer):
    images = FitImageSerializer(many=True, read_only=True)

    class Meta:
        model = FitSpecification
        fields = [
            "id", "design_sheet", "fit_number", "fit_date", "description", "notes",
            "is_selected", "images", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DesignJobRequestSerializer(serializers.ModelSerializer):
    allocated_to_name = serializers.CharField(source="allocated_to.get_full_name", read_only=True, default="")
    design_sheet_number = serializers.CharField(
        source="design_sheet.tech_pack.techpack_number", read_only=True, default=""
    )

    class Meta:
        model = DesignJobRequest
        fields = [
            "id", "design_sheet", "design_sheet_number",
            "job_type", "required_by", "work_location",
            "no_of_garments", "allocated_to", "allocated_to_name",
            "notes", "status", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DesignSheetSerializer(serializers.ModelSerializer):
    fit_specs = FitSpecificationSerializer(many=True, read_only=True)
    job_requests = DesignJobRequestSerializer(many=True, read_only=True)
    style_id = serializers.CharField(source="tech_pack.style_id", read_only=True, default="")
    buyer_name = serializers.SerializerMethodField()
    file_number = serializers.CharField(source="tech_pack.techpack_number", read_only=True)
    sketch_url = serializers.SerializerMethodField()
    material_items = serializers.SerializerMethodField()
    season = serializers.CharField(source="tech_pack.style.season.name", read_only=True, default="")

    issue_date = serializers.DateField(source="tech_pack.issue_date", read_only=True, default=None, allow_null=True)
    block = serializers.CharField(source="tech_pack.block", read_only=True, default="")
    based_on = serializers.CharField(source="tech_pack.based_on", read_only=True, default="")
    customer = serializers.CharField(source="tech_pack.customer", read_only=True, default="")
    style_number = serializers.CharField(source="tech_pack.style_number", read_only=True, default="")
    size = serializers.CharField(source="tech_pack.size", read_only=True, default="")
    designer = serializers.CharField(source="tech_pack.designer", read_only=True, default="")
    pattern_cutter = serializers.CharField(source="tech_pack.pattern_cutter", read_only=True, default="")
    issuer = serializers.CharField(source="tech_pack.issuer", read_only=True, default="")
    cloth_code = serializers.CharField(source="tech_pack.cloth_code", read_only=True, default="")
    length = serializers.CharField(source="tech_pack.length", read_only=True, default="")
    sketch = serializers.CharField(source="tech_pack.sketch", read_only=True, default="")
    description = serializers.CharField(source="tech_pack.description", read_only=True, default="")
    note = serializers.CharField(source="tech_pack.note", read_only=True, default="")
    style_name = serializers.CharField(source="tech_pack.style.name", read_only=True, default="")
    department = serializers.CharField(
        source="tech_pack.style.department.name", read_only=True, default=""
    )
    style_code = serializers.CharField(source="tech_pack.style_code", read_only=True, default="")
    product_type_id = serializers.CharField(
        source="tech_pack.product_type_id", read_only=True, default=""
    )
    product_type_name = serializers.CharField(
        source="tech_pack.product_type.name", read_only=True, default=""
    )
    product_category_name = serializers.CharField(
        source="tech_pack.product_type.category.name", read_only=True, default=""
    )
    buyer_id = serializers.CharField(source="tech_pack.buyer_id", read_only=True, default="")
    relationship = serializers.CharField(
        source="tech_pack.relationship", read_only=True, default="new"
    )
    risk_date = serializers.DateField(
        source="tech_pack.risk_date", read_only=True, default=None, allow_null=True
    )
    pattern_request_date = serializers.DateField(
        source="tech_pack.pattern_request_date", read_only=True, default=None, allow_null=True
    )
    live_orders_count = serializers.SerializerMethodField()
    completed_orders_count = serializers.SerializerMethodField()
    layout_order = serializers.JSONField(required=False)

    class Meta:
        model = DesignSheet
        fields = [
            "id", "tech_pack", "status", "style_code", "buyer_name",
            "file_number", "sketch_url", "fit_specs", "job_requests",
            "material_items", "style_id", "season",
            "issue_date", "block", "based_on", "customer", "style_number",
            "size", "designer", "pattern_cutter", "issuer", "cloth_code",
            "length", "sketch", "description", "note", "sketch_annotations",
            "layout_order", "created_at", "updated_at",
            "style_name", "department", "product_category_name",
            "risk_date", "pattern_request_date", "relationship",
            "style_code", "product_type_id", "product_type_name", "buyer_id",
            "live_orders_count", "completed_orders_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_layout_order(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "layout_order must be a list of block keys"
            )
        if set(value) != set(DesignSheet.BLOCK_KEYS):
            raise serializers.ValidationError(
                "layout_order must contain exactly the design-sheet blocks "
                f"{DesignSheet.BLOCK_KEYS}"
            )
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("layout_order"):
            data["layout_order"] = list(DesignSheet.BLOCK_KEYS)
        if not data.get("style_code"):
            style = (
                instance.tech_pack.style
                if instance.tech_pack and instance.tech_pack.style_id
                else None
            )
            if style:
                data["style_code"] = style.style_number
        return data

    def get_buyer_name(self, obj):
        return obj.tech_pack.buyer_display_name()

    def get_sketch_url(self, obj):
        if obj.tech_pack.sketch_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.tech_pack.sketch_image.url)
            return obj.tech_pack.sketch_image.url
        return None

    def get_live_orders_count(self, obj):
        from apps.merchandising.design_register import order_counts_for_style

        live, _ = order_counts_for_style(obj.tech_pack.style)
        return live

    def get_completed_orders_count(self, obj):
        from apps.merchandising.design_register import order_counts_for_style

        _, completed = order_counts_for_style(obj.tech_pack.style)
        return completed

    def get_material_items(self, obj):
        """Material Breakdown grid rows (BOMItems) in grid field names.

        Uses the techpack's style → latest style version → BOM (active BOM
        preferred, otherwise the latest by version). Any grid edit is written
        back against the returned ``id`` through ``PATCH /bom-items/{id}/``.
        """
        techpack = obj.tech_pack
        style = techpack.style if techpack.style_id else None
        if not style:
            return []
        style_version = style.versions.order_by("-version_number").first()
        if not style_version:
            return []
        bom = (
            BOM.objects.filter(
                tenant=obj.tenant, style_version=style_version, status="active",
            ).order_by("-version").first()
            or BOM.objects.filter(
                tenant=obj.tenant, style_version=style_version,
            ).order_by("-version").first()
        )
        if not bom:
            return []
        items = BOMItem.objects.filter(tenant=obj.tenant, bom=bom).order_by("id")
        return [
            {
                "id": str(item.id),
                "bom_id": str(bom.id),
                "type": item.category,
                "description_code": item.item_name,
                "location": item.location or "",
                "supplier": (
                    item.supplier.name
                    if item.supplier
                    else (item.vendor.name if item.vendor else "")
                ),
                "colour": item.colour or "",
                "width_size": item.width_size or "",
                "qty": float(item.ordered_qty) if item.ordered_qty is not None else None,
                "match": item.match or "",
            }
            for item in items
        ]


class DesignInitSerializer(serializers.Serializer):
    """Paylod for the Design register "+ New Design" flow."""

    mode = serializers.ChoiceField(choices=["fresh", "copy"])
    source_design_sheet = serializers.UUIDField(required=False, allow_null=True)
    product_type = serializers.UUIDField(required=False, allow_null=True)
    buyer = serializers.UUIDField(required=False, allow_null=True)
    relationship = serializers.ChoiceField(
        choices=StyleTechPack.Relationship.choices, default=StyleTechPack.Relationship.NEW,
        required=False,
    )
    block_reference = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    include_annotation = serializers.BooleanField(required=False, default=False)
    include_notes = serializers.BooleanField(required=False, default=False)
