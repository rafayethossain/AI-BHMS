"""
Setup master data models for BHMS.
"""
import uuid
from django.db import models
from apps.core.models import TenantModel


class Season(TenantModel):
    """
    Season master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Season"
        verbose_name_plural = "Seasons"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ProductCategory(TenantModel):
    """
    Product category master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children"
    )
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Product Category"
        verbose_name_plural = "Product Categories"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ProductType(TenantModel):
    """
    Product type master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.CASCADE,
        related_name="types"
    )
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Product Type"
        verbose_name_plural = "Product Types"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ProductDepartment(TenantModel):
    """
    Product department master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Product Department"
        verbose_name_plural = "Product Departments"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ComplianceDocumentType(TenantModel):
    """
    Compliance document type master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    validity_days = models.IntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Compliance Document Type"
        verbose_name_plural = "Compliance Document Types"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class DeliveryMode(TenantModel):
    """
    Delivery mode master data (FOB, CIF, CM, etc.).
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Delivery Mode"
        verbose_name_plural = "Delivery Modes"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class UOM(TenantModel):
    """
    Unit of Measurement master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Unit of Measurement"
        verbose_name_plural = "Units of Measurement"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Currency(TenantModel):
    """
    Currency master data.
    """
    code = models.CharField(max_length=3)
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=10)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1)
    is_default = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Currency"
        verbose_name_plural = "Currencies"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Department(TenantModel):
    """
    Department master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="children"
    )
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Department"
        verbose_name_plural = "Departments"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Designation(TenantModel):
    """
    Designation master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="designations"
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Designation"
        verbose_name_plural = "Designations"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class PaymentTerms(TenantModel):
    """
    Payment terms master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    days = models.IntegerField()
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Payment Terms"
        verbose_name_plural = "Payment Terms"
    
    def __str__(self):
        return f"{self.code} - {self.name} ({self.days} days)"


class Country(TenantModel):
    """
    Country master data.
    """
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100)
    default_currency = models.ForeignKey(
        Currency,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="countries"
    )
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Country"
        verbose_name_plural = "Countries"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class ColorCode(TenantModel):
    """
    Color code master data.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    hex_code = models.CharField(max_length=7)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Color Code"
        verbose_name_plural = "Color Codes"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Buyer(TenantModel):
    """
    Buyer master data.
    """
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buyers"
    )
    currency = models.ForeignKey(
        Currency,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buyers"
    )
    payment_terms = models.ForeignKey(
        PaymentTerms,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="buyers"
    )
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Buyer"
        verbose_name_plural = "Buyers"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Brand(TenantModel):
    """
    Brand master data.
    """
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, related_name="brands")
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    
    class Meta:
        ordering = ["code"]
        unique_together = ["buyer", "code"]
        verbose_name = "Brand"
        verbose_name_plural = "Brands"
    
    def __str__(self):
        return f"{self.buyer.code} - {self.code} - {self.name}"


class Factory(TenantModel):
    """
    Factory master data.
    """
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="factories"
    )
    capacity = models.IntegerField(null=True, blank=True)
    capacity_unit = models.CharField(
        max_length=20,
        choices=[("pieces", "Pieces"), ("dozens", "Dozens"), ("month", "Per Month")],
        blank=True
    )
    factory_type = models.CharField(
        max_length=50,
        choices=[("knitting", "Knitting"), ("woven", "Woven"), ("denim", "Denim")],
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Factory"
        verbose_name_plural = "Factories"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Vendor(TenantModel):
    """
    Vendor/Supplier master data.
    """
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vendors"
    )
    product_categories = models.JSONField(default=list, blank=True)
    payment_terms = models.ForeignKey(
        PaymentTerms,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vendors"
    )
    lead_time_days = models.IntegerField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )
    notes = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False, db_index=True)
    approved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_vendors"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["code"]
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class RiskLevel(TenantModel):
    """
    Risk indicator with color-coded levels.
    Used across FileOpening, PurchaseOrder, Shipment for risk tracking.
    """
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#808080")
    description = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("inactive", "Inactive")],
        default="active"
    )

    class Meta:
        ordering = ["sort_order", "code"]
        unique_together = ["tenant", "code"]
        verbose_name = "Risk Level"
        verbose_name_plural = "Risk Levels"

    def __str__(self):
        return f"{self.code} - {self.name}"
