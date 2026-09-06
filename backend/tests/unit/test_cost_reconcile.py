"""
RQ-046 (B5): Cost update / reconcile tests.

Target requirements (reference manual Cost update / reconcile): compare the
Factory Invoice (make price / MP) against the Planning CM for the same order;
derive a Saving/Loss per unit and total by order/invoice quantity; flag a
mismatch; and expose a report. Exposed as CRUD + compare/resolve actions on a
Tabulator grid. The two snapshot inputs are stored when the reconciliation is
created so the comparison is a point-in-time record.
"""
from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.logistics.models import CostReconciliation, ExportRecap
from apps.merchandising.models import Costing, PurchaseOrder
from apps.setup.models import Buyer, Factory, Vendor
from apps.tenants.models import Tenant
from apps.users.models import Permission, Role, RolePermission, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def cr_tenant(db):
    return Tenant.objects.create(
        name="Cost Recon Co", slug="cost-recon",
        schema_name="tenant_cr", status="active"
    )


@pytest.fixture
def cr_tenant2(db):
    return Tenant.objects.create(
        name="Cost Recon Co 2", slug="cost-recon-2",
        schema_name="tenant_cr_2", status="active"
    )


def _make_role(tenant, name, perms):
    role = Role.objects.create(tenant=tenant, name=name, is_system=True)
    for module, action in perms:
        perm, _ = Permission.objects.get_or_create(
            module=module, action=action, defaults={"description": f"{module}:{action}"}
        )
        RolePermission.objects.create(role=role, permission=perm)
    return role


def _make_user(tenant, role, username):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.com",
        password="testpass123!@#", tenant=tenant, status="active"
    )
    UserRole.objects.create(user=user, role=role)
    return user


@pytest.fixture
def cr_editor_client(api_client, cr_tenant):
    role = _make_role(
        cr_tenant, "CrAdmin",
        [(m, a) for m in ("logistics", "setup", "merchandising", "commercial")
         for a in ("view", "create", "edit", "delete")],
    )
    user = _make_user(cr_tenant, role, "cr_editor")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def cr_viewer_client(api_client, cr_tenant):
    role = _make_role(
        cr_tenant, "CrViewer",
        [(m, a) for m in ("logistics", "setup", "merchandising", "commercial")
         for a in ("view",)],
    )
    user = _make_user(cr_tenant, role, "cr_viewer")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def cr_nolog_client(api_client, cr_tenant):
    role = _make_role(cr_tenant, "NoLogistics", [("setup", "view")])
    user = _make_user(cr_tenant, role, "cr_nolog")
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def seed_buyer(cr_tenant):
    return Buyer.objects.create(tenant=cr_tenant, code="B-CR-1", name="Test Buyer")


@pytest.fixture
def seed_factory(cr_tenant):
    return Factory.objects.create(tenant=cr_tenant, code="F-CR-1", name="Apex Knitwears")


@pytest.fixture
def seed_vendor(cr_tenant):
    return Vendor.objects.create(tenant=cr_tenant, code="V-CR-1", name="Zenith Fabrics")


@pytest.fixture
def seed_po(cr_tenant, seed_buyer, seed_factory):
    po = PurchaseOrder.objects.create(
        tenant=cr_tenant, po_number="PO-CR-100",
        buyer=seed_buyer, factory=seed_factory, po_date=date(2026, 1, 1),
        delivery_date=date(2026, 6, 1), quantity=1000,
        unit_price=Decimal("5.00"), total_value=Decimal("5000.00"),
    )
    return po


@pytest.fixture
def seed_costing(cr_tenant, seed_po):
    return Costing.objects.create(
        tenant=cr_tenant, purchase_order=seed_po, is_live=True,
        cm_cost=Decimal("1.80"), total_cost=Decimal("3.20"), margin=Decimal("36.00"),
    )


@pytest.fixture
def seed_export_recap(cr_tenant, seed_po, seed_vendor):
    return ExportRecap.objects.create(
        tenant=cr_tenant, purchase_order=seed_po, supplier=seed_vendor,
        fob_no="FOB-2026-100", factory_invoice="FI-CR-100",
        quantity=1000, fob_value=Decimal("5000.00"),
        cmpt_value=Decimal("2000.00"), cost_value=Decimal("4800.00"),
        factory_amount=Decimal("2000.00"),
    )


def _payload(cr_tenant, po, **kwargs):
    payload = {
        "purchase_order": str(po.id) if po else None,
        "factory_inv_amount": "2000.00",
        "factory_inv_qty": "1000",
        "planning_cm_amount": "1800.00",
        "planning_cm_qty": "1000",
        "status": "pending",
        "notes": "Factory Inv vs Planning CM for PO-CR-100.",
    }
    payload.update(kwargs)
    return payload


def _base():
    return "/api/v1/logistics/cost-reconciliations"


