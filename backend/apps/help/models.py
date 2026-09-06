"""
Help & Onboarding models for BHMS.
RQ-050: Tour completions, onboarding checklist, release notes — tenant-scoped, data-backed.
"""
import uuid
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel, TenantModel


class TourCompletion(TenantModel):
    """Records that a user completed a named tour (e.g. 'welcome-tour', 'merchandising-tour')."""

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="tour_completions",
    )
    tour_id = models.CharField(max_length=100, help_text="Machine-readable tour key")
    completed_at = models.DateTimeField(default=timezone.now)

    class Meta(TenantModel.Meta):
        unique_together = [("tenant", "user", "tour_id")]
        ordering = ["-completed_at"]

    def __str__(self):
        return f"{self.tour_id} by {self.user.email} at {self.completed_at}"


class OnboardingChecklistItem(TenantModel):
    """Per-user onboarding checklist progress (e.g. 'created_style', 'opened_file')."""

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="onboarding_items",
    )
    item_key = models.CharField(max_length=100, help_text="Machine-readable checklist key")
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta(TenantModel.Meta):
        unique_together = [("tenant", "user", "item_key")]
        ordering = ["item_key"]

    def mark_completed(self):
        self.completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=["completed", "completed_at", "updated_at"])

    def mark_incomplete(self):
        self.completed = False
        self.completed_at = None
        self.save(update_fields=["completed", "completed_at", "updated_at"])

    def __str__(self):
        status = "done" if self.completed else "pending"
        return f"{self.item_key} ({status}) by {self.user.email}"


class ReleaseNote(TimeStampedModel):
    """Versioned release notes — published/unpublished, with body content."""

    version = models.CharField(max_length=50, help_text="Semver or release label (e.g. '1.2.0')")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    released_at = models.DateTimeField()
    is_published = models.BooleanField(default=True)

    class Meta(TimeStampedModel.Meta):
        ordering = ["-released_at"]

    def __str__(self):
        return f"v{self.version} — {self.title}"
