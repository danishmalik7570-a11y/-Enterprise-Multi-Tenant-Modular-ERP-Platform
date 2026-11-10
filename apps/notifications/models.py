from decimal import Decimal
from django.db import models
from apps.tenancy.models import TenantAwareModel

class NotificationRule(TenantAwareModel):
    TRIGGER_LOW_STOCK = 'low_stock'
    TRIGGER_PAYMENT_DUE = 'payment_due'
    TRIGGER_CUSTOM = 'custom'

    TRIGGER_CHOICES = [
        (TRIGGER_LOW_STOCK, 'Low Stock Alert'),
        (TRIGGER_PAYMENT_DUE, 'Payment Due Reminder'),
        (TRIGGER_CUSTOM, 'Custom Tenant Trigger'),
    ]

    name = models.CharField(max_length=150)
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_CHOICES)
    threshold = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('10.00'),
        help_text="Threshold units for low stock or days before/after due date for payments"
    )
    email_recipient = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.get_trigger_type_display()}]"


class NotificationLog(TenantAwareModel):
    STATUS_QUEUED = 'queued'
    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'

    rule = models.ForeignKey(NotificationRule, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, default=STATUS_SENT)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"
