"""
Tests for core utilities.
"""
import pytest
from apps.core.utils import (
    generate_unique_code,
    generate_file_number,
    generate_po_number,
    generate_style_number,
    calculate_total_value,
    get_client_ip,
)


class TestUtils:
    def test_generate_unique_code(self, db):
        from apps.setup.models import Season
        code = generate_unique_code(prefix="SS", model=Season, length=6)
        assert code.startswith("SS-")
        assert len(code) == 9  # SS- + 6 chars

    def test_generate_file_number(self):
        code = generate_file_number()
        assert code.startswith("FO-")
        assert len(code) == 11  # FO- + 8 chars

    def test_generate_po_number(self):
        code = generate_po_number()
        assert code.startswith("PO-")
        assert len(code) == 11  # PO- + 8 chars

    def test_generate_style_number(self):
        code = generate_style_number()
        assert code.startswith("STY-")
        assert len(code) == 10  # STY- + 6 chars

    def test_calculate_total_value(self):
        assert calculate_total_value(100, 5.50) == 550.0

    def test_get_client_ip(self):
        class MockRequest:
            META = {"REMOTE_ADDR": "127.0.0.1"}

        ip = get_client_ip(MockRequest())
        assert ip == "127.0.0.1"

    def test_get_client_ip_forwarded(self):
        class MockRequest:
            META = {
                "HTTP_X_FORWARDED_FOR": "10.0.0.1, 192.168.1.1",
                "REMOTE_ADDR": "127.0.0.1",
            }

        ip = get_client_ip(MockRequest())
        assert ip == "10.0.0.1"
