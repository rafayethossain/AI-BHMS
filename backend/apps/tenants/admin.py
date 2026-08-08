"""
Tenant admin configuration.
"""
from django.contrib import admin
from .models import Tenant, Office


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "status", "plan", "created_at"]
    list_filter = ["status", "plan"]
    search_fields = ["name", "slug"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Office)
class OfficeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "office_type", "city", "status"]
    list_filter = ["office_type", "status"]
    search_fields = ["code", "name"]
    readonly_fields = ["created_at", "updated_at"]
