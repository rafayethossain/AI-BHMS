"""
Tests for authentication.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_tenant(db):
    return Tenant.objects.create(
        name="Auth Test Company",
        slug="auth-test",
        schema_name="tenant_auth",
        status="active"
    )


@pytest.fixture
def auth_user(db, auth_tenant):
    return User.objects.create_user(
        username="authtest",
        email="auth@test.com",
        password="testpass123!@#",
        first_name="Auth",
        last_name="User",
        tenant=auth_tenant,
        status="active"
    )


@pytest.mark.django_db
class TestLogin:
    def test_login_success(self, api_client, auth_user):
        response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "testpass123!@#"
        })
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data

    def test_login_user_data(self, api_client, auth_user):
        response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "testpass123!@#"
        })
        assert response.status_code == status.HTTP_200_OK
        user_data = response.data["user"]
        assert user_data["username"] == "authtest"
        assert user_data["email"] == "auth@test.com"

    def test_login_invalid_credentials(self, api_client, auth_user):
        response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client, auth_user):
        response = api_client.post("/api/v1/auth/login/", {
            "email": "nonexistent@test.com",
            "password": "testpass123!@#"
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenVerify:
    def test_verify_valid_token(self, api_client, auth_user):
        # Get tokens
        login_response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "testpass123!@#"
        })
        access_token = login_response.data["access"]

        # Verify token
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.get("/api/v1/auth/token/verify/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["valid"] is True

    def test_verify_no_token(self, api_client):
        response = api_client.get("/api/v1/auth/token/verify/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPasswordChange:
    def test_password_change_success(self, api_client, auth_user):
        login_response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "testpass123!@#"
        })
        access_token = login_response.data["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.post("/api/v1/auth/password/change/", {
            "old_password": "testpass123!@#",
            "new_password": "newpassword123!@#",
            "new_password_confirm": "newpassword123!@#"
        })
        assert response.status_code == status.HTTP_200_OK

    def test_password_change_wrong_old(self, api_client, auth_user):
        login_response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "testpass123!@#"
        })
        access_token = login_response.data["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.post("/api/v1/auth/password/change/", {
            "old_password": "wrongpassword",
            "new_password": "newpassword123!@#",
            "new_password_confirm": "newpassword123!@#"
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_change_mismatch(self, api_client, auth_user):
        login_response = api_client.post("/api/v1/auth/login/", {
            "email": "auth@test.com",
            "password": "testpass123!@#"
        })
        access_token = login_response.data["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = api_client.post("/api/v1/auth/password/change/", {
            "old_password": "testpass123!@#",
            "new_password": "newpassword123!@#",
            "new_password_confirm": "differentpassword123!@#"
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPasswordReset:
    def test_password_reset_request(self, api_client, auth_user):
        response = api_client.post("/api/v1/auth/password/reset/", {
            "email": "auth@test.com"
        })
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_nonexistent_email(self, api_client, auth_user):
        # Should still return 200 to prevent email enumeration
        response = api_client.post("/api/v1/auth/password/reset/", {
            "email": "nonexistent@test.com"
        })
        assert response.status_code == status.HTTP_200_OK
