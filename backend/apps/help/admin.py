from django.contrib import admin
from .models import TourCompletion, OnboardingChecklistItem, ReleaseNote


@admin.register(TourCompletion)
class TourCompletionAdmin(admin.ModelAdmin):
    list_display = ("tour_id", "user", "completed_at")
    list_filter = ("tour_id", "completed_at")
    search_fields = ("tour_id", "user__email")


@admin.register(OnboardingChecklistItem)
class OnboardingChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("user", "item_key", "completed", "completed_at")
    list_filter = ("completed",)
    search_fields = ("user__email", "item_key")


@admin.register(ReleaseNote)
class ReleaseNoteAdmin(admin.ModelAdmin):
    list_display = ("version", "title", "released_at", "is_published")
    list_filter = ("is_published",)
    search_fields = ("version", "title")
