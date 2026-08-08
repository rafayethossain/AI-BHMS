"""
Commercial URL patterns for BHMS.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BankViewSet,
    DebitNoteViewSet,
    InvoiceApprovalViewSet,
    LCAmendmentViewSet,
    LCViewSet,
    ProformaInvoiceViewSet,
    SalesConfirmationViewSet,
    SalesContractViewSet,
)

router = DefaultRouter()
router.register(r"lcs", LCViewSet)
router.register(r"lc-amendments", LCAmendmentViewSet)
router.register(r"banks", BankViewSet)
router.register(r"proforma-invoices", ProformaInvoiceViewSet)
router.register(r"sales-contracts", SalesContractViewSet)
router.register(r"sales-confirmations", SalesConfirmationViewSet)
router.register(r"debit-notes", DebitNoteViewSet)
router.register(r"invoice-approvals", InvoiceApprovalViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
