"""
Custom pagination classes for BHMS.
"""
from rest_framework.pagination import PageNumberPagination, CursorPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination with page number.
    """
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CursorResultsSetPagination(CursorPagination):
    """
    Cursor-based pagination for better performance.
    """
    page_size = 20
    ordering = "-created_at"


class SmallResultsSetPagination(PageNumberPagination):
    """
    Small pagination for dropdowns.
    """
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50
