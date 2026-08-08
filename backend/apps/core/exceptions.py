"""
Custom exception handlers for BHMS.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        error_data = {
            "success": False,
            "error": {
                "status_code": response.status_code,
                "message": _get_error_message(response),
                "details": response.data if isinstance(response.data, dict) else {"detail": response.data},
            }
        }
        response.data = error_data
    else:
        # Handle unexpected errors
        error_data = {
            "success": False,
            "error": {
                "status_code": 500,
                "message": "Internal server error",
                "details": str(exc),
            }
        }
        response = Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


def _get_error_message(response):
    """
    Get human-readable error message.
    """
    status_messages = {
        400: "Bad request",
        401: "Authentication required",
        403: "Permission denied",
        404: "Not found",
        405: "Method not allowed",
        409: "Conflict",
        429: "Too many requests",
        500: "Internal server error",
    }
    return status_messages.get(response.status_code, "Error")
