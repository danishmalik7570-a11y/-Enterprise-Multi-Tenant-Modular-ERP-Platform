from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.tenancy.models import TenantAwareModel

class PurchaseOrder(TenantAwareModel):
    STATUS_DRAFT = 'draft'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_RECEIVED = 'received'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_RECEIVED, 'Received & Billed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    order_number = models.CharField(max_length=50, db_index=True)
    supplier = models.ForeignKey(
        'parties.Party',
        on_delete=models.CASCADE,
        related_name='purchase_orders',
        limit_choices_to={'type__in': ['supplier', 'both', 'custom']}
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    order_date = models.DateField(default=timezone.now)
    warehouse = models.ForeignKey(
        'inventory.Warehouse',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_orders',
        help_text="Target warehouse for physical goods receipt"
    )
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    journal_entry = models.ForeignKey(
        'finance.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_orders'
    )

    class Meta:
        unique_together = ('tenant', 'order_number')
        ordering = ['-order_date', '-id']

    def __str__(self):
        return f"{self.order_number} - {self.supplier.name} ({self.status})"

    def recalculate_totals(self):
        subtotal = sum((item.line_total for item in self.items.all()), Decimal('0.00'))
        tax = sum((item.line_tax for item in self.items.all()), Decimal('0.00'))
        self.total_amount = subtotal + tax
        self.tax_amount = tax
        self.save(update_fields=['total_amount', 'tax_amount', 'updated_at'])

    def receive_and_post(self):
        """
        Executes generic receipt flow inside an atomic database transaction:
        1. Posts StockMovement for each stock-tracked item (if inventory module enabled)
        2. Auto-posts balancing double-entry journal entry to central Finance ledger
        """
        if self.status == self.STATUS_RECEIVED:
            raise ValidationError("This purchase order has already been received.")

        with transaction.atomic():
            tenant = self.tenant
            inventory_enabled = tenant.is_module_enabled('inventory')

            # 1. Inventory Movements
            from apps.inventory.models import StockMovement
            for line in self.items.select_related('item').all():
                if line.item.is_stock_tracked and inventory_enabled:
                    if not self.warehouse:
                        raise ValidationError("A destination warehouse is required to receive inventory goods.")
                    StockMovement.record_movement(
                        tenant=tenant,
                        movement_type=StockMovement.TYPE_RECEIPT,
                        item=line.item,
                        warehouse=self.warehouse,
                        quantity=line.quantity,
                        unit_cost=line.unit_price,
                        reference=self.order_number,
                        notes=f"PO Receipt: {self.order_number}"
                    )

            # 2. Finance Double-Entry Ledger Posting
            from apps.finance.models import Account, JournalEntry
            ap_account = Account.objects.filter(tenant=tenant, code='2000').first()
            if not ap_account:
                ap_account = Account.objects.create(
                    tenant=tenant, code='2000', name='Accounts Payable', type=Account.TYPE_LIABILITY
                )

            inv_asset_account = Account.objects.filter(tenant=tenant, code='1300').first()
            if not inv_asset_account:
                inv_asset_account = Account.objects.create(
                    tenant=tenant, code='1300', name='Inventory Asset', type=Account.TYPE_ASSET
                )

            expense_account = Account.objects.filter(tenant=tenant, code='6000').first()
            if not expense_account:
                expense_account = Account.objects.create(
                    tenant=tenant, code='6000', name='General Operating Expense', type=Account.TYPE_EXPENSE
                )

            debit_account = inv_asset_account if (inventory_enabled and any(i.item.is_stock_tracked for i in self.items.all())) else expense_account

            lines_data = [
                {
                    'account': debit_account,
                    'party': None,
                    'debit': self.total_amount,
                    'credit': Decimal('0.00'),
                    'description': f"PO Receipt from {self.supplier.name}"
                },
                {
                    'account': ap_account,
                    'party': self.supplier,
                    'debit': Decimal('0.00'),
                    'credit': self.total_amount,
                    'description': f"Payable for PO {self.order_number}"
                }
            ]

            entry = JournalEntry.post_entry(
                tenant=tenant,
                entry_number=f"BILL-{self.order_number}",
                memo=f"Vendor Bill: {self.supplier.name} [{self.order_number}]",
                lines_data=lines_data,
                date=self.order_date,
                source_module='purchasing',
                source_reference=self.order_number
            )

            self.status = self.STATUS_RECEIVED
            self.journal_entry = entry
            self.save(update_fields=['status', 'journal_entry', 'updated_at'])
            return self


class PurchaseOrderItem(TenantAwareModel):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey('catalog.Item', on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=15, decimal_places=4)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        ordering = ['id']

    @property
    def line_tax(self) -> Decimal:
        return (self.line_total * (self.tax_rate / Decimal('100.00'))).quantize(Decimal('0.01'))

    def save(self, *args, **kwargs):
        self.line_total = (self.quantity * self.unit_price).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)
