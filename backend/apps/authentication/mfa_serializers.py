"""
MFA serializers for BHMS.
"""
import pyotp
import hashlib
import secrets
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class MFASetupSerializer(serializers.Serializer):
    """
    Initiate MFA setup - generates secret and provisioning URI.
    """
    def to_representation(self, instance):
        user = self.context["request"].user
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="BHMS"
        )
        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
        }


class MFAVerifySetupSerializer(serializers.Serializer):
    """
    Verify and activate MFA after scanning QR code.
    """
    secret = serializers.CharField(max_length=32)
    code = serializers.CharField(min_length=6, max_length=6)

    def validate(self, data):
        secret = data["secret"]
        code = data["code"]
        totp = pyotp.TOTP(secret)
        if not totp.verify(code, valid_window=1):
            raise serializers.ValidationError(
                {"code": "Invalid verification code. Make sure your authenticator app time is synced."}
            )
        return data


class MFALoginSerializer(serializers.Serializer):
    """
    MFA code for login (when MFA is enabled).
    """
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_code(self, value):
        user = self.context["request"].user
        if not user.mfa_secret:
            raise serializers.ValidationError("MFA is not configured.")
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(value, valid_window=1):
            raise serializers.ValidationError("Invalid MFA code.")
        return value


class MFARecoverySerializer(serializers.Serializer):
    """
    Use a backup code for MFA recovery.
    """
    code = serializers.CharField(min_length=8, max_length=8)

    def validate_code(self, value):
        user = self.context["request"].user
        code_hash = hashlib.sha256(value.encode()).hexdigest()
        backup_code = user.mfa_backup_codes.filter(
            code_hash=code_hash, used=False
        ).first()
        if not backup_code:
            raise serializers.ValidationError("Invalid or used backup code.")
        return value


class MFADisableSerializer(serializers.Serializer):
    """
    Disable MFA - requires current TOTP code.
    """
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_code(self, value):
        user = self.context["request"].user
        if not user.mfa_secret:
            raise serializers.ValidationError("MFA is not enabled.")
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(value, valid_window=1):
            raise serializers.ValidationError("Invalid MFA code.")
        return value


class MFABackupCodesSerializer(serializers.Serializer):
    """
    Response serializer for backup codes.
    """
    codes = serializers.ListField(child=serializers.CharField())


def generate_backup_codes(count=10):
    """
    Generate a list of backup codes and their hashes.
    Returns list of (plain_code, sha256_hash) tuples.
    """
    codes = []
    for _ in range(count):
        plain = secrets.token_hex(4).upper()  # 8 chars
        code_hash = hashlib.sha256(plain.encode()).hexdigest()
        codes.append((plain, code_hash))
    return codes
