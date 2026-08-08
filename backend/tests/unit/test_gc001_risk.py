"""
Tests for GC-001: Risk Indicator System.
"""
import pytest
from apps.setup.models import RiskLevel
from apps.tenants.models import Tenant


@pytest.mark.django_db
class TestRiskLevelModel:
    def test_create_risk_level(self, tenant):
        risk = RiskLevel.objects.create(
            tenant=tenant,
            code="high",
            name="High Risk",
            color="#FF0000",
            description="Critical risk requiring immediate attention",
            sort_order=1,
        )
        assert risk.code == "high"
        assert risk.color == "#FF0000"
        assert risk.sort_order == 1
        assert risk.is_active is True

    def test_risk_level_str(self, tenant):
        risk = RiskLevel.objects.create(
            tenant=tenant,
            code="medium",
            name="Medium Risk",
            color="#FFA500",
        )
        assert str(risk) == "medium - Medium Risk"

    def test_default_risk_level_is_active(self, tenant):
        risk = RiskLevel.objects.create(
            tenant=tenant,
            code="low",
            name="Low Risk",
            color="#00FF00",
        )
        assert risk.is_active is True

    def test_unique_code_per_tenant(self, tenant):
        RiskLevel.objects.create(
            tenant=tenant,
            code="red",
            name="Red",
            color="#FF0000",
        )
        with pytest.raises(Exception):
            RiskLevel.objects.create(
                tenant=tenant,
                code="red",
                name="Duplicate",
                color="#FF0000",
            )

    def test_same_code_different_tenants(self, tenant):
        tenant2 = Tenant.objects.create(
            name="Other Co", slug="other-co", schema_name="other", status="active", plan="professional"
        )
        RiskLevel.objects.create(tenant=tenant, code="red", name="Red", color="#FF0000")
        RiskLevel.objects.create(tenant=tenant2, code="red", name="Red", color="#FF0000")

    def test_sort_order_defaults_to_zero(self, tenant):
        risk = RiskLevel.objects.create(
            tenant=tenant,
            code="green",
            name="Green",
            color="#00FF00",
        )
        assert risk.sort_order == 0


@pytest.mark.django_db
class TestFileOpeningRiskLevel:
    def _create_buyer(self, tenant):
        from apps.setup.models import Buyer
        return Buyer.objects.create(
            tenant=tenant, code="BUY001", name="Test Buyer"
        )

    def _create_factory(self, tenant):
        from apps.setup.models import Factory
        return Factory.objects.create(
            tenant=tenant, code="FAC001", name="Test Factory"
        )

    def test_file_opening_can_have_risk_level(self, tenant):
        from apps.setup.models import RiskLevel, Buyer, Factory
        from apps.merchandising.models import Style, StyleVersion, FileOpening
        buyer = self._create_buyer(tenant)
        factory = self._create_factory(tenant)
        risk = RiskLevel.objects.create(tenant=tenant, code="amber", name="Amber", color="#FFA500")
        style = Style.objects.create(
            tenant=tenant, style_number="STY001", name="Test Style",
            buyer=buyer, created_by=None
        )
        version = StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=None
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00001", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", risk_level=risk, created_by=None
        )
        assert fo.risk_level == risk
        assert fo.risk_level.code == "amber"

    def test_file_opening_risk_level_nullable(self, tenant):
        from apps.setup.models import Buyer, Factory
        from apps.merchandising.models import Style, StyleVersion, FileOpening
        buyer = self._create_buyer(tenant)
        factory = self._create_factory(tenant)
        style = Style.objects.create(
            tenant=tenant, style_number="STY002", name="Test Style 2",
            buyer=buyer, created_by=None
        )
        version = StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=None
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00002", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=None
        )
        assert fo.risk_level is None


@pytest.mark.django_db
class TestPurchaseOrderRiskLevel:
    def test_purchase_order_can_have_risk_level(self, tenant):
        from apps.setup.models import RiskLevel, Buyer, Factory
        from apps.merchandising.models import Style, StyleVersion, FileOpening, PurchaseOrder
        buyer = Buyer.objects.create(tenant=tenant, code="BUY003", name="Test Buyer")
        factory = Factory.objects.create(tenant=tenant, code="FAC003", name="Test Factory")
        risk = RiskLevel.objects.create(tenant=tenant, code="red", name="Red", color="#FF0000")
        style = Style.objects.create(
            tenant=tenant, style_number="STY003", name="Test Style 3",
            buyer=buyer, created_by=None
        )
        version = StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=None
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00003", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=None
        )
        po = PurchaseOrder.objects.create(
            tenant=tenant, po_number="PO-00001", file_opening=fo,
            buyer=buyer, factory=factory, po_date="2025-01-01",
            delivery_date="2025-03-01", quantity=100, unit_price=10,
            total_value=1000, risk_level=risk, created_by=None
        )
        assert po.risk_level == risk
        assert po.risk_level.code == "red"


@pytest.mark.django_db
class TestShipmentRiskLevel:
    def test_shipment_can_have_risk_level(self, tenant):
        from apps.setup.models import RiskLevel, Buyer, Factory
        from apps.merchandising.models import (Style, StyleVersion, FileOpening, PurchaseOrder)
        from apps.logistics.models import Shipment
        buyer = Buyer.objects.create(tenant=tenant, code="BUY004", name="Test Buyer")
        factory = Factory.objects.create(tenant=tenant, code="FAC004", name="Test Factory")
        risk = RiskLevel.objects.create(tenant=tenant, code="cyan", name="Cyan", color="#00FFFF")
        style = Style.objects.create(
            tenant=tenant, style_number="STY004", name="Test Style 4",
            buyer=buyer, created_by=None
        )
        version = StyleVersion.objects.create(
            tenant=tenant, style=style, version_number=1, created_by=None
        )
        fo = FileOpening.objects.create(
            tenant=tenant, file_number="FO-00004", style=style,
            style_version=version, buyer=buyer, factory=factory,
            file_date="2025-01-01", created_by=None
        )
        po = PurchaseOrder.objects.create(
            tenant=tenant, po_number="PO-00002", file_opening=fo,
            buyer=buyer, factory=factory, po_date="2025-01-01",
            delivery_date="2025-03-01", quantity=100, unit_price=10,
            total_value=1000, created_by=None
        )
        shipment = Shipment.objects.create(
            tenant=tenant, shipment_number="SHP-00001",
            purchase_order=po, factory=factory,
            risk_level=risk, created_by=None
        )
        assert shipment.risk_level == risk
        assert shipment.risk_level.code == "cyan"
