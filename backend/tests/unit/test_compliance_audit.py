"""
Tests for Compliance Audit (GC-029).

Weekly order review against the GC Manual's 8 review items (page 47):
fabric paperwork, mini-marker efficiency (above 85%), dockets, fabric
utilisation, factory invoice, fabric rating, recon costed vs actual,
final hits. TDD: tests written before the model.
"""
import csv
from datetime import date, timedelta
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient

from apps.merchandising.models import FileOpening, PurchaseOrder, Style, StyleVersion
from apps.quality.models import ComplianceAudit
from apps.setup.models import Brand, Buyer, Country, Currency, Factory, Season
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ca_tenant(db):
    return Tenant.objects.create(
        name="Compliance Audit Test Co", slug="ca-test",
        schema_name="tenant_ca", status="active"
    )


@pytest.fixture
def ca_role(db, ca_tenant):
    role = Role.objects.create(tenant=ca_tenant, name="QualAdmin", is_system=True)
    for mod in ["quality", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def ca_user(db, ca_tenant, ca_role):
    user = User.objects.create_user(
        username="causer", email="ca@test.com",
        password="testpass123!@#", tenant=ca_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=ca_role)
    return user


@pytest.fixture
def ca_client(api_client, ca_user):
    api_client.force_authenticate(user=ca_user)
    return api_client


@pytest.fixture
def seed_data(ca_tenant):
    currency = Currency.objects.create(tenant=ca_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=ca_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=ca_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=ca_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=ca_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=ca_tenant, code="F-001", name="Apex Knitwears")

    pos = []
    for idx in range(2):
        style = Style.objects.create(tenant=ca_tenant, style_number=f"STY-00{idx}", name=f"Style {idx}", buyer=buyer)
        sv = StyleVersion.objects.create(tenant=ca_tenant, style=style, version_number=1, status="active")
        fo = FileOpening.objects.create(
            tenant=ca_tenant, file_number=f"FO-00{idx}", style=style, style_version=sv,
            buyer=buyer, factory=factory, file_date="2026-01-01"
        )
        po = PurchaseOrder.objects.create(
            tenant=ca_tenant, po_number=f"PO-0{idx}", file_opening=fo, buyer=buyer,
            factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
            quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
        )
        pos.append(po)
    return {
        "currency": currency, "country": country, "season": season,
        "buyer": buyer, "brand": brand, "factory": factory,
        "pos": pos,
    }


def this_monday():
    return date.today() - timedelta(days=date.today().weekday())


# ==================== ComplianceAudit Model Tests ====================

@pytest.mark.django_db
class TestComplianceAuditModel:
    def test_week_start_normalization(self):
        assert ComplianceAudit.week_start_for(date(2026, 8, 5)) == date(2026, 8, 3)
        assert ComplianceAudit.week_start_for(date(2026, 8, 3)) == date(2026, 8, 3)

    def test_defaults_all_na(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        for key, _label in ComplianceAudit.CHECKLIST_ITEMS:
            assert audit.status_for(key) == "na"
        assert audit.efficiency_rate is None
        assert audit.efficiency_met is None
        assert audit.fail_count == 0
        assert audit.overall_pass is True
        assert audit.reviewed is False

    def test_efficiency_below_threshold_fails(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(), efficiency_rate="80.00",
        )
        assert audit.mini_marker_efficiency_status == "fail"
        assert audit.efficiency_met is False
        assert audit.overall_pass is False
        assert audit.fail_count == 1

    def test_efficiency_above_threshold_passes(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(), efficiency_rate="90.00",
        )
        assert audit.mini_marker_efficiency_status == "pass"
        assert audit.efficiency_met is True
        assert audit.overall_pass is True

    def test_efficiency_at_threshold_passes(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(), efficiency_rate="85.00",
        )
        assert audit.mini_marker_efficiency_status == "pass"

    def test_item_fail_flips_overall(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(), final_hits_status="fail",
        )
        assert audit.overall_pass is False
        assert audit.fail_count == 1

    def test_fail_count_multiple(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(), dockets_status="fail",
            factory_invoice_status="fail",
        )
        assert audit.fail_count == 2
        assert audit.overall_pass is False

    def test_reviewed_flag(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        assert audit.reviewed is False
        audit.fabric_paperwork_status = "pass"
        audit.save(update_fields=["fabric_paperwork_status"])
        assert audit.reviewed is True

    def test_warning_count_consecutive_fails(self, ca_tenant, seed_data):
        po = seed_data["pos"][0]
        base = this_monday()
        first = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=po, week_start=base - timedelta(weeks=2),
            fabric_paperwork_status="fail",
        )
        second = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=po, week_start=base - timedelta(weeks=1),
            final_hits_status="fail",
        )
        third = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=po, week_start=base,
            dockets_status="pass",
        )
        assert first.warning_count == 1
        assert second.warning_count == 2
        assert third.warning_count == 0
        assert third.warning_label == "No warnings"

    def test_warning_count_caps_at_three(self, ca_tenant, seed_data):
        po = seed_data["pos"][0]
        base = this_monday()
        oldest = None
        for weeks_ago in range(3, -1, -1):
            oldest = ComplianceAudit.objects.create(
                tenant=ca_tenant, purchase_order=po,
                week_start=base - timedelta(weeks=weeks_ago),
                fabric_paperwork_status="fail",
            )
        assert oldest.warning_count == 3
        assert oldest.warning_label == "3rd warning"

    def test_unique_per_po_and_week(self, ca_tenant, seed_data):
        po = seed_data["pos"][0]
        ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=po, week_start=this_monday(),
        )
        with pytest.raises(IntegrityError):
            ComplianceAudit.objects.create(
                tenant=ca_tenant, purchase_order=po, week_start=this_monday(),
            )

    def test_str(self, ca_tenant, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        assert "PO-00" in str(audit)


# ==================== ComplianceAudit API Tests ====================

@pytest.mark.django_db
class TestComplianceAuditAPI:
    def test_unauthenticated_401(self, api_client):
        response = api_client.get("/api/v1/quality/compliance-audits/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_audit(self, ca_client, seed_data):
        response = ca_client.post("/api/v1/quality/compliance-audits/", {
            "purchase_order": str(seed_data["pos"][0].id),
            "week_start": str(this_monday()),
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["po_number"] == "PO-00"
        assert response.data["overall_pass"] is True
        assert response.data["reviewed"] is False
        assert response.data["warning_count"] == 0

    def test_create_with_failing_item(self, ca_client, seed_data):
        response = ca_client.post("/api/v1/quality/compliance-audits/", {
            "purchase_order": str(seed_data["pos"][0].id),
            "week_start": str(this_monday()),
            "final_hits_status": "fail",
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["overall_pass"] is False
        assert response.data["fail_count"] == 1

    def test_retrieve_audit(self, ca_client, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=seed_data["pos"][0].tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        response = ca_client.get(f"/api/v1/quality/compliance-audits/{audit.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(audit.id)

    def test_update_status_recalculates(self, ca_client, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=seed_data["pos"][0].tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        response = ca_client.patch(f"/api/v1/quality/compliance-audits/{audit.id}/", {
            "fabric_rating_status": "fail",
            "efficiency_rate": "90.00",
        })
        assert response.status_code == status.HTTP_200_OK
        audit.refresh_from_db()
        assert audit.fabric_rating_status == "fail"
        assert audit.overall_pass is False
        assert audit.efficiency_met is True

    def test_delete_audit(self, ca_client, seed_data):
        audit = ComplianceAudit.objects.create(
            tenant=seed_data["pos"][0].tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        response = ca_client.delete(f"/api/v1/quality/compliance-audits/{audit.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert ComplianceAudit.objects.filter(id=audit.id).count() == 0

    def test_filter_by_purchase_order(self, ca_client, seed_data):
        po1, po2 = seed_data["pos"]
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po1, week_start=this_monday(),
        )
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po2, week_start=this_monday(),
        )
        response = ca_client.get(f"/api/v1/quality/compliance-audits/?purchase_order={po1.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_by_week(self, ca_client, seed_data):
        po = seed_data["pos"][0]
        ComplianceAudit.objects.create(tenant=po.tenant, purchase_order=po, week_start=this_monday())
        ComplianceAudit.objects.create(
            tenant=po.tenant, purchase_order=po,
            week_start=this_monday() - timedelta(weeks=1),
        )
        response = ca_client.get(f"/api/v1/quality/compliance-audits/?week_start={this_monday()}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_result_fail(self, ca_client, seed_data):
        po1, po2 = seed_data["pos"]
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po1, week_start=this_monday(),
            fabric_paperwork_status="pass",
        )
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po2, week_start=this_monday(),
            final_hits_status="fail",
        )
        response = ca_client.get("/api/v1/quality/compliance-audits/?result=fail")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["po_number"] == "PO-01"

    def test_filter_result_pass(self, ca_client, seed_data):
        po1, po2 = seed_data["pos"]
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po1, week_start=this_monday(),
            fabric_paperwork_status="pass",
        )
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po2, week_start=this_monday(),
        )
        response = ca_client.get("/api/v1/quality/compliance-audits/?result=pass")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_filter_result_pending(self, ca_client, seed_data):
        po1, po2 = seed_data["pos"]
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po1, week_start=this_monday(),
            fabric_paperwork_status="pass",
        )
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po2, week_start=this_monday(),
        )
        response = ca_client.get("/api/v1/quality/compliance-audits/?result=pending")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["po_number"] == "PO-01"

    def test_efficiency_rate_out_of_range(self, ca_client, seed_data):
        response = ca_client.post("/api/v1/quality/compliance-audits/", {
            "purchase_order": str(seed_data["pos"][0].id),
            "week_start": str(this_monday()),
            "efficiency_rate": "150.00",
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_weekly_overview_default_week(self, ca_client, seed_data):
        po1, po2 = seed_data["pos"]
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po1, week_start=this_monday(),
            fabric_paperwork_status="pass", efficiency_rate="88.00",
        )
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po2, week_start=this_monday(),
            final_hits_status="fail",
        )
        response = ca_client.get("/api/v1/quality/compliance-audits/weekly_overview/")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["week_start"] == str(this_monday())
        assert data["threshold"] == 85.00
        assert len(data["checklist"]) == 8
        assert data["summary"]["total_orders"] == 2
        assert data["summary"]["audited"] == 2
        assert data["summary"]["pass"] == 1
        assert data["summary"]["fail"] == 1
        assert data["summary"]["pending"] == 0
        assert len(data["results"]) == 2

    def test_weekly_overview_pending_orders(self, ca_client, seed_data):
        po1, po2 = seed_data["pos"]
        ComplianceAudit.objects.create(
            tenant=po1.tenant, purchase_order=po1, week_start=this_monday(),
            fabric_paperwork_status="pass",
        )
        response = ca_client.get("/api/v1/quality/compliance-audits/weekly_overview/")
        data = response.data
        assert data["summary"]["pending"] == 1
        assert len(data["pending_orders"]) == 1
        assert data["pending_orders"][0]["po_number"] == "PO-01"

    def test_weekly_overview_week_param(self, ca_client, seed_data):
        po = seed_data["pos"][0]
        last_week = this_monday() - timedelta(weeks=1)
        ComplianceAudit.objects.create(
            tenant=po.tenant, purchase_order=po, week_start=last_week,
            fabric_paperwork_status="pass",
        )
        response = ca_client.get(
            f"/api/v1/quality/compliance-audits/weekly_overview/?week={last_week}"
        )
        data = response.data
        assert data["week_start"] == str(last_week)
        assert data["summary"]["audited"] == 1

    def test_weekly_overview_checklist_keys(self, ca_client, seed_data):
        response = ca_client.get("/api/v1/quality/compliance-audits/weekly_overview/")
        keys = [item["key"] for item in response.data["checklist"]]
        assert "mini_marker_efficiency" in keys
        assert "final_hits" in keys
        assert "fabric_paperwork" in keys

    def test_export_csv(self, ca_client, seed_data):
        po = seed_data["pos"][0]
        ComplianceAudit.objects.create(
            tenant=po.tenant, purchase_order=po, week_start=this_monday(),
            fabric_paperwork_status="pass", efficiency_rate="90.00",
        )
        response = ca_client.get("/api/v1/quality/compliance-audits/export/")
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"].startswith("text/csv")
        body = response.content.decode("utf-8")
        assert "po_number" in body
        assert "PO-00" in body
        assert "Mini-marker efficiency" in body
        rows = list(csv.DictReader(StringIO(body)))
        assert len(rows) == 1
        assert rows[0]["overall_pass"] == "True"

    def test_requires_permission(self, api_client, ca_tenant, seed_data):
        role = Role.objects.create(tenant=ca_tenant, name="ReadOnly", is_system=True)
        perm, _ = Permission.objects.get_or_create(
            module="quality", action="view",
            defaults={"description": "quality:view"}
        )
        RolePermission.objects.create(role=role, permission=perm)
        user = User.objects.create_user(
            username="reader", email="reader@test.com",
            password="testpass123!@#", tenant=ca_tenant, status="active"
        )
        UserRole.objects.create(user=user, role=role)
        api_client.force_authenticate(user=user)
        response = api_client.post("/api/v1/quality/compliance-audits/", {
            "purchase_order": str(seed_data["pos"][0].id),
            "week_start": str(this_monday()),
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_tenant_isolation(self, api_client, ca_tenant, seed_data):
        other_tenant = Tenant.objects.create(
            name="Other Co", slug="other-co",
            schema_name="tenant_other", status="active"
        )
        role = Role.objects.create(tenant=other_tenant, name="OtherAdmin", is_system=True)
        for mod in ["quality", "merchandising", "setup"]:
            for act in ["view", "create", "edit", "delete"]:
                perm, _ = Permission.objects.get_or_create(
                    module=mod, action=act,
                    defaults={"description": f"{mod}:{act}"}
                )
                RolePermission.objects.create(role=role, permission=perm)
        other_user = User.objects.create_user(
            username="other", email="other@test.com",
            password="testpass123!@#", tenant=other_tenant, status="active"
        )
        UserRole.objects.create(user=other_user, role=role)
        ComplianceAudit.objects.create(
            tenant=ca_tenant, purchase_order=seed_data["pos"][0],
            week_start=this_monday(),
        )
        api_client.force_authenticate(user=other_user)
        api_client.credentials(HTTP_X_TENANT_ID=str(other_tenant.id))
        response = api_client.get("/api/v1/quality/compliance-audits/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
