"""
User views for BHMS.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import User, Role, UserRole, Permission, AuditLog
from .serializers import (
    UserSerializer, UserCreateSerializer, RoleSerializer,
    PermissionSerializer, UserRoleSerializer, AuditLogSerializer
)
from apps.core.pagination import StandardResultsSetPagination


class UserViewSet(viewsets.ModelViewSet):
    """
    User viewset.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["username", "email", "first_name", "last_name"]
    filterset_fields = ["status", "department"]
    
    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        return User.objects.filter(tenant=self.request.tenant)
    
    @action(detail=False, methods=["get"])
    def me(self, request):
        """
        Get current user profile.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=["put", "patch"])
    def update_profile(self, request):
        """
        Update current user profile.
        """
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        new_password_confirm = request.data.get("new_password_confirm")

        if not all([old_password, new_password, new_password_confirm]):
            return Response(
                {"error": "All fields are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != new_password_confirm:
            return Response(
                {"error": "New passwords do not match"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        if not user.check_password(old_password):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check password history (last 5)
        from .models import PasswordHistory
        recent_hashes = PasswordHistory.objects.filter(
            user=user
        ).values_list("password_hash", flat=True)[:5]
        
        from django.contrib.auth.hashers import make_password, check_password
        for old_hash in recent_hashes:
            if check_password(new_password, old_hash):
                return Response(
                    {"error": "Cannot reuse last 5 passwords"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        # Save to history
        PasswordHistory.objects.create(
            user=user,
            password_hash=make_password(new_password),
        )

        return Response({"message": "Password changed successfully"})

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def password_reset_request(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
            import secrets
            token = secrets.token_urlsafe(32)
            from django.core.cache import cache
            cache.set(f"password_reset_{token}", user.id, timeout=3600)

            return Response({
                "message": "If the email exists, a reset link has been sent",
                "debug_token": token  # Remove in production
            })
        except User.DoesNotExist:
            return Response({
                "message": "If the email exists, a reset link has been sent"
            })

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def password_reset_confirm(self, request):
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        new_password_confirm = request.data.get("new_password_confirm")

        if not all([token, new_password, new_password_confirm]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != new_password_confirm:
            return Response({"error": "Passwords do not match"}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.cache import cache
        user_id = cache.get(f"password_reset_{token}")
        if not user_id:
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        cache.delete(f"password_reset_{token}")

        return Response({"message": "Password reset successful"})


class RoleViewSet(viewsets.ModelViewSet):
    """
    Role viewset.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["name", "description"]
    filterset_fields = ["is_system", "is_active"]
    ordering = ["-created_at"]
    
    def get_queryset(self):
        return Role.objects.filter(tenant=self.request.tenant)


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Permission viewset (read-only).
    """
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["module", "action"]
    ordering = ["module", "action"]


class UserRoleViewSet(viewsets.ModelViewSet):
    """
    User-Role assignment viewset.
    """
    queryset = UserRole.objects.select_related("user", "role").all()
    serializer_class = UserRoleSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["user__username", "role__name"]
    filterset_fields = ["user", "role"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return UserRole.objects.select_related("user", "role").filter(
            user__tenant=self.request.tenant
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Audit log viewset (read-only).
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["user__username", "entity_type"]
    filterset_fields = ["action", "entity_type"]
    
    def get_queryset(self):
        return AuditLog.objects.filter(tenant=self.request.tenant)