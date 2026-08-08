"""
Monitoring models for BHMS.
"""
from django.db import models
from apps.core.models import TenantModel


class AuditLog(TenantModel):
    AUDIT_ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("view", "View"),
        ("export", "Export"),
        ("transition", "Status Transition"),
    ]

    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    entity_name = models.CharField(max_length=200)
    action = models.CharField(max_length=20, choices=AUDIT_ACTION_CHOICES)
    description = models.TextField()
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monitoring_audit_logs"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.action} {self.entity_type} by {self.user}"


class SystemHealth(TenantModel):
    SERVICE_CHOICES = [
        ("database", "Database"),
        ("cache", "Cache"),
        ("celery", "Celery"),
        ("storage", "Storage"),
        ("api", "API"),
    ]
    STATUS_CHOICES = [
        ("healthy", "Healthy"),
        ("degraded", "Degraded"),
        ("down", "Down"),
    ]

    service = models.CharField(max_length=50, choices=SERVICE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    response_time_ms = models.IntegerField(null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-checked_at"]
        verbose_name_plural = "System health records"

    def __str__(self):
        return f"{self.service}: {self.status}"


class Alert(TenantModel):
    ALERT_TYPE_CHOICES = [
        ("info", "Info"),
        ("warning", "Warning"),
        ("critical", "Critical"),
    ]
    SERVICE_CHOICES = [
        ("system", "System"),
        ("production", "Production"),
        ("quality", "Quality"),
        ("shipment", "Shipment"),
        ("financial", "Financial"),
    ]

    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    service = models.CharField(max_length=50, choices=SERVICE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    entity_type = models.CharField(max_length=100, null=True, blank=True)
    entity_id = models.CharField(max_length=100, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_alerts"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.alert_type}] {self.title}"
