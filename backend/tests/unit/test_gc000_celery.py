"""
Tests for GC-000: Celery Task Infrastructure.
"""
import pytest
from unittest.mock import patch
from apps.core.tasks import debug_task, health_check_task


@pytest.mark.django_db
class TestCeleryTaskInfrastructure:
    def test_debug_task_returns_ok(self):
        result = debug_task.run()
        assert result == {"status": "ok", "task_id": debug_task.request.id}

    def test_health_check_task_returns_healthy(self):
        result = health_check_task.run()
        assert result == {"status": "healthy", "task_id": health_check_task.request.id}

    def test_task_has_base_task_attributes(self):
        assert hasattr(debug_task, "max_retries")
        assert debug_task.max_retries == 3

    def test_celery_app_config(self):
        from config.celery import app
        assert app.main == "bhms"

    def test_base_task_autoretry_config(self):
        from apps.core.tasks import BaseTask
        assert BaseTask.autoretry_for == (Exception,)
        assert BaseTask.max_retries == 3
        assert BaseTask.retry_backoff is True
