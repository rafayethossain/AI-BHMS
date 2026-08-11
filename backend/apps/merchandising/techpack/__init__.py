"""
Style Tech-Pack processing package (RQ-036 → RQ-042).

Pure, DB-free services for buyer style documents:
- PDF extraction (this package) — ``pdf_parser``
- Excel export/import (RQ-037/038) — ``excel_export`` / ``excel_import``
- Import orchestration (RQ-040) — ``import_service``

Modules stay free of Django model imports so they are unit-testable without a DB.
"""
