"""
Authentication views for BHMS.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    CustomTokenObtainPairSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from apps.core.utils import get_client_ip

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view with additional user data.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Log successful login
            user = User.objects.get(email=request.data.get("email"))
            user.last_login_ip = get_client_ip(request)
            user.save(update_fields=["last_login_ip"])
        return response


class LogoutView(APIView):
    """
    Logout view to blacklist refresh token.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    """
    Password change view.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        
        return Response({"message": "Password changed successfully"}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    Password reset request view.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data["email"]
        user = User.objects.filter(email=email).first()
        
        if user:
            # TODO: Send password reset email
            pass
        
        # Always return success to prevent email enumeration
        return Response(
            {"message": "If the email exists, a reset link has been sent"},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(APIView):
    """
    Password reset confirm view.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # TODO: Validate token and reset password
        
        return Response(
            {"message": "Password has been reset successfully"},
            status=status.HTTP_200_OK
        )


class VerifyTokenView(APIView):
    """
    Verify token validity.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "valid": True,
            "user": {
                "id": str(request.user.id),
                "username": request.user.username,
                "email": request.user.email,
            }
        })
