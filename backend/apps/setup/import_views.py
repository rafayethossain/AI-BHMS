"""
CSV/Excel import views for Setup master data.
"""
import csv
import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from apps.core.permissions import HasPermission
from .models import (
    Season, Buyer, Brand, Factory, Vendor, Currency,
    Country, Department, Designation, UOM, ColorCode,
    PaymentTerms, DeliveryMode, ProductCategory, ProductType,
    ProductDepartment
)


IMPORT_CONFIGS = {
    "buyers": {
        "model": Buyer,
        "columns": {"code": str, "name": str, "contact_person": str, "email": str, "phone": str, "address": str},
    },
    "brands": {
        "model": Brand,
        "columns": {"buyer_code": str, "code": str, "name": str},
        "foreign_keys": {"buyer_code": {"model": Buyer, "field": "code"}},
    },
    "factories": {
        "model": Factory,
        "columns": {"code": str, "name": str, "contact_person": str, "email": str, "phone": str, "address": str, "city": str},
    },
    "vendors": {
        "model": Vendor,
        "columns": {"code": str, "name": str, "contact_person": str, "email": str, "phone": str, "address": str, "city": str},
    },
    "seasons": {
        "model": Season,
        "columns": {"code": str, "name": str},
    },
    "currencies": {
        "model": Currency,
        "columns": {"code": str, "name": str, "symbol": str},
    },
    "countries": {
        "model": Country,
        "columns": {"code": str, "name": str},
    },
    "departments": {
        "model": Department,
        "columns": {"code": str, "name": str},
    },
    "designations": {
        "model": Designation,
        "columns": {"code": str, "name": str},
    },
    "uoms": {
        "model": UOM,
        "columns": {"code": str, "name": str},
    },
    "color_codes": {
        "model": ColorCode,
        "columns": {"code": str, "name": str, "hex_code": str},
    },
    "payment_terms": {
        "model": PaymentTerms,
        "columns": {"code": str, "name": str, "days": int},
    },
    "delivery_modes": {
        "model": DeliveryMode,
        "columns": {"code": str, "name": str, "description": str},
    },
    "product_categories": {
        "model": ProductCategory,
        "columns": {"code": str, "name": str},
    },
    "product_types": {
        "model": ProductType,
        "columns": {"code": str, "name": str, "category_code": str},
        "foreign_keys": {"category_code": {"model": ProductCategory, "field": "code"}},
    },
    "product_departments": {
        "model": ProductDepartment,
        "columns": {"code": str, "name": str},
    },
}


class SetupImportView(APIView):
    """
    Import setup data from CSV or Excel file.

    POST /api/v1/setup/import/?entity=<entity_name>

    CSV format: first row is headers matching the entity columns.
    """
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = "setup:create"
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        entity = request.query_params.get("entity")
        if not entity or entity not in IMPORT_CONFIGS:
            return Response(
                {"error": f"Invalid entity. Valid: {', '.join(sorted(IMPORT_CONFIGS.keys()))}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        config = IMPORT_CONFIGS[entity]
        model = config["model"]
        columns = config["columns"]
        foreign_keys = config.get("foreign_keys", {})
        tenant = request.tenant

        # Parse file
        rows = self._parse_file(file)
        if not rows:
            return Response({"error": "File is empty or has no valid rows"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate headers
        headers = rows[0]
        missing = [c for c in columns if c not in headers]
        if missing:
            return Response(
                {"error": f"Missing columns: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        created = 0
        updated = 0
        errors = []

        for i, row in enumerate(rows, start=2):
            try:
                data = {}
                for col, col_type in columns.items():
                    val = row.get(col, "")
                    if val == "":
                        data[col] = None
                    elif col_type == int:
                        data[col] = int(val)
                    elif col_type == float:
                        data[col] = float(val)
                    else:
                        data[col] = str(val).strip()

                # Resolve foreign keys
                for fk_col, fk_config in foreign_keys.items():
                    fk_val = data.pop(fk_col, None)
                    if fk_val:
                        fk_model = fk_config["model"]
                        fk_field = fk_config["field"]
                        try:
                            fk_obj = fk_model.objects.filter(tenant=tenant, **{fk_field: fk_val}).first()
                            if not fk_obj:
                                fk_obj = fk_model.objects.filter(**{fk_field: fk_val}).first()
                            if fk_obj:
                                data[fk_col.replace("_code", "").replace("_id", "")] = fk_obj
                            else:
                                errors.append(f"Row {i}: {fk_config['model'].__name__} '{fk_val}' not found")
                                continue
                        except Exception as e:
                            errors.append(f"Row {i}: FK error - {str(e)}")
                            continue

                # Get lookup field (code or unique field)
                lookup = {"code": data.get("code")}
                if "buyer" in data:
                    lookup["buyer"] = data["buyer"]

                existing = model.objects.filter(tenant=tenant, **lookup).first() if tenant else None
                if existing:
                    for k, v in data.items():
                        if v is not None:
                            setattr(existing, k, v)
                    existing.save()
                    updated += 1
                else:
                    model.objects.create(tenant=tenant, **data) if tenant else None
                    created += 1
            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")

        return Response({
            "created": created,
            "updated": updated,
            "errors": errors,
            "total_rows": len(rows),
        })

    def _parse_file(self, file):
        """Parse CSV or Excel file into list of dicts."""
        filename = file.name.lower()

        if filename.endswith((".xlsx", ".xls")):
            return self._parse_excel(file)
        else:
            return self._parse_csv(file)

    def _parse_csv(self, file):
        """Parse CSV file."""
        try:
            decoded = file.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            return [row for row in reader]
        except Exception:
            return []

    def _parse_excel(self, file):
        """Parse Excel file."""
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file, read_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                return []
            headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]
            result = []
            for row in rows[1:]:
                result.append({headers[i]: row[i] if row[i] is not None else "" for i in range(len(headers))})
            return result
        except Exception:
            return []
