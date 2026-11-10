from decimal import Decimal
from celery import shared_task
from django.utils import timezone
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.notifications.models import NotificationRule, NotificationLog

@shared_task
def check_tenant_low_stock(tenant_id):
    """Checks stock levels against active low stock notification rules for a tenant."""
    try:
        tenant = Tenant.objects.get(id=tenant_id, is_active=True)
    except Tenant.DoesNotExist:
        return

    if not tenant.is_module_enabled('inventory'):
        return

    with tenant_context(tenant):
        from apps.inventory.models import StockItem
        rules = NotificationRule.objects.filter(
            trigger_type=NotificationRule.TRIGGER_LOW_STOCK,
            is_active=True
        )
        for rule in rules:
            low_stocks = StockItem.objects.filter(quantity_on_hand__lte=rule.threshold).select_related('item', 'warehouse')
            for stock in low_stocks:
                NotificationLog.objects.create(
                    tenant=tenant,
                    rule=rule,
                    title=f"Low Stock Alert: {stock.item.sku}",
                    message=f"Item {stock.item.name} has only {stock.quantity_on_hand} left at {stock.warehouse.name}.",
                    status=NotificationLog.STATUS_SENT
                )

@shared_task
def check_tenant_payment_due(tenant_id):
    """Checks overdue sales invoices against active payment due notification rules."""
    try:
        tenant = Tenant.objects.get(id=tenant_id, is_active=True)
    except Tenant.DoesNotExist:
        return

    if not tenant.is_module_enabled('sales'):
        return

    with tenant_context(tenant):
        from apps.sales.models import SalesInvoice
        rules = NotificationRule.objects.filter(
            trigger_type=NotificationRule.TRIGGER_PAYMENT_DUE,
            is_active=True
        )
        today = timezone.now().date()
        for rule in rules:
            overdue_invoices = SalesInvoice.objects.filter(
                status=SalesInvoice.STATUS_CONFIRMED,
                due_date__lt=today
            ).select_related('customer')
            for inv in overdue_invoices:
                NotificationLog.objects.create(
                    tenant=tenant,
                    rule=rule,
                    title=f"Payment Overdue: Invoice {inv.invoice_number}",
                    message=f"Invoice {inv.invoice_number} for customer {inv.customer.name} was due on {inv.due_date}.",
                    status=NotificationLog.STATUS_SENT
                )
