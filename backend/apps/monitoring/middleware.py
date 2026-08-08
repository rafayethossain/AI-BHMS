"""
Audit logging middleware for BHMS.
"""
import json
from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog


AUDIT_ENABLED_PATHS = ["/api/v1/"]
AUDIT_METHODS = ["POST", "PUT", "PATCH", "DELETE"]


class AuditLogMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request._audit_method = request.method
        request._audit_path = request.path
        if request.method in AUDIT_METHODS:
            try:
                request._audit_body = json.loads(request.body) if request.body else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                request._audit_body = {}
        else:
            request._audit_body = {}

    def process_response(self, request, response):
        method = getattr(request, "_audit_method", None)
        path = getattr(request, "_audit_path", "")

        if not any(path.startswith(p) for p in AUDIT_ENABLED_PATHS):
            return response
        if method not in AUDIT_METHODS:
            return response
        if not hasattr(request, "user") or request.user.is_anonymous:
            return response
        if not hasattr(request, "tenant"):
            return response

        status_code = response.status_code
        success = 200 <= status_code < 400

        if success and method in ("POST", "PUT", "PATCH"):
            action_map = {"POST": "create", "PUT": "update", "PATCH": "update"}
            if method == "DELETE":
                action_str = "delete"
            else:
                action_str = action_map.get(method, "update")

            try:
                resp_data = json.loads(response.content) if response.content else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                resp_data = {}

            entity_type = path.strip("/").split("/")[-1]
            entity_id = resp_data.get("id", "")
            if not entity_id and method == "POST":
                entity_id = resp_data.get("id", "")

            try:
                AuditLog.objects.create(
                    tenant=request.tenant,
                    entity_type=entity_type,
                    entity_id=str(entity_id),
                    entity_name=entity_type,
                    action=action_str,
                    description=f"{method} {path} -> {status_code}",
                    user=request.user,
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get("HTTP_USER_AGENT", ""),
                    old_value=None,
                    new_value=request._audit_body if request._audit_body else None,
                )
            except Exception:
                pass
        elif success and method == "DELETE":
            try:
                AuditLog.objects.create(
                    tenant=request.tenant,
                    entity_type=path.strip("/").split("/")[-1],
                    entity_id="",
                    entity_name=path,
                    action="delete",
                    description=f"DELETE {path} -> {status_code}",
                    user=request.user,
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get("HTTP_USER_AGENT", ""),
                )
            except Exception:
                pass

        return response

    def _get_client_ip(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
