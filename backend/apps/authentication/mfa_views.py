"""
MFA views for BHMS.
"""
import hashlib
import pyotp
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .mfa_serializers import (
    MFAVerifySetupSerializer, MFALoginSerializer,
    MFARecoverySerializer, MFADisableSerializer,
    generate_backup_codes
)
from .models import MFABackupCode, MFASetupLog
from apps.core.utils import get_client_ip


class MFASetupView(APIView):
    """
    Step 1: Generate TOTP secret and provisioning URI for QR code.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.mfa_enabled:
            return Response(
                {"error": "MFA is already enabled. Disable it first to re-setup."},
                status=status.HTTP_400_BAD_REQUEST
            )
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=request.user.email,
            issuer_name="BHMS"
        )
        return Response({
            "secret": secret,
            "provisioning_uri": provisioning_uri,
        })


class MFAVerifySetupView(APIView):
    """
    Step 2: Verify code and enable MFA. Returns backup codes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.mfa_enabled:
            return Response(
                {"error": "MFA is already enabled."},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = MFAVerifySetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.mfa_secret = serializer.validated_data["secret"]
        user.mfa_enabled = True
        user.save(update_fields=["mfa_secret", "mfa_enabled"])

        # Generate backup codes
        plain_codes, hashes = zip(*generate_backup_codes(10))
        MFABackupCode.objects.bulk_create([
            MFABackupCode(user=user, code_hash=h) for h in hashes
        ])

        # Audit log
        MFASetupLog.objects.create(
            user=user, action="enabled",
            ip_address=get_client_ip(request)
        )

        return Response({
            "message": "MFA enabled successfully.",
            "backup_codes": list(plain_codes),
        }, status=status.HTTP_201_CREATED)


class MFAStatusView(APIView):
    """
    Check MFA status for the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        remaining_codes = user.mfa_backup_codes.filter(used=False).count()
        return Response({
            "mfa_enabled": user.mfa_enabled,
            "backup_codes_remaining": remaining_codes,
        })


class MFARegenerateBackupCodesView(APIView):
    """
    Regenerate backup codes (requires MFA code).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFALoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        # Invalidate old codes
        request.user.mfa_backup_codes.filter(used=False).update(used=True)

        # Generate new codes
        plain_codes, hashes = zip(*generate_backup_codes(10))
        MFABackupCode.objects.bulk_create([
            MFABackupCode(user=request.user, code_hash=h) for h in hashes
        ])

        MFASetupLog.objects.create(
            user=request.user, action="regenerated",
            ip_address=get_client_ip(request)
        )

        return Response({
            "message": "Backup codes regenerated.",
            "backup_codes": list(plain_codes),
        })


class MFADisableView(APIView):
    """
    Disable MFA (requires TOTP code confirmation).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.mfa_enabled:
            return Response(
                {"error": "MFA is not enabled."},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = MFADisableSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.mfa_enabled = False
        user.mfa_secret = ""
        user.save(update_fields=["mfa_enabled", "mfa_secret"])

        user.mfa_backup_codes.all().delete()

        MFASetupLog.objects.create(
            user=user, action="disabled",
            ip_address=get_client_ip(request)
        )

        return Response({"message": "MFA disabled successfully."})
