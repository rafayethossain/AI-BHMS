"""
Core models for BHMS.
"""
import uuid
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """
    Abstract base model with created/updated timestamps.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created"
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class TenantModel(TimeStampedModel):
    """
    Abstract base model for tenant-specific data.
    """
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="%(class)s_set"
    )

    class Meta:
        abstract = True


class Note(TenantModel):
    """
    Abstract base model for standardized notes with author tracking.
    """
    text = models.TextField()
    author = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_notes"
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    @property
    def author_initials(self):
        if self.author:
            first = self.author.first_name or ""
            last = self.author.last_name or ""
            return (first[0] + last[0]).upper() if first or last else "--"
        return "--"

    def __str__(self):
        return f"Note by {self.author_initials} at {self.created_at}"
