"""
Tests for logistics app.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.users.models import Role, UserRole, Permission, RolePermission
from apps.setup.models import Factory, Currency, Country, Season, Buyer, Brand
from apps.merchandising.models import Style, StyleVersion, FileOpening, PurchaseOrder
from apps.logistics.models import FreightForwarder, Shipment

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def log_tenant(db):
    return Tenant.objects.create(
        name="Logistics Test Co", slug="log-test",
        schema_name="tenant_log", status="active"
    )


@pytest.fixture
def log_role(db, log_tenant):
    role = Role.objects.create(tenant=log_tenant, name="LogAdmin", is_system=True)
    for mod in ["logistics", "merchandising", "setup"]:
        for act in ["view", "create", "edit", "delete"]:
            perm, _ = Permission.objects.get_or_create(
                module=mod, action=act,
                defaults={"description": f"{mod}:{act}"}
            )
            RolePermission.objects.create(role=role, permission=perm)
    return role


@pytest.fixture
def log_user(db, log_tenant, log_role):
    user = User.objects.create_user(
        username="loguser", email="log@test.com",
        password="testpass123!@#", tenant=log_tenant, status="active"
    )
    UserRole.objects.create(user=user, role=log_role)
    return user


@pytest.fixture
def log_client(api_client, log_user):
    api_client.force_authenticate(user=log_user)
    return api_client


@pytest.fixture
def seed_data(log_tenant):
    currency = Currency.objects.create(tenant=log_tenant, code="USD", name="US Dollar", symbol="$")
    country = Country.objects.create(tenant=log_tenant, code="BGD", name="Bangladesh")
    season = Season.objects.create(tenant=log_tenant, code="SS26", name="SS 2026")
    buyer = Buyer.objects.create(tenant=log_tenant, code="HM", name="H&M", country=country, currency=currency)
    brand = Brand.objects.create(tenant=log_tenant, buyer=buyer, code="HM-BM", name="Basics")
    factory = Factory.objects.create(tenant=log_tenant, code="F-001", name="Apex Knitwears")
    style = Style.objects.create(tenant=log_tenant, style_number="STY-001", name="Test Style", buyer=buyer)
    sv = StyleVersion.objects.create(tenant=log_tenant, style=style, version_number=1, status="active")
    fo = FileOpening.objects.create(
        tenant=log_tenant, file_number="FO-001", style=style, style_version=sv,
        buyer=buyer, factory=factory, file_date="2026-01-01"
    )
    po = PurchaseOrder.objects.create(
        tenant=log_tenant, po_number="PO-001", file_opening=fo, buyer=buyer,
        factory=factory, po_date="2026-01-15", delivery_date="2026-06-01",
        quantity=1000, unit_price=10.00, total_value=10000.00, currency=currency,
    )
    return {
        "currency": currency, "country": country, "season": season,
        "buyer": buyer, "brand": brand, "factory": factory,
        "style": style, "sv": sv, "fo": fo, "po": po,
    }


# ==================== FreightForwarder Model Tests ====================

@pytest.mark.django_db
class TestFreightForwarderModel:
    def test_create_forwarder(self, log_tenant):
        ff = FreightForwarder.objects.create(
            tenant=log_tenant, code="FF-001", name="Maersk Line",
            contact_person="John Doe", email="john@maersk.com",
            phone="+1-234-567-8900",
        )
        assert ff.code == "FF-001"
        assert ff.name == "Maersk Line"
        assert ff.is_active is True

    def test_forwarder_str(self, log_tenant):
        ff = FreightForwarder.objects.create(
            tenant=log_tenant, code="FF-001", name="Maersk Line",
        )
        assert "FF-001" in str(ff)
        assert "Maersk Line" in str(ff)

    def test_forwarder_unique_code(self, log_tenant):
        FreightForwarder.objects.create(
            tenant=log_tenant, code="FF-001", name="Maersk",
        )
        with pytest.raises(Exception):
            FreightForwarder.objects.create(
                tenant=log_tenant, code="FF-001", name="Maersk Duplicate",
            )

    def test_forwarder_ordering(self, log_tenant):
        ff1 = FreightForwarder.objects.create(tenant=log_tenant, code="FF-002", name="MSC")
        ff2 = FreightForwarder.objects.create(tenant=log_tenant, code="FF-001", name="Maersk")
        forwarders = list(FreightForwarder.objects.filter(tenant=log_tenant))
        assert forwarders[0].id == ff1.id
        assert forwarders[1].id == ff2.id


# ==================== FreightForwarder API Tests ====================

@pytest.mark.django_db
class TestFreightForwarderAPI:
    def test_list_forwarders(self, log_client, seed_data):
        FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-001", name="Maersk",
        )
        response = log_client.get("/api/v1/logistics/freight-forwarders/")
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_forwarder(self, log_client, seed_data):
        ff = FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-001", name="Maersk",
        )
        response = log_client.get(f"/api/v1/logistics/freight-forwarders/{ff.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_update_forwarder(self, log_client, seed_data):
        ff = FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-001", name="Maersk",
        )
        response = log_client.patch(f"/api/v1/logistics/freight-forwarders/{ff.id}/", {
            "name": "Maersk Updated",
        })
        assert response.status_code == status.HTTP_200_OK

    def test_delete_forwarder(self, log_client, seed_data):
        ff = FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-001", name="Maersk",
        )
        response = log_client.delete(f"/api/v1/logistics/freight-forwarders/{ff.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_active(self, log_client, seed_data):
        FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-001", name="Maersk", is_active=True,
        )
        FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-002", name="MSC", is_active=False,
        )
        response = log_client.get("/api/v1/logistics/freight-forwarders/?is_active=true")
        assert response.status_code == status.HTTP_200_OK

    def test_search_forwarders(self, log_client, seed_data):
        FreightForwarder.objects.create(
            tenant=seed_data["po"].tenant, code="FF-001", name="Maersk Line",
        )
        response = log_client.get("/api/v1/logistics/freight-forwarders/?search=maersk")
        assert response.status_code == status.HTTP_200_OK


# ==================== Shipment Model Tests ====================

@pytest.mark.django_db
class TestShipmentModel:
    def test_create_shipment(self, log_tenant, seed_data):
        shipment = Shipment.objects.create(
            tenant=log_tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"],
            status="booked", container_size="40",
            port_of_loading="Chattogram", port_of_discharge="Rotterdam",
        )
        assert shipment.shipment_number == "SHIP-001"
        assert shipment.status == "booked"
        assert shipment.container_size == "40"

    def test_shipment_str(self, log_tenant, seed_data):
        shipment = Shipment.objects.create(
            tenant=log_tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        assert "SHIP-001" in str(shipment)
        assert "booked" in str(shipment)

    def test_shipment_unique_number(self, log_tenant, seed_data):
        Shipment.objects.create(
            tenant=log_tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        with pytest.raises(Exception):
            Shipment.objects.create(
                tenant=log_tenant, shipment_number="SHIP-001",
                purchase_order=seed_data["po"], status="booked",
            )

    def test_shipment_with_forwarder(self, log_tenant, seed_data):
        ff = FreightForwarder.objects.create(
            tenant=log_tenant, code="FF-001", name="Maersk",
        )
        shipment = Shipment.objects.create(
            tenant=log_tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], freight_forwarder=ff,
            status="booked",
        )
        assert shipment.freight_forwarder == ff


# ==================== Shipment API Tests ====================

@pytest.mark.django_db
class TestShipmentAPI:
    def test_list_shipments(self, log_client, seed_data):
        Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        response = log_client.get("/api/v1/logistics/shipments/")
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_shipment(self, log_client, seed_data):
        shipment = Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        response = log_client.get(f"/api/v1/logistics/shipments/{shipment.id}/")
        assert response.status_code == status.HTTP_200_OK

    def test_update_shipment(self, log_client, seed_data):
        shipment = Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        response = log_client.patch(f"/api/v1/logistics/shipments/{shipment.id}/", {
            "status": "in_transit",
        })
        assert response.status_code == status.HTTP_200_OK
        shipment.refresh_from_db()
        assert shipment.status == "in_transit"

    def test_delete_shipment(self, log_client, seed_data):
        shipment = Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        response = log_client.delete(f"/api/v1/logistics/shipments/{shipment.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_shipments_by_status(self, log_client, seed_data):
        Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-002",
            purchase_order=seed_data["po"], status="in_transit",
        )
        response = log_client.get("/api/v1/logistics/shipments/?status=booked")
        assert response.status_code == status.HTTP_200_OK

    def test_search_shipments(self, log_client, seed_data):
        Shipment.objects.create(
            tenant=seed_data["po"].tenant, shipment_number="SHIP-001",
            purchase_order=seed_data["po"], status="booked",
        )
        response = log_client.get("/api/v1/logistics/shipments/?search=SHIP-001")
        assert response.status_code == status.HTTP_200_OK
