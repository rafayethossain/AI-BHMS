"""
Celery tasks for the commercial app.
"""
from celery import shared_task

from apps.core.tasks import BaseTask

from .models import SalesConfirmation


@shared_task(bind=True, base=BaseTask)
def auto_accept_sales_confirmations(self):
    """Auto-accept sales confirmations whose 48-hour dispute window elapsed."""
    count = SalesConfirmation.auto_accept_overdue()
    return {"auto_accepted": count}