class TestCostReconciliationModel:
    def test_model_and_defaults(self, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        assert cr.id is not None
        assert cr.factory_inv_per_unit == Decimal("2.00")
        assert cr.planning_cm_per_unit == Decimal("1.80")
        assert cr.saving_loss_per_unit == Decimal("0.20")
        assert cr.saving_loss_total == Decimal("200.00")
        assert cr.status == "pending"
        assert cr.reconciled_by is None

    def test_mismatch_flag_when_saving_loss_non_zero(self, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("2000.00"), planning_cm_qty=Decimal("1000"),
        )
        assert cr.factory_inv_per_unit == Decimal("2.00")
        assert cr.planning_cm_per_unit == Decimal("2.00")
        assert cr.saving_loss_per_unit == Decimal("0.00")
        assert cr.saving_loss_total == Decimal("0.00")
        assert cr.is_mismatch is False

    def test_loss_is_negative_saving(self, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("1800.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("2000.00"), planning_cm_qty=Decimal("1000"),
        )
        assert cr.saving_loss_per_unit == Decimal("-0.20")
        assert cr.saving_loss_total == Decimal("-200.00")
        assert cr.is_mismatch is True

    def test_compare_recomputes_and_preserves_status(self, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("1000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1000.00"), planning_cm_qty=Decimal("1000"),
        )
        assert cr.is_mismatch is False
        cr.compare(factory_inv_amount=Decimal("2000.00"), planning_cm_amount=Decimal("1800.00"))
        assert cr.factory_inv_per_unit == Decimal("2.00")
        assert cr.saving_loss_per_unit == Decimal("0.20")
        assert cr.is_mismatch is True

    def test_resolve_status_stamps_user(self, cr_tenant, seed_po, cr_editor_client):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        user = cr_editor_client.handler._force_user if hasattr(cr_editor_client, "handler") else None
        cr.resolve_status("resolved", user)
        assert cr.status == "resolved"
        assert cr.reconciled_at is not None


class TestCostReconciliationAPI:
    def test_create_computes_display_fields(self, cr_editor_client, cr_tenant, seed_po):
        resp = cr_editor_client.post(
            f"{_base()}/", _payload(cr_tenant, seed_po), format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        body = resp.data
        assert body["po_number"] == "PO-CR-100"
        assert Decimal(body["saving_loss_per_unit"]) == Decimal("0.20")
        assert Decimal(body["saving_loss_total"]) == Decimal("200.00")
        assert body["is_mismatch"] is True
        assert body["status_label"] == "Pending"
        assert body["tenant"] == cr_tenant.id

    def test_list_and_search_by_po(self, cr_editor_client, cr_tenant, seed_po):
        CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        resp = cr_editor_client.get(_base()+"/", {"search": "PO-CR-100"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["po_number"] == "PO-CR-100"

    def test_filter_by_status_and_mismatch(self, cr_editor_client, cr_tenant, seed_po):
        CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("2000.00"), planning_cm_qty=Decimal("1000"),
            status="resolved",
        )
        resp = cr_editor_client.get(_base()+"/", {"status": "resolved"})
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["status"] == "resolved"
        resp2 = cr_editor_client.get(_base()+"/", {"mismatch": "true"})
        assert resp2.data["count"] == 1

    def test_compare_action(self, cr_editor_client, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("1000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1000.00"), planning_cm_qty=Decimal("1000"),
        )
        resp = cr_editor_client.post(
            f"{_base()}/{cr.id}/compare/",
            {"factory_inv_amount": "2500.00", "planning_cm_amount": "2000.00"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        cr.refresh_from_db()
        assert cr.factory_inv_per_unit == Decimal("2.50")
        assert cr.saving_loss_per_unit == Decimal("0.50")
        assert cr.is_mismatch is True

    def test_resolve_action(self, cr_editor_client, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        resp = cr_editor_client.post(f"{_base()}/{cr.id}/resolve/", {"status": "resolved"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        cr.refresh_from_db()
        assert cr.status == "resolved"
        assert cr.reconciled_at is not None
        assert cr.reconciled_by is not None

    def test_update(self, cr_editor_client, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        resp = cr_editor_client.patch(
            f"{_base()}/{cr.id}/", {"notes": "Updated recon"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        cr.refresh_from_db()
        assert cr.notes == "Updated recon"

    def test_delete(self, cr_editor_client, cr_tenant, seed_po):
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        resp = cr_editor_client.delete(f"{_base()}/{cr.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not CostReconciliation.objects.filter(pk=cr.id).exists()

    def test_viewer_cannot_create_or_modify(self, cr_viewer_client, cr_tenant, seed_po):
        resp = cr_viewer_client.post(
            f"{_base()}/", _payload(cr_tenant, seed_po), format="json"
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        cr = CostReconciliation.objects.create(
            tenant=cr_tenant, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        res = cr_viewer_client.post(f"{_base()}/{cr.id}/resolve/", {"status": "resolved"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_no_logistics_permission_cannot_list(self, cr_nolog_client):
        resp = cr_nolog_client.get(_base()+"/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_isolation(self, cr_editor_client, cr_tenant2, seed_po, api_client):
        other = Tenant.objects.create(
            name="Other Co", slug="other-cr", schema_name="tenant_ocr", status="active"
        )
        role = _make_role(
            other, "OtherAdmin",
            [(m, a) for m in ("logistics", "setup", "merchandising", "commercial")
             for a in ("view", "create", "edit", "delete")],
        )
        user = _make_user(other, role, "other_cr_editor")
        api_client.force_authenticate(user=user)
        other_rec = CostReconciliation.objects.create(
            tenant=other, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        CostReconciliation.objects.create(
            tenant=cr_tenant2, purchase_order=seed_po,
            factory_inv_amount=Decimal("2000.00"), factory_inv_qty=Decimal("1000"),
            planning_cm_amount=Decimal("1800.00"), planning_cm_qty=Decimal("1000"),
        )
        auth = {"HTTP_X_TENANT_ID": str(other.id)}
        list_resp = api_client.get(_base()+"/", **auth)
        assert list_resp.status_code == status.HTTP_200_OK
        assert list_resp.data["count"] == 1
        assert list_resp.data["results"][0]["id"] == str(other_rec.id)