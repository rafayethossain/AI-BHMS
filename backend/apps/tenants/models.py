"""
Tenant models for multi-tenancy.
"""
import uuid
from django.db import models
from django.utils.text import slugify


class Tenant(models.Model):
    """
    Tenant model for multi-tenancy.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    schema_name = models.CharField(max_length=100, unique=True)
    
    # Company Information
    legal_name = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="tenants/logos/", blank=True, null=True)
    
    # Settings
    timezone = models.CharField(max_length=50, default="Asia/Dhaka")
    currency = models.CharField(max_length=3, default="BDT")
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
            ("suspended", "Suspended"),
        ],
        default="active"
    )
    
    # Subscription
    plan = models.CharField(
        max_length=50,
        choices=[
            ("starter", "Starter"),
            ("professional", "Professional"),
            ("enterprise", "Enterprise"),
        ],
        default="starter"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["name"]
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        if not self.schema_name:
            self.schema_name = f"tenant_{self.slug}"
        super().save(*args, **kwargs)


class Office(models.Model):
    """
    Office/Location model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="offices")
    
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    
    office_type = models.CharField(
        max_length=20,
        choices=[
            ("hq", "Head Office"),
            ("branch", "Branch"),
            ("warehouse", "Warehouse"),
            ("factory", "Factory"),
        ],
        default="branch"
    )
    
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
        ],
        default="active"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["code"]
        unique_together = ["tenant", "code"]
        verbose_name = "Office"
        verbose_name_plural = "Offices"
    
    def __str__(self):
        return f"{self.code} - {self.name}"
