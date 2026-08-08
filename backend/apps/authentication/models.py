"""
Authentication models for BHMS.
"""
import uuid
from django.db import models
from django.conf import settings


class MFABackupCode(models.Model):
    """
    One-time backup codes for MFA recovery.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mfa_backup_codes"
    )
    code_hash = models.CharField(max_length=128, help_text="SHA-256 hash of the backup code")
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "MFA Backup Code"
        verbose_name_plural = "MFA Backup Codes"

    def __str__(self):
        return f"Backup code for {self.user.username} - {'used' if self.used else 'unused'}"


class MFASetupLog(models.Model):
    """
    Log of MFA setup events for audit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mfa_setup_logs"
    )
    action = models.CharField(
        max_length=20,
        choices=[
            ("enabled", "Enabled"),
            ("disabled", "Disabled"),
            ("regenerated", "Backup Codes Regenerated"),
            ("recovery_used", "Recovery Code Used"),
        ]
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "MFA Setup Log"
        verbose_name_plural = "MFA Setup Logs"

    def __str__(self):
        return f"{self.user.username} - {self.action}"
