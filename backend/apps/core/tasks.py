"""
Base Celery task patterns for BHMS.
"""
from celery import Task, shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


class BaseTask(Task):
    """Base task with retry, logging, and error handling."""

    autoretry_for = (Exception,)
    max_retries = 3
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed: {exc}", exc_info=True)
        super().on_failure(exc, task_id, args, kwargs, einfo)


@shared_task(bind=True, base=BaseTask)
def debug_task(self):
    """Simple debug task to verify Celery is working."""
    logger.info(f"Request: {self.request!r}")
    return {"status": "ok", "task_id": self.request.id}


@shared_task(bind=True, base=BaseTask)
def health_check_task(self):
    """Health check task that verifies broker connectivity."""
    return {"status": "healthy", "task_id": self.request.id}
