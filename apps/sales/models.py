from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.tenancy.models import TenantAwareModel

class SalesInvoice(TenantAwareModel):
    STATUS_DRAFT = 'draft'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_PAID = 'paid'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_CONFIRMED, 'Confirmed & Invoiced'),
        (STATUS_PAID, 'Fully Paid'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    invoice_number = models.CharField(max_length=50, db_index=True)
    customer = models.ForeignKey(
        'parties.Party',
        on_delete=models.CASCADE,
        related_name='sales_invoices',
        limit_choices_to={'type__in': ['customer', 'both', 'custom']}
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    date = models.DateField(default=timezone.now)
    due_date = models.DateField(default=timezone.now)
    warehouse = models.ForeignKey(
        'inventory.Warehouse',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_invoices',
        help_text="Source warehouse for physical goods delivery"
    )
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    journal_entry = models.ForeignKey(
        'finance.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_invoices'
    )

    class Meta:
        unique_together = ('tenant', 'invoice_number')
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name} ({self.status})"

    def recalculate_totals(self):
        subtotal = sum((item.line_total for item in self.items.all()), Decimal('0.00'))
        tax = sum((item.line_tax for item in self.items.all()), Decimal('0.00'))
        self.total_amount = subtotal + tax
        self.tax_amount = tax
        self.save(update_fields=['total_amount', 'tax_amount', 'updated_at'])

    def confirm_and_post(self):
        """
        Confirms sales invoice and posts atomically:
        1. Issues StockMovement for each stock-tracked physical item (skipped for service items)
        2. Auto-posts balancing double-entry journal entry to central Finance ledger (AR vs Revenue)
        """
        if self.status in [self.STATUS_CONFIRMED, self.STATUS_PAID]:
            raise ValidationError("Invoice has already been confirmed and posted.")

        with transaction.atomic():
            tenant = self.tenant
            inventory_enabled = tenant.is_module_enabled('inventory')

            # 1. Inventory Stock Movements (if physical stock tracked)
            from apps.inventory.models import StockMovement
            for line in self.items.select_related('item').all():
                if line.item.is_stock_tracked and inventory_enabled:
                    if not self.warehouse:
                        raise ValidationError("A source warehouse is required to fulfill physical items.")
                    StockMovement.record_movement(
                        tenant=tenant,
                        movement_type=StockMovement.TYPE_ISSUE,
                        item=line.item,
                        warehouse=self.warehouse,
                        quantity=line.quantity,
                        unit_cost=line.item.cost_price,
                        reference=self.invoice_number,
                        notes=f"Sales Issue: {self.invoice_number}"
                    )

            # 2. Finance Ledger Posting
            from apps.finance.models import Account, JournalEntry
            ar_account = Account.objects.filter(tenant=tenant, code='1200').first()
            if not ar_account:
                ar_account = Account.objects.create(
                    tenant=tenant, code='1200', name='Accounts Receivable', type=Account.TYPE_ASSET
                )

            rev_account = Account.objects.filter(tenant=tenant, code='4000').first()
            if not rev_account:
                rev_account = Account.objects.create(
                    tenant=tenant, code='4000', name='Operating Sales & Revenue', type=Account.TYPE_REVENUE
                )

            lines_data = [
                {
                    'account': ar_account,
                    'party': self.customer,
                    'debit': self.total_amount,
                    'credit': Decimal('0.00'),
                    'description': f"Invoice to {self.customer.name}"
                },
                {
                    'account': rev_account,
                    'party': None,
                    'debit': Decimal('0.00'),
                    'credit': self.total_amount,
                    'description': f"Revenue for Invoice {self.invoice_number}"
                }
            ]

            entry = JournalEntry.post_entry(
                tenant=tenant,
                entry_number=f"INV-{self.invoice_number}",
                memo=f"Sales Invoice: {self.customer.name} [{self.invoice_number}]",
                lines_data=lines_data,
                date=self.date,
                source_module='sales',
                source_reference=self.invoice_number
            )

            self.status = self.STATUS_CONFIRMED
            self.journal_entry = entry
            self.save(update_fields=['status', 'journal_entry', 'updated_at'])
            return self


class SalesInvoiceItem(TenantAwareModel):
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey('catalog.Item', on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=15, decimal_places=4)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        ordering = ['id']

    @property
    def line_tax(self) -> Decimal:
        return (self.line_total * (self.tax_rate / Decimal('100.00'))).quantize(Decimal('0.01'))

    def save(self, *args, **kwargs):
        gross = self.quantity * self.unit_price
        discount = gross * (self.discount_percent / Decimal('100.00'))
        self.line_total = (gross - discount).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


class InvoiceTemplate(TenantAwareModel):
    """
    Tenant-configurable invoice format/layout definition.
    Drives both frontend live preview and backend ReportLab PDF generation.
    """
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    config = models.JSONField(
        default=dict,
        help_text="Layout sections: header, party, line_items, totals, footer, styling"
    )

    class Meta:
        unique_together = ('tenant', 'name')
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

    def save(self, *args, **kwargs):
        if self.is_default:
            # Ensure only one default template per tenant
            InvoiceTemplate.objects.filter(tenant=self.tenant, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

