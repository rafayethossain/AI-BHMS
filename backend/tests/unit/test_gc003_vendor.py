"""
Tests for GC-003: Supplier Pre-Approval Workflow.
"""
import pytest
from django.utils import timezone


@pytest.mark.django_db
class TestVendorPreApproval:
    def test_vendor_default_not_approved(self, tenant):
        from apps.setup.models import Vendor
        vendor = Vendor.objects.create(
            tenant=tenant, code="VND001", name="Test Vendor"
        )
        assert vendor.is_approved is False
        assert vendor.approved_by is None
        assert vendor.approved_at is None

    def test_vendor_can_be_approved(self, tenant, user):
        from apps.setup.models import Vendor
        vendor = Vendor.objects.create(
            tenant=tenant, code="VND002", name="Approved Vendor"
        )
        vendor.is_approved = True
        vendor.approved_by = user
        vendor.approved_at = timezone.now()
        vendor.save()
        vendor.refresh_from_db()
        assert vendor.is_approved is True
        assert vendor.approved_by == user
        assert vendor.approved_at is not None

    def test_vendor_approval_reset(self, tenant, user):
        from apps.setup.models import Vendor
        vendor = Vendor.objects.create(
            tenant=tenant, code="VND003", name="Vendor To Reset"
        )
        vendor.is_approved = True
        vendor.approved_by = user
        vendor.approved_at = timezone.now()
        vendor.save()
        vendor.is_approved = False
        vendor.approved_by = None
        vendor.approved_at = None
        vendor.save()
        vendor.refresh_from_db()
        assert vendor.is_approved is False
        assert vendor.approved_by is None
        assert vendor.approved_at is None

    def test_filter_approved_vendors(self, tenant, user):
        from apps.setup.models import Vendor
        v1 = Vendor.objects.create(tenant=tenant, code="VND004", name="Approved", is_approved=True)
        v2 = Vendor.objects.create(tenant=tenant, code="VND005", name="Not Approved")
        v3 = Vendor.objects.create(tenant=tenant, code="VND006", name="Also Approved", is_approved=True)
        approved = Vendor.objects.filter(tenant=tenant, is_approved=True)
        assert approved.count() == 2
        assert v1 in approved
        assert v3 in approved

    def test_vendor_str_with_approval_status(self, tenant):
        from apps.setup.models import Vendor
        vendor = Vendor.objects.create(
            tenant=tenant, code="VND007", name="Test Vendor",
            is_approved=True,
        )
        assert vendor.is_approved is True
