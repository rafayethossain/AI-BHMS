"""
Tests for MFA functionality.
"""
import pyotp
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from apps.authentication.models import MFABackupCode

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mfa_tenant(db):
    return Tenant.objects.create(
        name="MFA Test Company", slug="mfa-test",
        schema_name="tenant_mfa", status="active"
    )


@pytest.fixture
def mfa_user(db, mfa_tenant):
    return User.objects.create_user(
        username="mfauser", email="mfa@test.com",
        password="testpass123!@#", first_name="MFA", last_name="User",
        tenant=mfa_tenant, status="active"
    )


@pytest.fixture
def mfa_enabled_user(db, mfa_tenant):
    secret = pyotp.random_base32()
    user = User.objects.create_user(
        username="mfaenabled", email="mfaenabled@test.com",
        password="testpass123!@#", first_name="MFA", last_name="Enabled",
        tenant=mfa_tenant, status="active",
        mfa_enabled=True, mfa_secret=secret
    )
    return user


@pytest.mark.django_db
class TestMFASetup:
    def test_get_setup_uri(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = api_client.get("/api/v1/auth/mfa/setup/")
        assert response.status_code == status.HTTP_200_OK
        assert "secret" in response.data
        assert "provisioning_uri" in response.data
        assert "otpauth://" in response.data["provisioning_uri"]

    def test_setup_already_enabled(self, api_client, mfa_enabled_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfaenabled@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = api_client.get("/api/v1/auth/mfa/setup/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_verify_setup_success(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        code = totp.now()

        response = api_client.post("/api/v1/auth/mfa/verify-setup/", {
            "secret": secret, "code": code
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["message"] == "MFA enabled successfully."
        assert len(response.data["backup_codes"]) == 10

        mfa_user.refresh_from_db()
        assert mfa_user.mfa_enabled is True
        assert mfa_user.mfa_secret == secret

    def test_verify_setup_invalid_code(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = api_client.post("/api/v1/auth/mfa/verify-setup/", {
            "secret": pyotp.random_base32(), "code": "000000"
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_backup_codes_created(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        api_client.post("/api/v1/auth/mfa/verify-setup/", {
            "secret": secret, "code": totp.now()
        })

        assert MFABackupCode.objects.filter(user=mfa_user).count() == 10


@pytest.mark.django_db
class TestMFAStatus:
    def test_status_disabled(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = api_client.get("/api/v1/auth/mfa/status/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["mfa_enabled"] is False

    def test_status_enabled(self, api_client, mfa_enabled_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfaenabled@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = api_client.get("/api/v1/auth/mfa/status/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["mfa_enabled"] is True


@pytest.mark.django_db
class TestMFADisable:
    def test_disable_success(self, api_client, mfa_enabled_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfaenabled@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        totp = pyotp.TOTP(mfa_enabled_user.mfa_secret)
        response = api_client.post("/api/v1/auth/mfa/disable/", {
            "code": totp.now()
        })
        assert response.status_code == status.HTTP_200_OK

        mfa_enabled_user.refresh_from_db()
        assert mfa_enabled_user.mfa_enabled is False

    def test_disable_wrong_code(self, api_client, mfa_enabled_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfaenabled@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = api_client.post("/api/v1/auth/mfa/disable/", {"code": "000000"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_disable_not_enabled(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = api_client.post("/api/v1/auth/mfa/disable/", {"code": "123456"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMFARecoveryCodes:
    def test_backup_codes_in_response(self, api_client, mfa_user):
        login = api_client.post("/api/v1/auth/login/", {
            "email": "mfa@test.com", "password": "testpass123!@#"
        })
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        resp = api_client.post("/api/v1/auth/mfa/verify-setup/", {
            "secret": secret, "code": totp.now()
        })
        codes = resp.data["backup_codes"]
        assert len(codes) == 10
        for code in codes:
            assert len(code) == 8
            assert code.isalnum()
