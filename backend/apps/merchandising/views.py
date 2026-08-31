"""
Merchandising views for BHMS.
"""
import csv
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from io import StringIO

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Count, Max, Q
from django.http import FileResponse, HttpResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.commercial.models import ProformaInvoice, SalesContract
from apps.core.pagination import StandardResultsSetPagination
from apps.core.permissions import HasPermission
from apps.setup.models import Buyer, ColorCode, Factory

from .models import (
    BOM,
    TA,
    BOMItem,
    Costing,
    CostingLine,
    DesignImage,
    DesignJobRequest,
    DesignSheet,
    FileOpening,
    FileOpeningNote,
    FitImage,
    FitSpec,
    FitSpecification,
    Hit,
    JobPriority,
    JobRequest,
    JobStatus,
    JobType,
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
from .serializers import (
    BOMItemSerializer,
    BOMSerializer,
    CostingLineSerializer,
    CostingSerializer,
    DesignImageSerializer,
    DesignJobRequestSerializer,
    DesignSheetSerializer,
    FileOpeningNoteSerializer,
    FileOpeningSerializer,
    FitImageSerializer,
    FitSpecificationSerializer,
    FitSpecSerializer,
    HitSerializer,
    JobRequestSerializer,
    OrderManagerSerializer,
    POAmendmentSerializer,
    PurchaseOrderItemSerializer,
    PurchaseOrderSerializer,
    StockFabricAllocationSerializer,
    StyleItemSerializer,
    StyleSerializer,
    StyleTechPackSerializer,
    StyleVersionSerializer,
    TAMilestoneSerializer,
    TASerializer,
)
from .services import NoCurrentFitSpecError, NoTrimItemsError, copy_fit_spec, copy_trim_items
from .techpack.excel_export import write_techpack_workbook
from .techpack.excel_import import parse_techpack_workbook
from .techpack.image_utils import process_sketch_image
from .techpack.import_service import import_style_from_techpack
from .techpack.pdf_parser import StyleTechPackParser

EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

STYLE_TRANSITIONS = {
    "active": {"from": ["draft"], "label": "Activate"},
    "approved": {"from": ["active"], "label": "Approve"},
    "archived": {"from": ["approved", "active", "draft"], "label": "Archive"},
}

PO_TRANSITIONS = {
    "confirmed": {"from": ["draft", "open"], "label": "Confirm"},
    "in_production": {"from": ["confirmed"], "label": "Start Production"},
    "quality_check": {"from": ["in_production"], "label": "Quality Check"},
    "ready": {"from": ["quality_check"], "label": "Mark Ready"},
    "shipped": {"from": ["ready"], "label": "Ship"},
    "delivered": {"from": ["shipped"], "label": "Deliver"},
    "cancelled": {"from": ["draft", "open", "confirmed", "in_production"], "label": "Cancel"},
}


def _resolve_tenant_buyer(request, raw_buyer):
    """Resolve a buyer id from request data against the request tenant."""
    if raw_buyer is None or str(raw_buyer).strip() == "":
        return None
    try:
        return Buyer.objects.get(tenant=request.tenant, id=raw_buyer)
    except (Buyer.DoesNotExist, ValidationError, TypeError):
        return None


class StyleViewSet(viewsets.ModelViewSet):
    queryset = Style.objects.all()
    serializer_class = StyleSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["style_number", "name"]
    filterset_fields = ["status", "buyer", "season"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "extract_techpack": "merchandising:create",
        "techpack_excel": "merchandising:view",
        "import_techpack": "merchandising:create",
        "tech_packs": "merchandising:view",
    }

    def get_queryset(self):
        return Style.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        last = Style.objects.filter(tenant=tenant).order_by("-created_at").first() if tenant else None
        if last and last.style_number.startswith("STY-"):
            try:
                num = int(last.style_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                num = 1001
        else:
            num = 1001
        serializer.save(tenant=tenant, style_number=f"STY-{num:04d}", created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        style = self.get_object()
        versions = StyleVersion.objects.filter(tenant=request.tenant, style=style)
        serializer = StyleVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def file_openings(self, request, pk=None):
        style = self.get_object()
        fos = FileOpening.objects.filter(tenant=request.tenant, style=style)
        serializer = FileOpeningSerializer(fos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def purchase_orders(self, request, pk=None):
        style = self.get_object()
        fos = FileOpening.objects.filter(tenant=request.tenant, style=style).values_list("id", flat=True)
        pos = PurchaseOrder.objects.filter(tenant=request.tenant, file_opening_id__in=fos)
        serializer = PurchaseOrderSerializer(pos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def boms(self, request, pk=None):
        style = self.get_object()
        svs = StyleVersion.objects.filter(tenant=request.tenant, style=style).values_list("id", flat=True)
        boms = BOM.objects.filter(tenant=request.tenant, style_version_id__in=svs)
        serializer = BOMSerializer(boms, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def items(self, request, pk=None):
        style = self.get_object()
        items = StyleItem.objects.filter(tenant=request.tenant, style=style)
        serializer = StyleItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def design_images(self, request, pk=None):
        style = self.get_object()
        images = DesignImage.objects.filter(tenant=request.tenant, style=style)
        serializer = DesignImageSerializer(images, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def tech_packs(self, request, pk=None):
        style = self.get_object()
        techpacks = StyleTechPack.objects.filter(tenant=request.tenant, style=style)
        serializer = StyleTechPackSerializer(techpacks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="upload-tech-pack")
    def upload_tech_pack(self, request, pk=None):
        style = self.get_object()
        file = request.FILES.get("tech_pack")
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        style.tech_pack = file
        style.save(update_fields=["tech_pack"])
        return Response({"tech_pack": style.tech_pack.url})

    @action(detail=False, methods=["post"], url_path="techpack/extract")
    def extract_techpack(self, request):
        """Parse an uploaded buyer PDF into an editable tech-pack workbook (RQ-040).

        Creates a ``StyleTechPack`` in ``extracted`` state holding the raw
        extraction payload + normalized design-sheet fields, generates the
        two-sheet Excel (RQ-037), and returns a download URL for it.
        """
        upload = request.FILES.get("file")
        if not upload:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        buyer = _resolve_tenant_buyer(request, request.data.get("buyer"))
        if buyer is None:
            return Response({"error": "A valid buyer is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            doc = StyleTechPackParser().parse(upload)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if doc.errors:
            return Response({"error": "; ".join(doc.errors)}, status=status.HTTP_400_BAD_REQUEST)

        techpack = StyleTechPack.objects.create(
            tenant=request.tenant,
            techpack_number=StyleTechPack.next_techpack_number(request.tenant),
            source_pdf=upload,
            created_by=request.user,
        )
        techpack.mark_extracted(doc.to_dict())
        design = doc.design_info
        for field in (
            "issue_date", "block", "based_on", "customer", "style_number", "size",
            "designer", "pattern_cutter", "issuer", "cloth_code", "length",
            "sketch", "description", "note",
        ):
            setattr(techpack, field, getattr(design, field))
        techpack.excel_file.save(
            f"{techpack.techpack_number}.xlsx", ContentFile(write_techpack_workbook(doc).getvalue())
        )
        return Response(
            {
                "id": techpack.id,
                "techpack_number": techpack.techpack_number,
                "status": techpack.status,
                "data": doc.to_dict(),
                "excel_download_url": request.build_absolute_uri(
                    reverse("style-techpack_excel") + f"?techpack={techpack.id}"
                ),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="techpack/excel", url_name="techpack_excel")
    def techpack_excel(self, request):
        """Download the generated workbook for a tech-pack (RQ-040)."""
        try:
            techpack = StyleTechPack.objects.get(
                tenant=request.tenant, id=request.query_params.get("techpack")
            )
        except (StyleTechPack.DoesNotExist, ValidationError, TypeError):
            return Response({"error": "Tech-pack not found"}, status=status.HTTP_404_NOT_FOUND)
        if not techpack.excel_file:
            return Response({"error": "No Excel generated yet"}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            techpack.excel_file.open("rb"),
            content_type=EXCEL_MIME,
            as_attachment=True,
            filename=f"{techpack.techpack_number}.xlsx",
        )

    @action(detail=False, methods=["post"], url_path="techpack/import")
    def import_techpack(self, request):
        """Import a (possibly hand-edited) workbook into styles/BOM (RQ-040).

        Creates or updates the Style, a new StyleVersion, StyleItems, and a BOM
        with its BOMItems — all in one atomic transaction. An optional
        ``techpack`` id links the import to its ``StyleTechPack`` and completes it.
        """
        upload = request.FILES.get("file")
        if not upload:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        buyer = _resolve_tenant_buyer(request, request.data.get("buyer"))
        if buyer is None:
            return Response({"error": "A valid buyer is required"}, status=status.HTTP_400_BAD_REQUEST)

        techpack = None
        techpack_id = request.data.get("techpack")
        if techpack_id:
            try:
                techpack = StyleTechPack.objects.get(tenant=request.tenant, id=techpack_id)
            except (StyleTechPack.DoesNotExist, ValidationError, TypeError):
                return Response({"error": "Tech-pack not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            doc = parse_techpack_workbook(upload)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if doc.errors:
            return Response({"error": "; ".join(doc.errors)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                result = import_style_from_techpack(
                    tenant=request.tenant, user=request.user, buyer=buyer,
                    doc=doc, techpack=techpack,
                )
        except Exception:
            return Response(
                {"error": "Import failed — no changes were saved"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "style": {
                    "id": result.style.id,
                    "style_number": result.style.style_number,
                    "name": result.style.name,
                },
                "style_version": {
                    "id": result.style_version.id,
                    "version_number": result.style_version.version_number,
                },
                "bom": {
                    "id": result.bom.id,
                    "name": result.bom.name,
                    "version": result.bom.version,
                },
                "design_sheet": (
                    {
                        "id": result.design_sheet.id,
                        "status": result.design_sheet.status,
                    }
                    if result.design_sheet is not None else None
                ),
                "created": result.created,
                "style_items_created": len(result.style_items),
                "bom_items_created": len(result.bom_items),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["put", "patch"], url_path="techpack/(?P<techpack_id>[^/.]+)/sketch")
    def techpack_sketch(self, request, techpack_id=None):
        """Upload/update sketch image for a tech-pack."""
        try:
            techpack = StyleTechPack.objects.get(
                tenant=request.tenant, id=techpack_id
            )
        except StyleTechPack.DoesNotExist:
            return Response({"error": "Tech-pack not found"}, status=status.HTTP_404_NOT_FOUND)

        sketch_file = request.FILES.get("sketch_image")
        if not sketch_file:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate image type
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if sketch_file.content_type not in allowed_types:
            return Response(
                {"error": f"Invalid image type. Allowed: {', '.join(allowed_types)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate image size (max 10MB)
        if sketch_file.size > 10 * 1024 * 1024:
            return Response({"error": "Image too large. Max 10MB"}, status=status.HTTP_400_BAD_REQUEST)

        main_bytes, thumb_bytes = process_sketch_image(sketch_file.read())
        main_name = sketch_file.name.rsplit(".", 1)[0] or "sketch"

        techpack.sketch_image.save(
            f"{main_name}.jpg", ContentFile(main_bytes), save=False
        )
        techpack.sketch_thumbnail.save(
            f"{main_name}_thumb.png", ContentFile(thumb_bytes), save=False
        )
        techpack.save(update_fields=["sketch_image", "sketch_thumbnail", "updated_at"])

        return Response({
            "sketch_image_url": request.build_absolute_uri(techpack.sketch_image.url),
            "sketch_thumbnail_url": request.build_absolute_uri(techpack.sketch_thumbnail.url),
            "message": "Sketch uploaded successfully",
        })

    @action(detail=False, methods=["put", "patch"], url_path="techpack/(?P<techpack_id>[^/.]+)/notes")
    def techpack_notes(self, request, techpack_id=None):
        """Update notes with initials and auto-timestamp."""
        try:
            techpack = StyleTechPack.objects.get(
                tenant=request.tenant, id=techpack_id
            )
        except StyleTechPack.DoesNotExist:
            return Response({"error": "Tech-pack not found"}, status=status.HTTP_404_NOT_FOUND)

        note = request.data.get("note")
        initials = request.data.get("notes_initials")

        if note is not None:
            techpack.note = note
        if initials is not None:
            techpack.notes_initials = initials
            techpack.notes_date = timezone.now()

        techpack.save(update_fields=["note", "notes_initials", "notes_date", "updated_at"])

        return Response({
            "note": techpack.note,
            "notes_initials": techpack.notes_initials,
            "notes_date": techpack.notes_date,
            "message": "Notes updated successfully",
        })

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        style = self.get_object()
        new_status = request.data.get("status")
        if not new_status or new_status not in STYLE_TRANSITIONS:
            valid = list(STYLE_TRANSITIONS.keys())
            return Response(
                {"error": f"Invalid status. Valid: {valid}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        transition = STYLE_TRANSITIONS[new_status]
        if style.status not in transition["from"]:
            return Response(
                {"error": f"Cannot transition from '{style.status}' to '{new_status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        style.status = new_status
        style.save(update_fields=["status"])
        return Response({"status": style.status, "message": f"Style {transition['label'].lower()} successfully"})


class DesignImageViewSet(viewsets.ModelViewSet):
    queryset = DesignImage.objects.all()
    serializer_class = DesignImageSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["caption", "colourway"]
    filterset_fields = ["style", "role", "is_main"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "set_main": "merchandising:edit",
    }

    def get_queryset(self):
        queryset = DesignImage.objects.all()
        if self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset

    def _get_style(self):
        style_id = self.request.data.get("style")
        if not style_id:
            return None
        queryset = Style.objects.all()
        if self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset.filter(pk=style_id).first()

    def perform_create(self, serializer):
        style = self._get_style()
        if style is None:
            raise serializers.ValidationError(
                {"style": "Style not found in this tenant."}
            )
        tenant = self.request.tenant
        if serializer.validated_data.get("is_main"):
            DesignImage.objects.filter(tenant=tenant, style=style, is_main=True).update(is_main=False)
        serializer.save(tenant=tenant, style=style, created_by=self.request.user)

    def perform_update(self, serializer):
        tenant = self.request.tenant
        if serializer.validated_data.get("is_main") and getattr(serializer.instance, "is_main", False) is False:
            DesignImage.objects.filter(
                tenant=tenant, style=serializer.instance.style, is_main=True,
            ).exclude(pk=serializer.instance.pk).update(is_main=False)
        serializer.save(tenant=tenant)

    @action(detail=True, methods=["post"])
    def set_main(self, request, pk=None):
        image = self.get_object()
        DesignImage.objects.filter(
            tenant=request.tenant, style=image.style, is_main=True,
        ).exclude(pk=image.pk).update(is_main=False)
        image.is_main = True
        image.save(update_fields=["is_main"])
        return Response({"id": str(image.id), "is_main": True})


class StyleItemViewSet(viewsets.ModelViewSet):
    queryset = StyleItem.objects.all()
    serializer_class = StyleItemSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["item_name", "category"]
    filterset_fields = ["style", "category"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return StyleItem.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)


class StyleVersionViewSet(viewsets.ModelViewSet):
    queryset = StyleVersion.objects.all()
    serializer_class = StyleVersionSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["style__style_number"]
    filterset_fields = ["status", "style"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return StyleVersion.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        style = serializer.validated_data["style"]
        last_ver = StyleVersion.objects.filter(tenant=tenant, style=style).order_by("-version_number").first()
        next_ver = (last_ver.version_number + 1) if last_ver else 1
        serializer.save(tenant=tenant, version_number=next_ver, created_by=self.request.user)
        style.current_version = next_ver
        style.save(update_fields=["current_version"])


class FileOpeningViewSet(viewsets.ModelViewSet):
    queryset = FileOpening.objects.all()
    serializer_class = FileOpeningSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["file_number"]
    filterset_fields = ["status", "buyer", "factory", "style", "is_quick_lead", "is_repeat", "is_stock_fabric"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "quick_lead": "merchandising:edit", "unmark_quick_lead": "merchandising:edit",
        "agree_quick_lead": "merchandising:edit",
        "quick_lead_status": "merchandising:view",
        "create_repeat": "merchandising:create", "approve_repeat": "merchandising:edit",
        "repeat_status": "merchandising:view",
        "mark_as_stock_fabric": "merchandising:edit",
        "allocate_stock": "merchandising:edit",
        "stock_status": "merchandising:view",
    }

    def get_queryset(self):
        tenant = self.request.tenant
        qs = FileOpening.objects.filter(tenant=tenant)
        return qs.annotate(purchase_orders_count=Count("purchase_orders")).prefetch_related("stock_allocations")

    def perform_create(self, serializer):
        tenant = self.request.tenant
        serializer.save(
            tenant=tenant,
            file_number=FileOpening.next_file_number(tenant),
            created_by=self.request.user,
        )

    @action(detail=True, methods=["get"])
    def purchase_orders(self, request, pk=None):
        fo = self.get_object()
        pos = PurchaseOrder.objects.filter(tenant=request.tenant, file_opening=fo)
        serializer = PurchaseOrderSerializer(pos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate a file opening with new file number."""
        original = self.get_object()
        new_file = FileOpening.objects.create(
            tenant=request.tenant,
            created_by=request.user,
            style=original.style,
            style_version=original.style_version,
            buyer=original.buyer,
            brand=original.brand,
            factory=original.factory,
            file_date=original.file_date,
            status="draft",
            remarks=f"Duplicated from {original.file_number}",
        )
        return Response({"id": new_file.id, "file_number": new_file.file_number})

    @action(detail=True, methods=["post"])
    def quick_lead(self, request, pk=None):
        """Mark a file opening as a quick lead time order (yellow risk)."""
        fo = self.get_object()
        if not fo.is_quick_lead:
            fo.is_quick_lead = True
            fo.save(update_fields=["is_quick_lead", "updated_at"])
        return Response(FileOpeningSerializer(fo, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def unmark_quick_lead(self, request, pk=None):
        """Remove the quick lead marking and clear all agreements."""
        fo = self.get_object()
        fo.unmark_quick_lead()
        return Response(FileOpeningSerializer(fo, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def agree_quick_lead(self, request, pk=None):
        """Record a party's agreement to quick lead deadlines/ways of working."""
        fo = self.get_object()
        party = (request.data.get("party") or "").strip()
        if not party:
            return Response({"error": "party is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not fo.is_quick_lead:
            return Response(
                {"error": "File opening is not marked as quick lead"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if party not in fo.QUICK_LEAD_PARTIES:
            return Response(
                {"error": f"party must be one of {fo.QUICK_LEAD_PARTIES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        fo.add_agreement(party)
        return Response(FileOpeningSerializer(fo, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def quick_lead_status(self, request, pk=None):
        fo = self.get_object()
        return Response({
            "is_quick_lead": fo.is_quick_lead,
            "agreed_by": fo.quick_lead_agreed_by,
            "required_parties": fo.QUICK_LEAD_PARTIES,
            "agreement_complete": fo.quick_lead_agreement_complete,
            "missing_agreements": fo.missing_agreements,
        })

    @action(detail=True, methods=["post"])
    def create_repeat(self, request, pk=None):
        """Raise a repeat of this file opening, linked back to the original FN."""
        original = self.get_object()
        repeat = original.create_repeat()
        return Response(FileOpeningSerializer(repeat, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def approve_repeat(self, request, pk=None):
        """Record a department's confirmation that this order is a direct repeat."""
        fo = self.get_object()
        party = (request.data.get("party") or "").strip()
        if not party:
            return Response({"error": "party is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not fo.is_repeat:
            return Response(
                {"error": "File opening is not a repeat"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if party not in fo.REPEAT_APPROVAL_PARTIES:
            return Response(
                {"error": f"party must be one of {fo.REPEAT_APPROVAL_PARTIES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        fo.add_repeat_approval(party)
        return Response(FileOpeningSerializer(fo, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def repeat_status(self, request, pk=None):
        fo = self.get_object()
        return Response({
            "is_repeat": fo.is_repeat,
            "original_fn": str(fo.original_fn_id) if fo.original_fn_id else None,
            "original_fn_number": fo.original_fn_number,
            "approved_by": fo.repeat_approved_by,
            "required_parties": fo.REPEAT_APPROVAL_PARTIES,
            "approval_complete": fo.repeat_approval_complete,
            "missing_approvals": fo.missing_repeat_approvals,
        })

    @action(detail=True, methods=["post"])
    def mark_as_stock_fabric(self, request, pk=None):
        fo = self.get_object()
        description = request.data.get("stock_fabric_description", "")
        try:
            total = request.data.get("total_meters")
            if total is None:
                return Response({"error": "total_meters is required"}, status=status.HTTP_400_BAD_REQUEST)
            total = Decimal(str(total))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"error": "total_meters must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fo.mark_as_stock_fabric(description, total)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(fo).data)

    @action(detail=True, methods=["post"])
    def allocate_stock(self, request, pk=None):
        fo = self.get_object()
        allocated_to = request.data.get("allocated_to")
        meters_raw = request.data.get("meters")
        notes = request.data.get("notes", "")
        if not allocated_to:
            return Response({"error": "allocated_to is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            meters = Decimal(str(meters_raw))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"error": "meters must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)
        target = FileOpening.objects.filter(
            pk=allocated_to, tenant=request.tenant
        ).first()
        if target is None:
            return Response({"error": "Allocation target not found"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fo.allocate_stock(target, meters, notes=notes)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(fo).data)

    @action(detail=True, methods=["get"])
    def stock_status(self, request, pk=None):
        fo = self.get_object()
        allocations = StockFabricAllocation.objects.filter(tenant=request.tenant, stock=fo)
        return Response({
            "is_stock_fabric": fo.is_stock_fabric,
            "stock_fabric_description": fo.stock_fabric_description,
            "total_meters": fo.total_meters,
            "allocated_meters": fo.allocated_meters,
            "stock_balance_meters": fo.stock_balance_meters,
            "allocations": StockFabricAllocationSerializer(
                allocations, many=True, context=self.get_serializer_context()
            ).data,
        })

    @action(detail=True, methods=["post"])
    def close_file(self, request, pk=None):
        file = self.get_object()
        if file.status in ("cancelled",):
            return Response({"error": "Cannot close a cancelled file"}, status=status.HTTP_400_BAD_REQUEST)
        file.status = "closed"
        file.save(update_fields=["status"])
        return Response({"status": "closed"})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        file = self.get_object()
        if file.status == "closed":
            return Response({"error": "Cannot cancel a closed file"}, status=status.HTTP_400_BAD_REQUEST)
        file.status = "cancelled"
        file.save(update_fields=["status"])
        return Response({"status": "cancelled"})

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        file = self.get_object()
        import csv
        from io import StringIO
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["File Number", file.file_number])
        writer.writerow(["Style", str(file.style)])
        writer.writerow(["Buyer", str(file.buyer)])
        writer.writerow(["Factory", str(file.factory)])
        writer.writerow(["Status", file.status])
        writer.writerow(["Remarks", file.remarks or ""])
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="file_{file.file_number}.csv"'
        return response

    @action(detail=True, methods=["get", "post"])
    def notes(self, request, pk=None):
        fo = self.get_object()
        if request.method == "GET":
            notes = FileOpeningNote.objects.filter(
                tenant=request.tenant, file_opening=fo, is_active=True
            )
            serializer = FileOpeningNoteSerializer(notes, many=True)
            return Response(serializer.data)
        serializer = FileOpeningNoteSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(
            tenant=request.tenant,
            file_opening=fo,
            author=request.user,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def _parse_date(value: str):
    """Try common date formats: YYYY-MM-DD, M/D/YYYY, DD/MM/YYYY, YYYY/MM/DD, MM-DD-YYYY."""
    value = value.strip()
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%m-%d-%Y", "%d-%m-%Y", "%m.%d.%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    pagination_class = StandardResultsSetPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    search_fields = ["po_number"]
    filterset_fields = ["status", "buyer", "factory", "file_opening", "file_opening__style"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "order_manager": "merchandising:view",
    }

    def get_queryset(self):
        return PurchaseOrder.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        last_po = PurchaseOrder.objects.filter(tenant=tenant).order_by("-created_at").first()
        if last_po and last_po.po_number.startswith("PO-"):
            try:
                num = int(last_po.po_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                num = 1001
        else:
            num = 1001

        quantity = serializer.validated_data.get("quantity", 0)
        unit_price = serializer.validated_data.get("unit_price", 0)
        from decimal import Decimal
        total = Decimal(str(quantity)) * Decimal(str(unit_price))

        serializer.save(
            tenant=tenant, po_number=f"PO-{num:04d}",
            total_value=total, created_by=self.request.user
        )

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def bulk_import(self, request):
        """Bulk import POs from a CSV file.

        CSV columns: buyer_name,factory_name,po_date,delivery_date,color_name,size,quantity,unit_price,remarks
        Rows with the same buyer/factory/po_date/delivery_date are grouped into a single PO.
        """
        upload = request.FILES.get("file")
        if not upload:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw = upload.read()
            # Strip BOM (Excel CSVs often include it)
            if raw.startswith(b'\xef\xbb\xbf'):
                raw = raw[3:]
            decoded = raw.decode("utf-8")
        except UnicodeDecodeError:
            try:
                decoded = raw.decode("latin-1")
            except Exception:
                return Response({"error": "File must be UTF-8 or Latin-1 encoded"}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(StringIO(decoded))

        # Strip whitespace and BOM from header names
        if reader.fieldnames:
            reader.fieldnames = [fn.strip().strip('\ufeff') for fn in reader.fieldnames]

        required_headers = {
            "buyer_name", "factory_name", "po_date", "delivery_date",
            "color_name", "size", "quantity", "unit_price",
        }
        if not reader.fieldnames:
            return Response({"error": "CSV file is empty"}, status=status.HTTP_400_BAD_REQUEST)
        if not required_headers.issubset(set(reader.fieldnames)):
            missing = required_headers - set(reader.fieldnames)
            return Response(
                {"error": f"Missing required columns: {', '.join(sorted(missing))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tenant = request.tenant

        # ── Phase 1: parse & group rows by PO key ────────────────────────────
        po_groups: dict[tuple, list[tuple[int, dict]]] = defaultdict(list)
        parse_errors: list[dict] = []
        row_number = 0

        for row in reader:
            row_number += 1
            try:
                key = (
                    row["buyer_name"].strip(),
                    row["factory_name"].strip(),
                    row["po_date"].strip(),
                    row["delivery_date"].strip(),
                )
                po_groups[key].append((row_number, row))
            except KeyError as exc:
                parse_errors.append({"row": row_number, "error": f"Missing field: {exc}"})

        if not po_groups and parse_errors:
            return Response(
                {"success": 0, "errors": parse_errors, "created_pos": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Phase 2: create POs ──────────────────────────────────────────────
        success_count = 0
        created_pos: list[dict] = []
        all_errors = list(parse_errors)

        for (buyer_name, factory_name, po_date_str, delivery_date_str), rows in po_groups.items():
            group_errors: list[dict] = []
            items_data: list[dict] = []

            # Buyer lookup
            try:
                buyer = Buyer.objects.get(tenant=tenant, name__iexact=buyer_name)
            except Buyer.DoesNotExist:
                available = list(Buyer.objects.filter(tenant=tenant).values_list("name", flat=True)[:20])
                avail_str = f" Available: {', '.join(available)}" if available else " No buyers exist in the system."
                for rn, _ in rows:
                    group_errors.append({"row": rn, "error": f"Buyer '{buyer_name}' not found. {avail_str}"})
                all_errors.extend(group_errors)
                continue

            # Factory lookup
            try:
                factory = Factory.objects.get(tenant=tenant, name__iexact=factory_name)
            except Factory.DoesNotExist:
                available = list(Factory.objects.filter(tenant=tenant).values_list("name", flat=True)[:20])
                avail_str = f" Available: {', '.join(available)}" if available else " No factories exist in the system."
                for rn, _ in rows:
                    group_errors.append({"row": rn, "error": f"Factory '{factory_name}' not found. {avail_str}"})
                all_errors.extend(group_errors)
                continue

            # Parse PO date
            po_date = _parse_date(po_date_str)
            if po_date is None:
                for rn, _ in rows:
                    group_errors.append({"row": rn, "error": f"Invalid PO date: '{po_date_str}'. Use YYYY-MM-DD, M/D/YYYY, or DD/MM/YYYY"})
                all_errors.extend(group_errors)
                continue

            # Parse delivery date
            delivery_date = _parse_date(delivery_date_str)
            if delivery_date is None:
                for rn, _ in rows:
                    group_errors.append({"row": rn, "error": f"Invalid delivery date: '{delivery_date_str}'. Use YYYY-MM-DD, M/D/YYYY, or DD/MM/YYYY"})
                all_errors.extend(group_errors)
                continue

            # Validate individual item rows
            has_row_error = False
            for rn, row in rows:
                # Color lookup
                color_name = row["color_name"].strip()
                try:
                    color = ColorCode.objects.get(tenant=tenant, name__iexact=color_name)
                except ColorCode.DoesNotExist:
                    available = list(ColorCode.objects.filter(tenant=tenant).values_list("name", flat=True)[:20])
                    avail_str = f" Available: {', '.join(available)}" if available else " No colors exist."
                    group_errors.append({"row": rn, "error": f"Color '{color_name}' not found. {avail_str}"})
                    has_row_error = True
                    continue

                # Quantity
                try:
                    quantity = int(row["quantity"])
                    if quantity <= 0:
                        raise ValueError("must be positive")
                except (ValueError, TypeError):
                    group_errors.append({"row": rn, "error": f"Invalid quantity: '{row['quantity']}'"})
                    has_row_error = True
                    continue

                # Unit price
                try:
                    unit_price = Decimal(row["unit_price"].strip() or "0")
                except (ValueError, TypeError):
                    group_errors.append({"row": rn, "error": f"Invalid unit_price: '{row['unit_price']}'"})
                    has_row_error = True
                    continue

                items_data.append({
                    "color": color,
                    "size": row.get("size", "").strip(),
                    "quantity": quantity,
                    "unit_price": unit_price,
                })

            if has_row_error:
                all_errors.extend(group_errors)
                continue

            if not items_data:
                for rn, _ in rows:
                    group_errors.append({"row": rn, "error": "No valid items for this PO"})
                all_errors.extend(group_errors)
                continue

            # ── Check for duplicate PO ─────────────────────────────────────
            existing_po = PurchaseOrder.objects.filter(
                tenant=tenant,
                buyer=buyer,
                factory=factory,
                po_date=po_date,
                delivery_date=delivery_date,
            ).first()
            if existing_po:
                for rn, _ in rows:
                    group_errors.append({
                        "row": rn,
                        "error": f"Duplicate: PO {existing_po.po_number} already exists for {buyer_name}/{factory_name} on {po_date_str}",
                    })
                all_errors.extend(group_errors)
                continue

            # ── Create PO + items in a transaction ───────────────────────────
            try:
                with transaction.atomic():
                    last_po = PurchaseOrder.objects.filter(
                        tenant=tenant
                    ).order_by("-created_at").first()
                    if last_po and last_po.po_number.startswith("PO-"):
                        try:
                            num = int(last_po.po_number.split("-")[1]) + 1
                        except (IndexError, ValueError):
                            num = 1001
                    else:
                        num = 1001

                    total_value = sum(
                        item["quantity"] * item["unit_price"] for item in items_data
                    )
                    total_quantity = sum(item["quantity"] for item in items_data)
                    avg_price = (
                        total_value / Decimal(total_quantity)
                        if total_quantity
                        else Decimal("0")
                    )

                    remarks = rows[0][1].get("remarks", "").strip() if rows else ""

                    po = PurchaseOrder.objects.create(
                        tenant=tenant,
                        po_number=f"PO-{num:04d}",
                        buyer=buyer,
                        factory=factory,
                        po_date=po_date,
                        delivery_date=delivery_date,
                        quantity=total_quantity,
                        unit_price=avg_price,
                        total_value=total_value,
                        remarks=remarks,
                        status="draft",
                        created_by=request.user,
                    )

                    for item_data in items_data:
                        PurchaseOrderItem.objects.create(
                            tenant=tenant,
                            purchase_order=po,
                            color=item_data["color"],
                            size=item_data["size"],
                            quantity=item_data["quantity"],
                            unit_price=item_data["unit_price"],
                        )

                success_count += 1
                created_pos.append({
                    "po_number": po.po_number,
                    "buyer": buyer_name,
                    "factory": factory_name,
                    "items_count": len(items_data),
                    "total_value": str(total_value),
                })
            except Exception as exc:
                for rn, _ in rows:
                    group_errors.append({"row": rn, "error": f"Database error: {exc}"})
                all_errors.extend(group_errors)

        return Response({
            "success": success_count,
            "errors": all_errors,
            "created_pos": created_pos,
        })

    @action(detail=True, methods=["get"])
    def items(self, request, pk=None):
        po = self.get_object()
        items = PurchaseOrderItem.objects.filter(tenant=request.tenant, purchase_order=po)
        serializer = PurchaseOrderItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        po = self.get_object()
        new_status = request.data.get("status")
        if not new_status or new_status not in PO_TRANSITIONS:
            valid = list(PO_TRANSITIONS.keys())
            return Response(
                {"error": f"Invalid status. Valid: {valid}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        transition = PO_TRANSITIONS[new_status]
        if po.status not in transition["from"]:
            return Response(
                {"error": f"Cannot transition from '{po.status}' to '{new_status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        po.status = new_status
        po.save(update_fields=["status"])

        if new_status == "confirmed" and not TA.objects.filter(purchase_order=po).exists():
            ta = TA.objects.create(
                tenant=request.tenant, purchase_order=po,
                delivery_date=po.delivery_date, status="active",
                created_by=request.user
            )
            default_milestones = [
                ("Fabric Booking", "Book fabric with supplier", 0),
                ("Fabric Sourcing", "Source and procure fabric", 7),
                ("Fabric Testing", "Test fabric quality and shrinkage", 14),
                ("Pattern & Sampling", "Create patterns and initial samples", 21),
                ("Lab Dip Approval", "Approve lab dips with buyer", 28),
                ("Bulk Production Start", "Start bulk production", 35),
                ("Inline Inspection", "In-line quality inspection", 49),
                ("Final Inspection", "End-line quality inspection", 56),
                ("Shipment", "Ship goods to destination", int((po.delivery_date - po.po_date).days) if po.delivery_date and po.po_date else 63),
            ]
            for i, (name, desc, offset) in enumerate(default_milestones):
                TAMilestone.objects.create(
                    tenant=request.tenant, ta=ta, name=name, description=desc,
                    planned_date=po.po_date + timedelta(days=offset),
                    status="pending", is_critical=(i in [0, 5, 8]),
                    sort_order=i, created_by=request.user,
                )

        if new_status == "confirmed":
            created = {"ta": False, "pi": False, "sc": False}
            created["ta"] = TA.objects.filter(purchase_order=po).exists()

            if not ProformaInvoice.objects.filter(tenant=request.tenant, purchase_order=po).exists():
                pi_number = f"PI-{uuid.uuid4().hex[:8].upper()}"
                ProformaInvoice.objects.create(
                    tenant=request.tenant, pi_number=pi_number,
                    purchase_order=po, buyer=po.buyer,
                    amount=po.total_value, currency=po.currency,
                    issued_date=timezone.localtime(timezone.now()).date(),
                    validity_date=po.po_date + timedelta(days=30),
                    status="draft", created_by=request.user,
                )
                created["pi"] = True

            if not SalesContract.objects.filter(tenant=request.tenant, purchase_order=po).exists():
                sc_number = f"SC-{uuid.uuid4().hex[:8].upper()}"
                SalesContract.objects.create(
                    tenant=request.tenant, contract_number=sc_number,
                    purchase_order=po, buyer=po.buyer,
                    contract_date=timezone.localtime(timezone.now()).date(),
                    total_amount=po.total_value, currency=po.currency,
                    status="draft", created_by=request.user,
                )
                created["sc"] = True

            return Response({
                "status": po.status,
                "message": f"PO confirmed. Created: T&A={'yes' if created['ta'] else 'exists'}, PI={'yes' if created['pi'] else 'exists'}, SC={'yes' if created['sc'] else 'exists'}",
                "created": created,
            })

        return Response({"status": po.status, "message": f"PO {transition['label'].lower()} successfully"})

    @action(detail=True, methods=["get"])
    def transition_info(self, request, pk=None):
        """Return available transitions and their side effects for the current PO status."""
        po = self.get_object()
        current = po.status

        TRANSITION_EFFECTS = {
            "confirmed": {
                "label": "Confirm",
                "description": "Confirms the PO and unlocks production planning.",
                "effects": [
                    {"type": "create", "text": "T&A plan created with 9 default milestones"},
                    {"type": "create", "text": "Proforma Invoice auto-generated from PO"},
                    {"type": "create", "text": "Sales Contract auto-generated from PO"},
                    {"type": "unlock", "text": "Production planning becomes available"},
                    {"type": "unlock", "text": "BOM and Costing workflow enabled"},
                    {"type": "status", "text": "PO status changes to Confirmed"},
                ],
                "warnings": [
                    "Ensure buyer and factory details are correct",
                    "Verify quantity and pricing before confirming",
                ],
            },
            "in_production": {
                "label": "Start Production",
                "description": "Moves PO into production phase.",
                "effects": [
                    {"type": "unlock", "text": "Daily production reports can be logged"},
                    {"type": "unlock", "text": "Quality inspections can be scheduled"},
                    {"type": "status", "text": "PO status changes to In Production"},
                ],
                "warnings": [
                    "Production plan should be created before starting",
                ],
            },
            "quality_check": {
                "label": "Quality Check",
                "description": "Moves PO to quality inspection phase.",
                "effects": [
                    {"type": "status", "text": "PO status changes to Quality Check"},
                    {"type": "unlock", "text": "Final quality inspections can be completed"},
                ],
                "warnings": [],
            },
            "ready": {
                "label": "Mark Ready",
                "description": "Marks PO as ready for shipment.",
                "effects": [
                    {"type": "unlock", "text": "Shipment booking becomes available"},
                    {"type": "status", "text": "PO status changes to Ready"},
                ],
                "warnings": [
                    "Ensure all quality inspections have passed",
                ],
            },
            "shipped": {
                "label": "Ship",
                "description": "Marks PO as shipped.",
                "effects": [
                    {"type": "status", "text": "PO status changes to Shipped"},
                    {"type": "info", "text": "Delivery tracking begins"},
                ],
                "warnings": [
                    "Verify shipping documents are uploaded",
                    "Confirm ETD and ETA with freight forwarder",
                ],
            },
            "delivered": {
                "label": "Deliver",
                "description": "Marks PO as delivered — final completion.",
                "effects": [
                    {"type": "status", "text": "PO status changes to Delivered"},
                    {"type": "info", "text": "Order lifecycle complete"},
                ],
                "warnings": [
                    "Confirm goods received by buyer",
                ],
            },
            "cancelled": {
                "label": "Cancel",
                "description": "Cancels the PO. This action stops all active workflows.",
                "effects": [
                    {"type": "status", "text": "PO status changes to Cancelled"},
                    {"type": "warn", "text": "T&A milestones will stop updating"},
                    {"type": "warn", "text": "Production tracking halted"},
                ],
                "warnings": [
                    "This action cannot be easily reversed",
                    "All active production and quality workflows will stop",
                ],
            },
        }

        transitions = {}
        for to_status, info in PO_TRANSITIONS.items():
            if current in info["from"]:
                transitions[to_status] = {
                    "label": info["label"],
                    **TRANSITION_EFFECTS.get(to_status, {}),
                }

        return Response({
            "current_status": current,
            "transitions": transitions,
        })

    @action(detail=True, methods=["post"])
    def generate_pi(self, request, pk=None):
        """Generate a Proforma Invoice from PO data."""
        po = self.get_object()
        existing = ProformaInvoice.objects.filter(tenant=request.tenant, purchase_order=po).first()
        if existing:
            return Response({"pi_id": existing.id, "pi_number": existing.pi_number, "status": "exists"},
                            status=status.HTTP_200_OK)
        pi_number = f"PI-{uuid.uuid4().hex[:8].upper()}"
        pi = ProformaInvoice.objects.create(
            tenant=request.tenant, pi_number=pi_number,
            purchase_order=po, buyer=po.buyer,
            amount=po.total_value, currency=po.currency,
            issued_date=timezone.localtime(timezone.now()).date(),
            validity_date=po.po_date + timedelta(days=30),
            status="draft", created_by=request.user,
        )
        return Response({"pi_id": pi.id, "pi_number": pi.pi_number, "status": "created"},
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def generate_sc(self, request, pk=None):
        """Generate a Sales Contract from PO data."""
        po = self.get_object()
        existing = SalesContract.objects.filter(tenant=request.tenant, purchase_order=po).first()
        if existing:
            return Response({"sc_id": existing.id, "contract_number": existing.contract_number, "status": "exists"},
                            status=status.HTTP_200_OK)
        sc_number = f"SC-{uuid.uuid4().hex[:8].upper()}"
        sc = SalesContract.objects.create(
            tenant=request.tenant, contract_number=sc_number,
            purchase_order=po, buyer=po.buyer,
            contract_date=timezone.localtime(timezone.now()).date(),
            total_amount=po.total_value, currency=po.currency,
            status="draft", created_by=request.user,
        )
        return Response({"sc_id": sc.id, "contract_number": sc.contract_number, "status": "created"},
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def linked(self, request, pk=None):
        """Return all linked entities across modules for this PO."""
        po = self.get_object()
        tenant = request.tenant

        from apps.production.models import ProductionPlan
        from apps.quality.models import Inspection

        style = po.file_opening.style if po.file_opening else None

        data = {
            "style": None,
            "file_opening": None,
            "ta": None,
            "bom": None,
            "costing": None,
            "production_plan": None,
            "quality_inspections": [],
            "proforma_invoice": None,
            "sales_contract": None,
        }

        if style:
            data["style"] = {
                "id": style.id, "style_number": style.style_number,
                "name": style.name, "status": style.status,
                "url": f"/merchandising/styles/{style.id}",
            }

        fo = po.file_opening
        if fo:
            data["file_opening"] = {
                "id": fo.id, "file_number": fo.file_number, "status": fo.status,
                "url": f"/merchandising/file-openings/{fo.id}",
            }

        ta = TA.objects.filter(tenant=tenant, purchase_order=po).first()
        if ta:
            completed = ta.milestones.filter(status="completed").count()
            total = ta.milestones.count()
            data["ta"] = {
                "id": ta.id, "status": ta.status,
                "completed_milestones": completed, "total_milestones": total,
                "url": f"/merchandising/purchase-orders/{po.id}?tab=ta",
            }

        bom = None
        if style:
            latest_sv = StyleVersion.objects.filter(tenant=tenant, style=style).order_by("-version_number").first()
            if latest_sv:
                bom = BOM.objects.filter(tenant=tenant, style_version=latest_sv).order_by("-version").first()
        if bom:
            data["bom"] = {
                "id": bom.id, "name": bom.name, "version": bom.version, "status": bom.status,
                "item_count": bom.items.count(),
                "url": f"/merchandising/purchase-orders/{po.id}?tab=bom_costing",
            }

        costing = Costing.objects.filter(tenant=tenant, purchase_order=po).order_by("-version").first()
        if costing:
            data["costing"] = {
                "id": costing.id, "version": costing.version, "status": costing.status,
                "total_cost": float(costing.total_cost),
                "url": f"/merchandising/purchase-orders/{po.id}?tab=bom_costing",
            }

        pp = ProductionPlan.objects.filter(tenant=tenant, purchase_order=po).first()
        if pp:
            data["production_plan"] = {
                "id": pp.id, "status": pp.status, "quantity": pp.quantity,
                "start_date": str(pp.start_date) if pp.start_date else None,
                "end_date": str(pp.end_date) if pp.end_date else None,
                "url": f"/production/plans/{pp.id}",
            }

        inspections = Inspection.objects.filter(tenant=tenant, purchase_order=po)
        for qi in inspections:
            data["quality_inspections"].append({
                "id": qi.id, "inspection_type": qi.inspection_type,
                "status": qi.status, "inspection_date": str(qi.inspection_date),
                "url": f"/quality/inspections/{qi.id}",
            })

        pi = ProformaInvoice.objects.filter(tenant=tenant, purchase_order=po).first()
        if pi:
            data["proforma_invoice"] = {
                "id": pi.id, "pi_number": pi.pi_number, "status": pi.status,
                "amount": float(pi.amount),
                "url": f"/commercial/proforma-invoices/{pi.id}",
            }

        sc = SalesContract.objects.filter(tenant=tenant, purchase_order=po).first()
        if sc:
            data["sales_contract"] = {
                "id": sc.id, "contract_number": sc.contract_number, "status": sc.status,
                "total_amount": float(sc.total_amount),
                "url": f"/commercial/sales-contracts/{sc.id}",
            }

        return Response(data)

    @action(detail=True, methods=["get"])
    def trail(self, request, pk=None):
        """Return chronological trail of all events across modules for this PO."""
        po = self.get_object()
        tenant = request.tenant
        events = []

        from apps.commercial.models import ProformaInvoice, SalesContract
        from apps.logistics.models import Shipment
        from apps.monitoring.models import AuditLog
        from apps.production.models import ProductionPlan
        from apps.quality.models import Inspection

        # Style
        style = po.file_opening.style if po.file_opening else None
        if style:
            events.append({
                "date": str(style.created_at.date()) if style.created_at else "",
                "title": f"Style {style.style_number} created",
                "description": style.name,
                "color": "create",
                "icon": "plus",
                "sort_key": str(style.created_at) if style.created_at else "0000",
            })

        # File Opening
        fo = po.file_opening
        if fo:
            events.append({
                "date": str(fo.created_at.date()) if fo.created_at else "",
                "title": f"File Opening {fo.file_number} opened",
                "description": f"Factory: {fo.factory.name}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(fo.created_at) if fo.created_at else "0000",
            })

        # PO created
        events.append({
            "date": str(po.created_at.date()) if po.created_at else "",
            "title": f"PO {po.po_number} created",
            "description": f"Qty: {po.quantity}, ${po.unit_price}/pc, Total: ${po.total_value}",
            "color": "create",
            "icon": "plus",
            "sort_key": str(po.created_at) if po.created_at else "0000",
        })

        # PO line items
        items = PurchaseOrderItem.objects.filter(tenant=tenant, purchase_order=po)
        if items.exists():
            events.append({
                "date": str(po.created_at.date()) if po.created_at else "",
                "title": f"{items.count()} line item(s) added",
                "description": ", ".join([f"{i.color.name} {i.size}" for i in items[:5]]) + ("..." if items.count() > 5 else ""),
                "color": "info",
                "icon": "clock",
                "sort_key": str(po.created_at) if po.created_at else "0000",
            })

        # BOMs
        style_version = fo.style_version if fo else None
        if style_version:
            boms = BOM.objects.filter(tenant=tenant, style_version=style_version).order_by("version")
            for bom in boms:
                item_count = bom.items.count()
                events.append({
                    "date": str(bom.created_at.date()) if bom.created_at else "",
                    "title": f"BOM {bom.name} v{bom.version} created",
                    "description": f"{item_count} items, Status: {bom.status}",
                    "color": "create" if bom.status == "draft" else ("approve" if bom.status == "active" else "info"),
                    "icon": "plus" if bom.status == "draft" else "check",
                    "sort_key": str(bom.created_at) if bom.created_at else "0000",
                })

        # Costings
        costings = Costing.objects.filter(tenant=tenant, purchase_order=po).order_by("version")
        for c in costings:
            events.append({
                "date": str(c.created_at.date()) if c.created_at else "",
                "title": f"Costing v{c.version} generated",
                "description": f"Total: ${c.total_cost}, Target: ${c.target_price or 'N/A'}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(c.created_at) if c.created_at else "0000",
            })
            if c.status == "approved":
                events.append({
                    "date": str(c.approved_at.date()) if c.approved_at else str(c.created_at.date()) if c.created_at else "",
                    "title": f"Costing v{c.version} approved",
                    "description": f"Approved cost: ${c.total_cost}",
                    "color": "approve",
                    "icon": "check",
                    "sort_key": str(c.approved_at) if c.approved_at else str(c.created_at) if c.created_at else "0000",
                })

        # T&A
        ta = TA.objects.filter(tenant=tenant, purchase_order=po).first()
        if ta:
            events.append({
                "date": str(ta.created_at.date()) if ta.created_at else "",
                "title": "T&A plan created",
                "description": f"{ta.milestones.count()} milestones, Delivery: {ta.delivery_date}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(ta.created_at) if ta.created_at else "0000",
            })
            completed_milestones = ta.milestones.filter(status="completed").order_by("actual_date")
            for m in completed_milestones[:10]:
                events.append({
                    "date": str(m.actual_date) if m.actual_date else str(m.planned_date),
                    "title": f"Milestone completed: {m.name}",
                    "description": f"Planned: {m.planned_date}" + (f", Actual: {m.actual_date}" if m.actual_date else ""),
                    "color": "approve",
                    "icon": "check",
                    "sort_key": str(m.actual_date) if m.actual_date else str(m.planned_date) + "!",
                })

        # Production Plans
        plans = ProductionPlan.objects.filter(tenant=tenant, purchase_order=po).order_by("created_at")
        for pp in plans:
            events.append({
                "date": str(pp.created_at.date()) if pp.created_at else "",
                "title": "Production plan created",
                "description": f"Qty: {pp.quantity}, Factory: {pp.factory.name}, Status: {pp.status}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(pp.created_at) if pp.created_at else "0000",
            })

        # Inspections
        inspections = Inspection.objects.filter(tenant=tenant, purchase_order=po).order_by("inspection_date")
        for qi in inspections:
            events.append({
                "date": str(qi.inspection_date),
                "title": f"{qi.get_inspection_type_display()} inspection",
                "description": f"Status: {qi.status}, AQL: {qi.aql_level}",
                "color": "approve" if qi.status == "passed" else ("error" if qi.status == "failed" else "info"),
                "icon": "check" if qi.status == "passed" else ("alert" if qi.status == "failed" else "clock"),
                "sort_key": str(qi.inspection_date) + (f"_{qi.id}" if qi.id else ""),
            })

        # PI
        pi = ProformaInvoice.objects.filter(tenant=tenant, purchase_order=po).first()
        if pi:
            events.append({
                "date": str(pi.issued_date) if pi.issued_date else str(pi.created_at.date()) if pi.created_at else "",
                "title": f"Proforma Invoice {pi.pi_number} created",
                "description": f"Amount: ${pi.amount}, Status: {pi.status}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(pi.created_at) if pi.created_at else "0000",
            })

        # SC
        sc = SalesContract.objects.filter(tenant=tenant, purchase_order=po).first()
        if sc:
            events.append({
                "date": str(sc.contract_date) if sc.contract_date else str(sc.created_at.date()) if sc.created_at else "",
                "title": f"Sales Contract {sc.contract_number} created",
                "description": f"Amount: ${sc.total_amount}, Status: {sc.status}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(sc.created_at) if sc.created_at else "0000",
            })

        # Shipments
        shipments = Shipment.objects.filter(tenant=tenant, purchase_order=po).order_by("created_at")
        for sh in shipments:
            events.append({
                "date": str(sh.booking_date) if sh.booking_date else str(sh.created_at.date()) if sh.created_at else "",
                "title": f"Shipment {sh.shipment_number} booked",
                "description": f"Mode: {sh.mode}, ETD: {sh.etd or 'N/A'}, ETA: {sh.eta or 'N/A'}",
                "color": "create",
                "icon": "plus",
                "sort_key": str(sh.created_at) if sh.created_at else "0000",
            })

        # Audit Log entries for this PO
        audit_logs = AuditLog.objects.filter(
            tenant=tenant,
            entity_type="PurchaseOrder",
            entity_id=str(po.id),
        ).order_by("created_at")
        for log in audit_logs:
            events.append({
                "date": str(log.created_at.date()) if log.created_at else "",
                "title": log.description or f"{log.action.title()} {log.entity_type}",
                "description": f"By: {log.user.get_full_name() if log.user else 'System'}",
                "color": "transition" if log.action == "transition" else ("create" if log.action == "create" else "update"),
                "icon": "check" if log.action == "transition" else "clock",
                "sort_key": str(log.created_at) if log.created_at else "0000",
            })

        # Sort chronologically
        events.sort(key=lambda e: e["sort_key"])

        return Response({
            "po_number": po.po_number,
            "total_events": len(events),
            "events": events,
        })

    @action(detail=True, methods=["get"])
    def profit(self, request, pk=None):
        """Return profit breakdown for this PO."""
        po = self.get_object()
        tenant = request.tenant

        from apps.commercial.models import ProformaInvoice, SalesContract

        # Revenue from PI/SC
        pi = ProformaInvoice.objects.filter(tenant=tenant, purchase_order=po, status="accepted").first()
        sc = SalesContract.objects.filter(tenant=tenant, purchase_order=po, status="active").first()
        revenue = float(pi.amount) if pi else (float(sc.total_amount) if sc else float(po.total_value))

        # Cost breakdown from latest costing
        costing = Costing.objects.filter(tenant=tenant, purchase_order=po).order_by("-version").first()
        cost_breakdown = None
        total_cost = 0
        if costing:
            total_cost = float(costing.total_cost)
            cost_breakdown = {
                "fabric": float(costing.fabric_cost),
                "trim": float(costing.trim_cost),
                "cm": float(costing.cm_cost),
                "overhead": float(costing.overhead_cost),
                "total": total_cost,
                "version": costing.version,
                "status": costing.status,
            }

        profit = revenue - total_cost
        margin_pct = round((profit / revenue * 100), 2) if revenue > 0 else 0
        cost_per_unit = round(total_cost / po.quantity, 2) if po.quantity > 0 else 0
        revenue_per_unit = round(revenue / po.quantity, 2) if po.quantity > 0 else 0

        return Response({
            "po_number": po.po_number,
            "quantity": po.quantity,
            "unit_price": float(po.unit_price),
            "revenue": revenue,
            "revenue_per_unit": revenue_per_unit,
            "revenue_source": "PI" if pi else ("SC" if sc else "PO"),
            "cost_breakdown": cost_breakdown,
            "total_cost": total_cost,
            "cost_per_unit": cost_per_unit,
            "profit": profit,
            "margin_percent": margin_pct,
        })

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        po = self.get_object()
        items = PurchaseOrderItem.objects.filter(tenant=request.tenant, purchase_order=po)
        import csv
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{po.po_number}.csv"'
        writer = csv.writer(response)
        writer.writerow(["PO Number", "Buyer", "Factory", "PO Date", "Delivery Date", "Total Value", "Status"])
        writer.writerow([po.po_number, po.buyer.name, po.factory.name, str(po.po_date), str(po.delivery_date), str(po.total_value), po.status])
        writer.writerow([])
        writer.writerow(["Color", "Size", "Quantity", "Unit Price"])
        for item in items:
            writer.writerow([item.color.name, item.size, item.quantity, str(item.unit_price)])
        return response

    @action(detail=True, methods=["get"])
    def amendments(self, request, pk=None):
        po = self.get_object()
        amendments = POAmendment.objects.filter(tenant=request.tenant, purchase_order=po)
        serializer = POAmendmentSerializer(amendments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def ta(self, request, pk=None):
        po = self.get_object()
        try:
            ta_obj = TA.objects.get(tenant=request.tenant, purchase_order=po)
        except TA.DoesNotExist:
            return Response({"milestones": [], "status": None, "delivery_date": None})
        milestones = TAMilestone.objects.filter(tenant=request.tenant, ta=ta_obj)
        return Response({
            "id": str(ta_obj.id),
            "status": ta_obj.status,
            "delivery_date": ta_obj.delivery_date,
            "milestones": TAMilestoneSerializer(milestones, many=True).data,
        })

    @action(detail=True, methods=["post"])
    def create_ta_milestone(self, request, pk=None):
        po = self.get_object()
        ta_obj, _ = TA.objects.get_or_create(
            tenant=request.tenant, purchase_order=po,
            defaults={"delivery_date": po.delivery_date, "status": "active", "created_by": request.user},
        )
        serializer = TAMilestoneSerializer(data={**request.data, "ta": str(ta_obj.id)})
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant=request.tenant, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def bulk_create_ta_milestones(self, request, pk=None):
        po = self.get_object()
        ta_obj, _ = TA.objects.get_or_create(
            tenant=request.tenant, purchase_order=po,
            defaults={"delivery_date": po.delivery_date, "status": "active", "created_by": request.user},
        )
        milestones_data = request.data.get("milestones", [])
        created = []
        for m in milestones_data:
            s = TAMilestoneSerializer(data={**m, "ta": str(ta_obj.id)})
            s.is_valid(raise_exception=True)
            s.save(tenant=request.tenant, created_by=request.user)
            created.append(s.data)
        return Response({"created": len(created), "milestones": created}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def ta_templates(self, request):
        templates = [
            {
                "id": "standard_export",
                "name": "Standard Export Order",
                "description": "Full lifecycle for export garment orders (60-70 days)",
                "milestones": [
                    {"name": "Fabric Booking", "description": "Book fabric with supplier", "offset_days": 0, "is_critical": True},
                    {"name": "Fabric Sourcing", "description": "Source and procure fabric", "offset_days": 7, "is_critical": False},
                    {"name": "Fabric Testing", "description": "Test fabric quality and shrinkage", "offset_days": 14, "is_critical": False},
                    {"name": "Pattern Making", "description": "Create patterns for the style", "offset_days": 18, "is_critical": False},
                    {"name": "Initial Sampling", "description": "Create initial samples", "offset_days": 21, "is_critical": True},
                    {"name": "Lab Dip Submission", "description": "Submit lab dips for approval", "offset_days": 25, "is_critical": False},
                    {"name": "Lab Dip Approval", "description": "Get lab dip approval from buyer", "offset_days": 30, "is_critical": True},
                    {"name": "Bulk Production Start", "description": "Start bulk production", "offset_days": 35, "is_critical": True},
                    {"name": "Inline Inspection", "description": "In-line quality inspection", "offset_days": 49, "is_critical": False},
                    {"name": "Final Inspection", "description": "End-line quality inspection", "offset_days": 56, "is_critical": False},
                    {"name": "Shipment", "description": "Ship goods to destination", "offset_days": 63, "is_critical": True},
                ],
            },
            {
                "id": "fast_track",
                "name": "Fast Track Order",
                "description": "Expedited timeline for rush orders (35-42 days)",
                "milestones": [
                    {"name": "Fabric Booking", "description": "Book fabric with supplier", "offset_days": 0, "is_critical": True},
                    {"name": "Fabric Sourcing", "description": "Expedited fabric procurement", "offset_days": 3, "is_critical": True},
                    {"name": "Pattern & Sampling", "description": "Combined pattern and sample making", "offset_days": 7, "is_critical": True},
                    {"name": "Lab Dip Approval", "description": "Fast-track lab dip approval", "offset_days": 12, "is_critical": True},
                    {"name": "Bulk Production Start", "description": "Start bulk production", "offset_days": 15, "is_critical": True},
                    {"name": "Inline Inspection", "description": "In-line quality check", "offset_days": 25, "is_critical": False},
                    {"name": "Final Inspection", "description": "End-line quality check", "offset_days": 30, "is_critical": False},
                    {"name": "Shipment", "description": "Ship goods", "offset_days": 35, "is_critical": True},
                ],
            },
            {
                "id": "domestic",
                "name": "Domestic Order",
                "description": "Shorter timeline for domestic orders (30-40 days)",
                "milestones": [
                    {"name": "Fabric Sourcing", "description": "Source fabric locally", "offset_days": 0, "is_critical": True},
                    {"name": "Sampling", "description": "Create samples", "offset_days": 7, "is_critical": False},
                    {"name": "Production Start", "description": "Start production", "offset_days": 12, "is_critical": True},
                    {"name": "Quality Check", "description": "In-process quality check", "offset_days": 22, "is_critical": False},
                    {"name": "Packing & Delivery", "description": "Pack and deliver to buyer", "offset_days": 30, "is_critical": True},
                ],
            },
            {
                "id": "blank",
                "name": "Blank Template",
                "description": "Empty template — add your own milestones",
                "milestones": [],
            },
        ]
        return Response(templates)

    @action(detail=True, methods=["get"])
    def journey(self, request, pk=None):
        """Return aggregated journey status across the full order lifecycle."""
        po = self.get_object()
        fo = po.file_opening
        style = fo.style if fo else None
        sv = fo.style_version if fo else None

        # BOM: through style_version
        bom = None
        if sv:
            bom = BOM.objects.filter(tenant=request.tenant, style_version=sv, status="active").order_by("-version").first()
            if not bom:
                bom = BOM.objects.filter(tenant=request.tenant, style_version=sv).order_by("-version").first()

        # Costing: direct FK to PO
        costing = Costing.objects.filter(tenant=request.tenant, purchase_order=po).order_by("-version").first()

        # TA: OneToOne to PO
        ta_obj = TA.objects.filter(tenant=request.tenant, purchase_order=po).first()
        milestones_total = 0
        milestones_completed = 0
        if ta_obj:
            milestones_total = TAMilestone.objects.filter(tenant=request.tenant, ta=ta_obj).count()
            milestones_completed = TAMilestone.objects.filter(tenant=request.tenant, ta=ta_obj, status="completed").count()

        # Production: direct FK to PO
        from apps.production.models import ProductionPlan
        plans = ProductionPlan.objects.filter(tenant=request.tenant, purchase_order=po)
        plans_count = plans.count()
        production_status = "not_started"
        if plans.exists():
            statuses = set(plans.values_list("status", flat=True))
            if "in_progress" in statuses:
                production_status = "in_progress"
            elif "completed" in statuses:
                production_status = "completed"
            elif "planned" in statuses:
                production_status = "planned"
            else:
                production_status = "draft"

        # Quality: direct FK to PO
        from apps.quality.models import Inspection
        inspections = Inspection.objects.filter(tenant=request.tenant, purchase_order=po)
        inspections_count = inspections.count()
        quality_status = "not_started"
        if inspections.exists():
            q_statuses = set(inspections.values_list("status", flat=True))
            if "passed" in q_statuses:
                quality_status = "passed"
            elif "failed" in q_statuses:
                quality_status = "failed"
            elif "in_progress" in q_statuses:
                quality_status = "in_progress"
            else:
                quality_status = "pending"

        # Logistics: direct FK to PO
        from apps.logistics.models import Shipment
        shipments = Shipment.objects.filter(tenant=request.tenant, purchase_order=po)
        shipments_count = shipments.count()
        logistics_status = "not_started"
        if shipments.exists():
            l_statuses = set(shipments.values_list("status", flat=True))
            if "delivered" in l_statuses:
                logistics_status = "delivered"
            elif any(s in l_statuses for s in ["in_transit", "on_water", "arrived", "cleared"]):
                logistics_status = "in_transit"
            elif any(s in l_statuses for s in ["booking", "booked", "picked_up"]):
                logistics_status = "booked"
            else:
                logistics_status = "planned"

        # Commercial: PI, SC, LC
        from apps.commercial.models import LC, ProformaInvoice, SalesContract
        pi = ProformaInvoice.objects.filter(tenant=request.tenant, purchase_order=po).order_by("-created_at").first()
        sc = SalesContract.objects.filter(tenant=request.tenant, purchase_order=po).order_by("-created_at").first()
        lc = LC.objects.filter(tenant=request.tenant, purchase_order=po).order_by("-created_at").first()
        commercial_status = "not_started"
        if pi and pi.status == "accepted":
            commercial_status = "completed"
        elif pi:
            commercial_status = "in_progress"
        elif sc:
            commercial_status = "in_progress"

        # Build steps
        steps = [
            {
                "key": "style",
                "label": "Style",
                "status": style.status if style else "not_started",
                "id": str(style.id) if style else None,
                "code": style.style_number if style else None,
                "name": style.name if style else None,
                "file_openings_count": style.file_openings.filter(tenant=request.tenant).count() if style else 0,
            },
            {
                "key": "file_opening",
                "label": "File Opening",
                "status": fo.status if fo else "not_started",
                "id": str(fo.id) if fo else None,
                "code": fo.file_number if fo else None,
                "purchase_orders_count": fo.purchase_orders.filter(tenant=request.tenant).count() if fo else 0,
            },
            {
                "key": "purchase_order",
                "label": "Purchase Order",
                "status": po.status,
                "id": str(po.id),
                "code": po.po_number,
                "quantity": po.quantity,
                "total_value": str(po.total_value),
            },
            {
                "key": "bom",
                "label": "BOM",
                "status": bom.status if bom else "not_started",
                "id": str(bom.id) if bom else None,
                "code": f"v{bom.version}" if bom else None,
                "items_count": bom.items.filter(tenant=request.tenant).count() if bom else 0,
            },
            {
                "key": "costing",
                "label": "Costing",
                "status": costing.status if costing else "not_started",
                "id": str(costing.id) if costing else None,
                "code": f"v{costing.version}" if costing else None,
                "total_cost": str(costing.total_cost) if costing else None,
                "margin": str(costing.margin) if costing else None,
            },
            {
                "key": "ta",
                "label": "T&A",
                "status": ta_obj.status if ta_obj else "not_started",
                "id": str(ta_obj.id) if ta_obj else None,
                "milestones_total": milestones_total,
                "milestones_completed": milestones_completed,
            },
            {
                "key": "production",
                "label": "Production",
                "status": production_status,
                "plans_count": plans_count,
            },
            {
                "key": "quality",
                "label": "Quality",
                "status": quality_status,
                "inspections_count": inspections_count,
            },
            {
                "key": "logistics",
                "label": "Logistics",
                "status": logistics_status,
                "shipments_count": shipments_count,
            },
            {
                "key": "commercial",
                "label": "Commercial",
                "status": commercial_status,
                "pi_status": pi.status if pi else None,
                "sc_status": sc.status if sc else None,
                "lc_status": lc.status if lc else None,
            },
        ]

        # Determine current step (first step that is not completed or is in progress)
        completed_statuses = {"completed", "approved", "passed", "delivered", "active"}
        current_step = "commercial"  # default to last
        for s in steps:
            st = s["status"]
            if st in ("not_started", "draft", "pending"):
                current_step = s["key"]
                break
            elif st in ("open", "in_progress", "in_transit", "booked", "planned", "sent"):
                current_step = s["key"]
                break

        # Calculate completion percentage
        total_steps = len(steps)
        completed_count = sum(1 for s in steps if s["status"] in completed_statuses)
        completion_percentage = round((completed_count / total_steps) * 100) if total_steps > 0 else 0

        return Response({
            "steps": steps,
            "current_step": current_step,
            "completion_percentage": completion_percentage,
        })

    @action(detail=True, methods=["get"])
    def bom_costing(self, request, pk=None):
        po = self.get_object()
        style = po.file_opening.style if po.file_opening and po.file_opening.style else None
        bom = None
        if style:
            latest_sv = StyleVersion.objects.filter(tenant=request.tenant, style=style).order_by("-version_number").first()
            if latest_sv:
                bom = BOM.objects.filter(tenant=request.tenant, style_version=latest_sv, status="active").order_by("-version").first()
                if not bom:
                    bom = BOM.objects.filter(tenant=request.tenant, style_version=latest_sv).order_by("-version").first()
        costings = Costing.objects.filter(tenant=request.tenant, purchase_order=po)
        bom_data = None
        if bom:
            bom_items = BOMItem.objects.filter(tenant=request.tenant, bom=bom)

            def _item_cost(item):
                up = item.unit_price or Decimal("0")
                con = item.consumption or Decimal("0")
                wp = item.waste_percent if item.waste_percent is not None else Decimal("0")
                return up * con * (1 + wp / Decimal("100"))

            fabric = sum(_item_cost(item) for item in bom_items if item.category == "fabric")
            trim = sum(_item_cost(item) for item in bom_items if item.category == "trim")
            accessories = sum(
                _item_cost(item)
                for item in bom_items if item.category in ("accessories", "accessory", "packaging", "label", "other")
            )
            fabric_d = Decimal(str(fabric))
            trim_d = Decimal(str(trim + accessories))
            overhead = (fabric_d + trim_d) * Decimal("0.10")
            total = fabric_d + trim_d + overhead
            bom_data = {
                "id": str(bom.id),
                "name": bom.name,
                "version": bom.version,
                "status": bom.status,
                "style_number": style.style_number if style else None,
                "item_count": bom_items.count(),
                "categories": {
                    "fabric": float(fabric_d),
                    "trim": float(trim),
                    "accessories": float(accessories),
                    "overhead": float(overhead),
                    "total": float(total),
                },
            }
        return Response({
            "bom": bom_data,
            "costings": CostingSerializer(costings, many=True).data,
        })

    @action(detail=True, methods=["post"])
    def create_bom(self, request, pk=None):
        from django.db import transaction
        from django.db.models import Max
        po = self.get_object()
        style = po.file_opening.style if po.file_opening and po.file_opening.style else None
        if not style:
            return Response(
                {"error": "PO has no linked style. Cannot create BOM."},
                status=status.HTTP_400_BAD_REQUEST
            )
        style_version = StyleVersion.objects.filter(tenant=request.tenant, style=style).order_by("-version_number").first()
        if not style_version:
            style_version = StyleVersion.objects.create(
                tenant=request.tenant, style=style,
                version_number=1, revision_notes="Auto-created for BOM",
                status="draft", created_by=request.user,
            )
        name = request.data.get("name", f"BOM - {po.po_number}")
        items_data = request.data.get("items", [])
        if not items_data:
            return Response(
                {"error": "BOM must have at least one item."},
                status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            last_version = BOM.objects.filter(
                tenant=request.tenant, style_version=style_version
            ).aggregate(m=Max("version"))["m"] or 0
            bom = BOM.objects.create(
                tenant=request.tenant,
                style_version=style_version,
                name=name,
                version=last_version + 1,
                status="draft",
                created_by=request.user,
            )
            for item_data in items_data:
                BOMItem.objects.create(
                    tenant=request.tenant, bom=bom, created_by=request.user,
                    **{k: v for k, v in item_data.items() if k in (
                        "category", "item_name", "description", "uom", "consumption",
                        "waste_percent", "unit_price", "vendor"
                    )},
                )
        return Response(BOMSerializer(bom).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        po = self.get_object()
        if po.status != "draft":
            return Response(
                {"error": f"Cannot approve PO in '{po.status}' status. Must be draft."},
                status=status.HTTP_400_BAD_REQUEST
            )
        po.status = "confirmed"
        po.save(update_fields=["status"])
        return Response({"status": "confirmed"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        po = self.get_object()
        if po.status != "draft":
            return Response(
                {"error": f"Cannot reject PO in '{po.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        reason = request.data.get("reason", "")
        po.status = "cancelled"
        po.save(update_fields=["status"])
        return Response({"status": "cancelled", "reason": reason})

    @action(detail=False, methods=["get"], url_path="order_manager")
    def order_manager(self, request):
        """RQ-028 (GC-019): per-order summary for the Order Manager dashboard.

        Displays orders in completion-date order with status tiles (production,
        technical, logistics, dockets, reconciliation, schedule, gold seal) and
        a colour-coded risk level for the daily critical-path review.
        """
        today = timezone.localdate()
        qs = self.get_queryset()

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        buyer = request.query_params.get("buyer")
        if buyer:
            qs = qs.filter(buyer_id=buyer)
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(po_number__icontains=q)
                | Q(buyer__name__icontains=q)
                | Q(file_opening__file_number__icontains=q)
                | Q(file_opening__style__style_number__icontains=q)
            )

        qs = qs.prefetch_related(
            "buyer",
            "file_opening__style",
            "job_requests",
            "fit_specs",
            "shipments__dockets",
            "shipments__schedule_items",
            "shipments__reconciliations",
            "shipments__gold_seals",
        ).order_by("delivery_date", "po_number")

        results = [OrderManagerSerializer(po, context={"today": today}).data for po in qs]
        risk_filter = request.query_params.get("risk")
        if risk_filter:
            results = [r for r in results if r["risk"]["level"] == risk_filter]

        return Response({
            "summary": order_manager_summary(results),
            "results": results,
        })


def order_manager_summary(results):
    """Aggregate counts over the (filtered) Order Manager rows."""
    total = len(results)
    levels = {"ok": 0, "watch": 0, "risk": 0}
    for r in results:
        levels[r["risk"]["level"]] = levels.get(r["risk"]["level"], 0) + 1
    return {
        "total_orders": total,
        "open_orders": sum(1 for r in results if r["status"] not in ("delivered", "cancelled")),
        "delivered_orders": sum(1 for r in results if r["status"] == "delivered"),
        "ok": levels["ok"],
        "watch": levels["watch"],
        "risk": levels["risk"],
        "pending_debits": sum(r["reconciliation"]["pending_debits"] for r in results),
        "overdue_production": sum(r["production"]["overdue"] for r in results),
    }


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["purchase_order", "color"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return PurchaseOrderItem.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    def perform_update(self, serializer):
        serializer.save(tenant=self.request.tenant)


class HitViewSet(viewsets.ModelViewSet):
    queryset = Hit.objects.all()
    serializer_class = HitSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["hit_number", "colour__name"]
    filterset_fields = ["purchase_order", "delivery_mode", "delivery_type", "factory_override"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def _get_purchase_order(self):
        po_id = self.kwargs.get("po_pk")
        if not po_id:
            return None
        queryset = PurchaseOrder.objects.all()
        if self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        return queryset.filter(pk=po_id).first()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["purchase_order_id"] = self.kwargs.get("po_pk")
        return context

    def get_queryset(self):
        queryset = Hit.objects.all()
        if self.request.tenant:
            queryset = queryset.filter(tenant=self.request.tenant)
        po = self._get_purchase_order()
        if po is not None:
            queryset = queryset.filter(purchase_order=po)
        return queryset

    def perform_create(self, serializer):
        tenant = self.request.tenant
        po = self._get_purchase_order()
        if po is None:
            raise serializers.ValidationError(
                {"purchase_order": "Purchase order not found in this tenant."}
            )
        last = Hit.objects.filter(tenant=tenant).order_by("-created_at").first() if tenant else None
        if last and last.hit_number.startswith("HIT-"):
            try:
                num = int(last.hit_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                num = 1001
        else:
            num = 1001
        serializer.save(
            tenant=tenant, hit_number=f"HIT-{num:04d}",
            purchase_order=po, created_by=self.request.user,
        )

    def perform_update(self, serializer):
        serializer.save(tenant=self.request.tenant)


class FitSpecViewSet(viewsets.ModelViewSet):
    queryset = FitSpec.objects.all()
    serializer_class = FitSpecSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["notes", "purchase_order__po_number"]
    filterset_fields = ["purchase_order", "fit_stage", "is_current"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "set_current": "merchandising:edit",
        "copy_from_order": "merchandising:edit",
    }

    def get_queryset(self):
        return FitSpec.objects.filter(tenant=self.request.tenant)

    @action(detail=False, methods=["post"], url_path="copy-from-order")
    def copy_from_order(self, request):
        """Copy the current fit spec from a source order to a target order (GC-012)."""
        source_id = request.data.get("source_order")
        target_id = request.data.get("target_order")
        if not source_id or not target_id:
            return Response(
                {"error": "source_order and target_order are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            source_order = PurchaseOrder.objects.get(id=source_id, tenant=request.tenant)
        except (PurchaseOrder.DoesNotExist, ValueError, ValidationError):
            return Response(
                {"error": "Source order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            target_order = PurchaseOrder.objects.get(id=target_id, tenant=request.tenant)
        except (PurchaseOrder.DoesNotExist, ValueError, ValidationError):
            return Response(
                {"error": "Target order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            spec = copy_fit_spec(source_order, target_order, request.user)
        except NoCurrentFitSpecError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(spec)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        order = serializer.validated_data["purchase_order"]
        is_first = not FitSpec.objects.filter(tenant=tenant, purchase_order=order).exists()
        next_version = (
            FitSpec.objects.filter(tenant=tenant, purchase_order=order)
            .aggregate(m=Max("version"))["m"] or 0
        ) + 1
        serializer.save(
            tenant=tenant, version=next_version, is_current=is_first,
            created_by=self.request.user,
        )

    def perform_update(self, serializer):
        with transaction.atomic():
            instance = serializer.save()
            if instance.is_current:
                FitSpec.objects.filter(
                    tenant=self.request.tenant, purchase_order=instance.purchase_order
                ).exclude(id=instance.id).update(is_current=False)

    @action(detail=True, methods=["post"], url_path="set-current")
    def set_current(self, request, pk=None):
        spec = self.get_object()
        with transaction.atomic():
            FitSpec.objects.filter(
                tenant=request.tenant, purchase_order=spec.purchase_order
            ).update(is_current=False)
            spec.is_current = True
            spec.save(update_fields=["is_current"])
        return Response({"status": "current", "id": str(spec.id)})


class JobRequestViewSet(viewsets.ModelViewSet):
    queryset = JobRequest.objects.all()
    serializer_class = JobRequestSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["job_number", "description", "style__style_number"]
    filterset_fields = ["job_type", "status", "priority", "style", "purchase_order", "assigned_to"]
    ordering_fields = ["priority", "required_by_date", "created_at"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "dashboard": "merchandising:view",
        "queue": "merchandising:view",
        "unsold_analysis": "merchandising:view",
    }

    def get_queryset(self):
        return JobRequest.objects.filter(tenant=self.request.tenant)

    @action(detail=False, methods=["get"], url_path="unsold_analysis")
    def unsold_analysis(self, request):
        """Quarterly report of styles by completed samples not sold (GC-034).

        Completed `sample` JobRequests within the period are grouped by style;
        styles with a FileOpening against them are "sold", the rest are "not sold".
        """
        today = timezone.localdate()
        start_param = request.query_params.get("start_date")
        end_param = request.query_params.get("end_date")
        start = datetime.strptime(start_param, "%Y-%m-%d").date() if start_param else today - timedelta(days=90)
        end = datetime.strptime(end_param, "%Y-%m-%d").date() if end_param else today

        jobs = self.get_queryset().filter(
            job_type=JobType.SAMPLE,
            status=JobStatus.COMPLETED,
            created_at__date__range=(start, end),
        )
        rows = (
            jobs.values("style_id", "style__style_number", "style__name", "style__buyer__name")
            .annotate(sample_count=Count("id"))
            .order_by("-sample_count")
        )

        style_ids = [r["style_id"] for r in rows]
        styles = Style.objects.filter(id__in=style_ids) if style_ids else Style.objects.none()
        style_map = {s.id: s for s in styles}
        filed_ids = set(
            FileOpening.objects.filter(tenant=request.tenant, style_id__in=style_ids)
            .values_list("style_id", flat=True)
        ) if style_ids else set()

        results = []
        for row in rows:
            style = style_map.get(row["style_id"])
            has_file = row["style_id"] in filed_ids
            main_image = None
            if style:
                image = style.design_images.filter(is_main=True).first() or style.design_images.first()
                main_image = image.image.url if image and image.image else None
            results.append({
                "style_id": str(row["style_id"]),
                "style_number": row["style__style_number"],
                "style_name": row["style__name"],
                "buyer_name": row["style__buyer__name"],
                "sample_count": row["sample_count"],
                "has_file": has_file,
                "not_sold": not has_file,
                "main_image": main_image,
            })

        status_filter = request.query_params.get("status")
        if status_filter == "not_sold":
            results = [r for r in results if r["not_sold"]]
        elif status_filter == "sold":
            results = [r for r in results if not r["not_sold"]]

        sold = sum(1 for r in results if not r["not_sold"])
        return Response({
            "period": {"start": start.isoformat(), "end": end.isoformat()},
            "summary": {
                "total_samples": jobs.count(),
                "styles_sampled": len(results),
                "sold": sold,
                "not_sold": len(results) - sold,
            },
            "results": results,
        })

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """Aggregated queue statistics (GC-014)."""
        qs = self.get_queryset()
        today = timezone.localdate()
        week_end = today + timedelta(days=7)
        active = [JobStatus.PENDING, JobStatus.IN_PROGRESS]
        return Response({
            "total": qs.count(),
            "by_status": {
                value: qs.filter(status=value).count() for value, _ in JobStatus.choices
            },
            "by_type": {
                value: qs.filter(job_type=value).count() for value, _ in JobType.choices
            },
            "by_priority": {
                label.lower(): qs.filter(priority=value).count()
                for value, label in JobPriority.choices
            },
            "overdue": qs.filter(
                status__in=active, required_by_date__lt=today
            ).count(),
            "due_this_week": qs.filter(
                status__in=active, required_by_date__range=(today, week_end)
            ).count(),
            "unassigned": qs.filter(assigned_to__isnull=True).count(),
        })

    @action(detail=False, methods=["get"], url_path="queue")
    def queue(self, request):
        """Active job queue: pending/in-progress, highest priority first."""
        qs = self.get_queryset().filter(
            status__in=[JobStatus.PENDING, JobStatus.IN_PROGRESS]
        ).order_by("-priority", "required_by_date", "created_at")
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        last = JobRequest.objects.filter(tenant=tenant).order_by("-created_at").first() if tenant else None
        if last and last.job_number.startswith("JOB-"):
            try:
                num = int(last.job_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                num = 1001
        else:
            num = 1001
        serializer.save(tenant=tenant, job_number=f"JOB-{num:04d}", created_by=self.request.user)


class POAmendmentViewSet(viewsets.ModelViewSet):
    queryset = POAmendment.objects.all()
    serializer_class = POAmendmentSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["purchase_order", "status"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return POAmendment.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        tenant = self.request.tenant
        last = POAmendment.objects.filter(tenant=tenant).order_by("-created_at").first()
        if last and last.amendment_number.startswith("AMD-"):
            try:
                num = int(last.amendment_number.split("-")[1]) + 1
            except (IndexError, ValueError):
                num = 1001
        else:
            num = 1001
        po = serializer.validated_data["purchase_order"]
        field_name = serializer.validated_data.get("field_name", "")
        old_value = str(getattr(po, field_name, "")) if field_name else ""
        serializer.save(
            tenant=tenant, amendment_number=f"AMD-{num:04d}",
            old_value=old_value, created_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        amendment = self.get_object()
        if amendment.status != "pending":
            return Response({"error": "Only pending amendments can be approved"}, status=status.HTTP_400_BAD_REQUEST)
        amendment.status = "approved"
        amendment.approved_by = request.user
        amendment.approved_at = timezone.now()
        amendment.save(update_fields=["status", "approved_by", "approved_at"])

        po = amendment.purchase_order
        if amendment.field_name and hasattr(po, amendment.field_name):
            setattr(po, amendment.field_name, amendment.new_value)
            po.save(update_fields=[amendment.field_name])

        return Response({"status": "approved", "message": "Amendment approved and applied"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        amendment = self.get_object()
        if amendment.status != "pending":
            return Response({"error": "Only pending amendments can be rejected"}, status=status.HTTP_400_BAD_REQUEST)
        amendment.status = "rejected"
        amendment.save(update_fields=["status"])
        return Response({"status": "rejected", "message": "Amendment rejected"})


class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.all()
    serializer_class = BOMSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["name"]
    filterset_fields = ["status", "style_version"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "copy_trims": "merchandising:edit",
    }

    def get_queryset(self):
        return BOM.objects.filter(tenant=self.request.tenant)

    @action(detail=True, methods=["post"], url_path="copy-trims")
    def copy_trims(self, request, pk=None):
        """Copy trim/label line items from another order's BOM (GC-009)."""
        target_bom = self.get_object()
        source_id = request.data.get("source_bom")
        if not source_id:
            return Response(
                {"error": "source_bom is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            source_bom = BOM.objects.get(id=source_id, tenant=request.tenant)
        except (BOM.DoesNotExist, ValueError, ValidationError):
            return Response(
                {"error": "Source BOM not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        overwrite_raw = request.data.get("overwrite", False)
        if isinstance(overwrite_raw, str):
            overwrite = overwrite_raw.lower() in ("1", "true", "yes", "on")
        else:
            overwrite = bool(overwrite_raw)
        selective = request.data.get("selective", "all")
        if selective not in ("all", "detail", "washcare"):
            return Response(
                {"error": "selective must be one of 'all', 'detail', 'washcare'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = copy_trim_items(
                source_bom, target_bom,
                overwrite=overwrite, selective=selective,
            )
        except NoTrimItemsError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


    @action(detail=True, methods=["get"])
    def items(self, request, pk=None):
        bom = self.get_object()
        items = BOMItem.objects.filter(tenant=request.tenant, bom=bom)
        serializer = BOMItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        bom = self.get_object()
        if bom.status != "draft":
            return Response({"error": "Only draft BOMs can be activated"}, status=status.HTTP_400_BAD_REQUEST)
        if not bom.items.exists():
            return Response({"error": "Cannot activate a BOM with no items. Add at least one item first."}, status=status.HTTP_400_BAD_REQUEST)
        BOM.objects.filter(
            tenant=request.tenant, style_version=bom.style_version, status="active"
        ).exclude(id=bom.id).update(status="archived")
        bom.status = "active"
        bom.save(update_fields=["status"])
        return Response({"status": "active"})


class BOMItemViewSet(viewsets.ModelViewSet):
    queryset = BOMItem.objects.all()
    serializer_class = BOMItemSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["bom", "category", "status", "supplier"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return BOMItem.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
        )


class CostingViewSet(viewsets.ModelViewSet):
    queryset = Costing.objects.all()
    serializer_class = CostingSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["status", "purchase_order", "sheet_type", "is_live", "is_single_size", "is_patterned", "confirmed"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "set_live": "merchandising:edit", "confirm": "merchandising:edit",
        "pattern_amendment": "merchandising:edit",
    }

    def get_queryset(self):
        return Costing.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        from decimal import Decimal
        fabric = Decimal(str(serializer.validated_data.get("fabric_cost", 0)))
        trim = Decimal(str(serializer.validated_data.get("trim_cost", 0)))
        cm = Decimal(str(serializer.validated_data.get("cm_cost", 0)))
        overhead = Decimal(str(serializer.validated_data.get("overhead_cost", 0)))
        total = fabric + trim + cm + overhead
        serializer.save(
            tenant=self.request.tenant,
            total_cost=total,
            created_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        costing = self.get_object()
        if costing.status not in ("draft", "pending"):
            return Response(
                {"error": f"Cannot approve costing in '{costing.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        costing.status = "approved"
        costing.approved_by = request.user
        costing.approved_at = timezone.now()
        costing.save(update_fields=["status", "approved_by", "approved_at"])
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        costing = self.get_object()
        if costing.status not in ("draft", "pending"):
            return Response(
                {"error": f"Cannot reject costing in '{costing.status}' status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        costing.status = "rejected"
        costing.save(update_fields=["status"])
        return Response({"status": "rejected"})

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Tick the confirmed box once the costing is confirmed with the customer."""
        costing = self.get_object()
        costing.confirmed = True
        costing.confirmed_by = request.user
        costing.confirmed_at = timezone.now()
        costing.save(update_fields=["confirmed", "confirmed_by", "confirmed_at"])
        return Response({"status": "confirmed"})

    @action(detail=True, methods=["post"])
    def pattern_amendment(self, request, pk=None):
        """A pattern amendment MUST request a new costing at the same time.

        Creates the next costing version for the same order, carrying the
        design-costing options and lines forward, with the amendment recorded
        in the notes and a fresh draft status.
        """
        costing = self.get_object()
        note = (request.data.get("note") or "").strip()
        if not note:
            return Response(
                {"error": "A note describing the pattern amendment is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        latest = (
            Costing.objects.filter(tenant=costing.tenant, purchase_order=costing.purchase_order)
            .order_by("-version")
            .first()
        )
        next_version = (latest.version if latest else costing.version) + 1
        new_cost = Costing.objects.create(
            tenant=costing.tenant,
            purchase_order=costing.purchase_order,
            bom=costing.bom,
            version=next_version,
            status="draft",
            sheet_type=costing.sheet_type,
            is_live=False,
            exchange_rate=costing.exchange_rate,
            target_price=costing.target_price,
            fabric_cost=costing.fabric_cost,
            trim_cost=costing.trim_cost,
            cm_cost=costing.cm_cost,
            overhead_cost=costing.overhead_cost,
            total_cost=costing.total_cost,
            margin=costing.margin,
            notes=f"Pattern amendment: {note}",
            is_single_size=costing.is_single_size,
            size_ratio=costing.size_ratio,
            confirmed=False,
            is_patterned=costing.is_patterned,
            patterned_fabric_options=costing.patterned_fabric_options,
            created_by=request.user,
        )
        for line in costing.lines.all().order_by("sort_order", "created_at"):
            CostingLine.objects.create(
                tenant=costing.tenant,
                costing=new_cost,
                category=line.category,
                description=line.description,
                unit_price=line.unit_price,
                consumption=line.consumption,
                is_additional=line.is_additional,
                original_description=line.original_description,
                size_width=line.size_width,
                sort_order=line.sort_order,
                created_by=request.user,
            )
        return Response(self.get_serializer(new_cost).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def generate_from_bom(self, request):
        bom_id = request.data.get("bom_id")
        po_id = request.data.get("purchase_order_id")
        if not bom_id or not po_id:
            return Response(
                {"error": "bom_id and purchase_order_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            bom = BOM.objects.get(id=bom_id)
            po = PurchaseOrder.objects.get(id=po_id)
        except (BOM.DoesNotExist, PurchaseOrder.DoesNotExist):
            return Response(
                {"error": "BOM or Purchase Order not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        from decimal import Decimal
        D = Decimal
        items = bom.items.all()
        fabric = sum(
            (item.unit_price or D(0)) * (item.consumption or D(0)) *
            (D(1) + (item.waste_percent or D(0)) / D(100))
            for item in items if item.category == "fabric"
        )
        trim = sum(
            (item.unit_price or D(0)) * (item.consumption or D(0)) *
            (D(1) + (item.waste_percent or D(0)) / D(100))
            for item in items if item.category == "trim"
        )
        accessories = sum(
            (item.unit_price or D(0)) * (item.consumption or D(0)) *
            (D(1) + (item.waste_percent or D(0)) / D(100))
            for item in items if item.category in ("accessories", "accessory", "packaging", "label", "other")
        )

        fabric_d = D(str(fabric))
        trim_d = D(str(trim + accessories))
        overhead = (fabric_d + trim_d) * D("0.10")

        max_version = Costing.objects.filter(purchase_order=po).aggregate(max_v=Max("version"))["max_v"] or 0
        costing = Costing.objects.create(
            purchase_order=po,
            bom=bom,
            version=max_version + 1,
            fabric_cost=fabric_d,
            trim_cost=trim_d,
            cm_cost=0,
            overhead_cost=overhead,
            total_cost=fabric_d + trim_d + overhead,
            status="draft",
            tenant=request.tenant,
            created_by=request.user,
        )
        return Response(CostingSerializer(costing).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        costing = self.get_object()
        import csv
        from io import StringIO

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Field", "Value"])
        writer.writerow(["PO Number", costing.purchase_order.po_number])
        writer.writerow(["Version", costing.version])
        writer.writerow(["Status", costing.status])
        writer.writerow(["Sheet Type", costing.get_sheet_type_display()])
        writer.writerow(["Live", "Yes" if costing.is_live else "No"])
        writer.writerow(["Exchange Rate", str(costing.exchange_rate or "N/A")])
        writer.writerow(["Landed Cost (GBP)", str(costing.landed_cost or "N/A")])
        writer.writerow(["Fabric Cost", str(costing.fabric_cost)])
        writer.writerow(["Trim Cost", str(costing.trim_cost)])
        writer.writerow(["CM Cost", str(costing.cm_cost)])
        writer.writerow(["Overhead Cost", str(costing.overhead_cost)])
        writer.writerow(["Total Cost", str(costing.total_cost)])
        writer.writerow(["Target Price", str(costing.target_price or "N/A")])
        writer.writerow(["Margin", str(costing.margin)])
        if costing.approved_by:
            writer.writerow(["Approved By", str(costing.approved_by)])
            writer.writerow(["Approved At", str(costing.approved_at)])
        writer.writerow([])
        writer.writerow(["Cost Lines"])
        writer.writerow(["Category", "Description", "Unit Price", "Consumption", "Line Total", "Additional", "Original Description", "Approved By", "Approved At"])
        for line in costing.lines.all():
            writer.writerow([
                line.category, line.description, str(line.unit_price), str(line.consumption),
                str(line.line_total), "Yes" if line.is_additional else "No",
                line.original_description, str(line.approved_by or ""), str(line.approved_at or ""),
            ])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="costing_{costing.purchase_order.po_number}_v{costing.version}.csv"'
        return response

    @action(detail=False, methods=["post"])
    def compare(self, request):
        ids = request.data.get("ids", [])
        if not ids or len(ids) < 2:
            return Response(
                {"error": "At least 2 costing IDs required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        costings = Costing.objects.filter(id__in=ids)
        return Response(CostingSerializer(costings, many=True).data)

    @action(detail=True, methods=["post"])
    def set_live(self, request, pk=None):
        costing = self.get_object()
        Costing.objects.filter(
            purchase_order=costing.purchase_order, tenant=costing.tenant
        ).update(is_live=False)
        costing.is_live = True
        costing.save(update_fields=["is_live"])
        return Response(CostingSerializer(costing).data)


class CostingLineViewSet(viewsets.ModelViewSet):
    queryset = CostingLine.objects.all()
    serializer_class = CostingLineSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["costing", "category", "is_additional"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
        "approve": "merchandising:edit",
    }

    def get_queryset(self):
        return CostingLine.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        line = self.get_object()
        if not line.is_additional:
            return Response(
                {"error": "Only additional cost lines can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )
        line.approved_by = request.user
        line.approved_at = timezone.now()
        line.save(update_fields=["approved_by", "approved_at"])
        return Response(CostingLineSerializer(line).data)


class TAViewSet(viewsets.ModelViewSet):
    queryset = TA.objects.all()
    serializer_class = TASerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["status", "purchase_order"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return TA.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        tenant = request.tenant
        today = timezone.localtime(timezone.now()).date()
        qs = TAMilestone.objects.filter(ta__status="active", tenant=request.tenant)

        overdue = qs.filter(status="delayed") | qs.filter(
            status__in=["pending", "in_progress"],
            planned_date__lt=today
        )
        upcoming = qs.filter(
            status__in=["pending", "in_progress"],
            planned_date__gte=today,
            planned_date__lte=today + timedelta(days=7)
        )

        return Response({
            "overdue": TASerializer(
                TA.objects.filter(milestones__in=overdue).distinct(),
                many=True, context={"request": request}
            ).data,
            "upcoming": TASerializer(
                TA.objects.filter(milestones__in=upcoming).distinct(),
                many=True, context={"request": request}
            ).data,
            "overdue_count": overdue.count(),
            "upcoming_count": upcoming.count(),
        })

    @action(detail=False, methods=["get"])
    def calendar_data(self, request):
        tenant = request.tenant
        tas = TA.objects.filter(tenant=tenant)

        start = request.query_params.get("start")
        end = request.query_params.get("end")

        if start:
            tas = tas.filter(delivery_date__gte=start)
        if end:
            tas = tas.filter(delivery_date__lte=end)

        events = []
        for ta in tas[:200]:
            events.append({
                "id": ta.id,
                "title": ta.purchase_order.po_number if ta.purchase_order else "N/A",
                "date": str(ta.delivery_date),
                "status": ta.status,
                "po_number": ta.purchase_order.po_number if ta.purchase_order else "",
            })

            milestones = ta.milestones.all()
            for m in milestones:
                if m.planned_date:
                    events.append({
                        "id": f"m-{m.id}",
                        "title": m.name,
                        "date": str(m.planned_date),
                        "status": m.status,
                        "is_milestone": True,
                        "ta_id": ta.id,
                    })

        return Response(events)

    @action(detail=False, methods=["get"])
    def heatmap(self, request):
        tenant = request.tenant
        tas = TA.objects.filter(tenant=tenant)

        data = []
        for ta in tas[:200]:
            milestones = ta.milestones.all()
            total = milestones.count()
            completed = milestones.filter(status="completed").count()
            delayed = milestones.filter(status="delayed").count()
            progress = (completed / total * 100) if total > 0 else 0

            data.append({
                "ta_id": ta.id,
                "po_number": ta.purchase_order.po_number if ta.purchase_order else "",
                "delivery_date": str(ta.delivery_date),
                "status": ta.status,
                "progress": round(progress),
                "total_milestones": total,
                "completed_milestones": completed,
                "delayed_milestones": delayed,
                "risk_level": "high" if delayed > 0 else ("medium" if progress < 50 else "low"),
            })

        return Response(data)


class TAMilestoneViewSet(viewsets.ModelViewSet):
    queryset = TAMilestone.objects.all()
    serializer_class = TAMilestoneSerializer
    pagination_class = StandardResultsSetPagination
    filterset_fields = ["status", "ta", "is_critical"]
    permission_classes = [IsAuthenticated, HasPermission]
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return TAMilestone.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class DesignSheetViewSet(viewsets.ModelViewSet):
    """Design sheet CRUD + workflow (Week 2)."""

    queryset = DesignSheet.objects.all()
    serializer_class = DesignSheetSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    pagination_class = StandardResultsSetPagination
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return DesignSheet.objects.filter(tenant=self.request.tenant).select_related(
            "tech_pack__style__buyer"
        )

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["post"], url_path="transition")
    def transition(self, request, pk=None):
        """Move design sheet through its workflow states."""
        design_sheet = self.get_object()
        new_status = request.data.get("status")
        if new_status != DesignSheet.Status.NEW and (
            not design_sheet.tech_pack.issuer or not design_sheet.tech_pack.designer
        ):
            return Response(
                {
                    "error": (
                        "Issuer and Designer are mandatory and must be set "
                        "before moving the design sheet out of New."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            design_sheet.transition_to(new_status)
        except ValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            "status": design_sheet.status,
            "message": f"Design sheet set to {design_sheet.get_status_display()}",
        })

    @action(detail=True, methods=["patch"], url_path="annotations")
    def annotations(self, request, pk=None):
        """Save the sketch annotation list (id, x, y, text)."""
        design_sheet = self.get_object()
        value = request.data.get("annotations")
        if not isinstance(value, list):
            return Response(
                {"error": "annotations must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for item in value:
            if not isinstance(item, dict) or "id" not in item or "text" not in item:
                return Response(
                    {"error": "each annotation needs id and text"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            for key in ("x", "y"):
                if key in item and not isinstance(item[key], (int, float)):
                    return Response(
                        {"error": f"{key} must be numeric"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        design_sheet.sketch_annotations = value
        design_sheet.save(update_fields=["sketch_annotations", "updated_at"])
        return Response({"annotations": design_sheet.sketch_annotations})

    @action(detail=True, methods=["post"], url_path="create-job")
    def create_job(self, request, pk=None):
        """Create a job request for this design sheet."""
        design_sheet = self.get_object()
        data = request.data
        job_type = data.get("job_type")
        if job_type not in DesignJobRequest.JobType.values:
            return Response(
                {"error": f"Invalid job type. Valid: {list(DesignJobRequest.JobType.values)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        req_by = data.get("required_by")
        if not req_by:
            return Response({"error": "required_by is required"}, status=status.HTTP_400_BAD_REQUEST)
        job = DesignJobRequest.objects.create(
            tenant=request.tenant,
            design_sheet=design_sheet,
            job_type=job_type,
            required_by=req_by,
            work_location=data.get("work_location", ""),
            no_of_garments=data.get("no_of_garments", 1),
            allocated_to_id=data.get("allocated_to"),
            notes=data.get("notes", ""),
        )
        return Response(
            DesignJobRequestSerializer(job, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="copy-fit-spec")
    def copy_fit_spec(self, request, pk=None):
        """
        Copy a fit spec into this design sheet.

        Source is either an explicit ``source_design_sheet`` id ("Copy from
        Another Style") or, when omitted, the sheet itself is based on
        (``tech_pack.based_on`` matching a file number - "Copy from Base").
        The source's selected spec is copied (falling back to its latest);
        the copy becomes the target's new selected spec. Images follow the
        spec unless ``include_images`` is false.
        """
        target = self.get_object()
        base_ref = target.tech_pack.based_on or ""
        source_id = request.data.get("source_design_sheet")
        if source_id:
            source = (
                DesignSheet.objects.filter(tenant=target.tenant)
                .filter(id=source_id)
                .first()
            )
            if source is None:
                return Response({"detail": "Source design sheet not found."}, status=status.HTTP_400_BAD_REQUEST)
        elif base_ref:
            source = (
                DesignSheet.objects.filter(tenant=target.tenant)
                .filter(
                    Q(tech_pack__techpack_number=base_ref)
                    | Q(tech_pack__based_on=base_ref)
                )
                .exclude(id=target.id)
                .order_by("-created_at")
                .first()
            )
            if source is None:
                return Response({"detail": f"No design sheet found for base '{base_ref}'."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "No source design sheet or base reference to copy from."}, status=status.HTTP_400_BAD_REQUEST)

        if source.id == target.id:
            return Response({"detail": "Source and target must be different design sheets."}, status=status.HTTP_400_BAD_REQUEST)

        src_spec = (
            source.fit_specs.filter(is_selected=True).order_by("-created_at").first()
            or source.fit_specs.order_by("-created_at").first()
        )
        if src_spec is None:
            return Response({"detail": "Source design sheet has no fit specs to copy."}, status=status.HTTP_400_BAD_REQUEST)

        include_images = str(request.data.get("include_images", True)).lower() not in ("false", "0", "no")
        include_annotations = str(request.data.get("include_annotations", True)).lower() not in ("false", "0", "no")
        fit_labels = ["DEV SPEC", "1ST FIT", "2ND FIT", "3RD FIT", "4TH FIT"]
        existing = target.fit_specs.count()
        fit_number = fit_labels[existing] if existing < len(fit_labels) else f"FIT {existing + 1}"
        target.fit_specs.update(is_selected=False)
        new_spec = FitSpecification.objects.create(
            tenant=target.tenant,
            design_sheet=target,
            fit_number=fit_number,
            fit_date=src_spec.fit_date,
            description=src_spec.description,
            notes=src_spec.notes,
            is_selected=True,
        )
        if include_images:
            for img in src_spec.images.all():
                new_img = FitImage(
                    tenant=target.tenant, fit_spec=new_spec,
                    caption=img.caption, order=img.order,
                )
                if img.image.name:
                    new_img.image.name = img.image.name
                new_img.save()
        if include_annotations and source.sketch_annotations:
            merged = list(target.sketch_annotations or []) + [
                {**annotation, "id": str(uuid.uuid4())}
                for annotation in source.sketch_annotations
            ]
            target.sketch_annotations = merged
            target.save(update_fields=["sketch_annotations", "updated_at"])

        return Response(
            FitSpecificationSerializer(new_spec, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class FitSpecificationViewSet(viewsets.ModelViewSet):
    """Fit specification CRUD for design sheets (Week 2)."""

    queryset = FitSpecification.objects.all()
    serializer_class = FitSpecificationSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    pagination_class = StandardResultsSetPagination
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return FitSpecification.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["post"], url_path="select")
    def select(self, request, pk=None):
        """Mark this fit spec as the selected/approved one."""
        fit_spec = self.get_object()
        FitSpecification.objects.filter(
            tenant=request.tenant, design_sheet=fit_spec.design_sheet,
            is_selected=True,
        ).update(is_selected=False)
        fit_spec.is_selected = True
        fit_spec.save(update_fields=["is_selected", "updated_at"])
        return Response({"is_selected": True, "message": f"{fit_spec.fit_number} selected"})


class DesignJobRequestViewSet(viewsets.ModelViewSet):
    """Design-sheet job requests CRUD (Week 2)."""

    queryset = DesignJobRequest.objects.all()
    serializer_class = DesignJobRequestSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    pagination_class = StandardResultsSetPagination
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return DesignJobRequest.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)


class FitImageViewSet(viewsets.ModelViewSet):
    """Fit spec images CRUD (Week 2)."""

    queryset = FitImage.objects.all()
    serializer_class = FitImageSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    pagination_class = StandardResultsSetPagination
    required_permissions = {
        "list": "merchandising:view", "retrieve": "merchandising:view",
        "create": "merchandising:create", "update": "merchandising:edit",
        "partial_update": "merchandising:edit", "destroy": "merchandising:delete",
    }

    def get_queryset(self):
        return FitImage.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant)