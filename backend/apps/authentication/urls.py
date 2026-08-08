"""
Authentication URL patterns for BHMS.
"""
from django.urls import path
from .views import (
    CustomTokenObtainPairView, LogoutView, PasswordChangeView,
    PasswordResetRequestView, PasswordResetConfirmView, VerifyTokenView
)
from rest_framework_simplejwt.views import TokenRefreshView
from .mfa_views import (
    MFASetupView, MFAVerifySetupView, MFAStatusView,
    MFARegenerateBackupCodesView, MFADisableView
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token-obtain"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("token/verify/", VerifyTokenView.as_view(), name="token-verify"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # MFA
    path("mfa/setup/", MFASetupView.as_view(), name="mfa-setup"),
    path("mfa/verify-setup/", MFAVerifySetupView.as_view(), name="mfa-verify-setup"),
    path("mfa/status/", MFAStatusView.as_view(), name="mfa-status"),
    path("mfa/regenerate-backup-codes/", MFARegenerateBackupCodesView.as_view(), name="mfa-regenerate-backup"),
    path("mfa/disable/", MFADisableView.as_view(), name="mfa-disable"),
]
