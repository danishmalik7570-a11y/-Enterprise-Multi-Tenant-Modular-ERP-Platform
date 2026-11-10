from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from apps.tenancy.models import TenantAwareModel

class Warehouse(TenantAwareModel):
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=150)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'code')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.code}]"


class StockItem(TenantAwareModel):
    """Current stock level for an item at a specific warehouse."""
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_levels')
    item = models.ForeignKey('catalog.Item', on_delete=models.CASCADE, related_name='stock_levels')
    quantity_on_hand = models.DecimalField(max_digits=15, decimal_places=4, default=Decimal('0.0000'))
    quantity_reserved = models.DecimalField(max_digits=15, decimal_places=4, default=Decimal('0.0000'))

    class Meta:
        unique_together = ('tenant', 'warehouse', 'item')
        indexes = [
            models.Index(fields=['tenant', 'warehouse', 'item']),
        ]

    def __str__(self):
        return f"{self.item.sku} @ {self.warehouse.code}: {self.quantity_on_hand}"

    @property
    def available_quantity(self) -> Decimal:
        return self.quantity_on_hand - self.quantity_reserved


class Batch(TenantAwareModel):
    """Optional Lot/Batch tracking for perishable goods, containers, or serials."""
    item = models.ForeignKey('catalog.Item', on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('tenant', 'item', 'batch_number')

    def __str__(self):
        return f"{self.item.sku} - Batch {self.batch_number}"


class StockMovement(TenantAwareModel):
    """
    Immutable ledger of physical inventory movements.
    Enforces atomic balance updates on StockItem.
    """
    TYPE_RECEIPT = 'receipt'
    TYPE_ISSUE = 'issue'
    TYPE_TRANSFER = 'transfer'
    TYPE_ADJUSTMENT = 'adjustment'
    TYPE_RETURN = 'return'
    TYPE_CUSTOM = 'custom'

    MOVEMENT_CHOICES = [
        (TYPE_RECEIPT, 'Goods Receipt (IN)'),
        (TYPE_ISSUE, 'Goods Issue (OUT)'),
        (TYPE_TRANSFER, 'Inter-Warehouse Transfer'),
        (TYPE_ADJUSTMENT, 'Inventory Adjustment (+/-)'),
        (TYPE_RETURN, 'Return'),
        (TYPE_CUSTOM, 'Custom Tenant Reason'),
    ]

    movement_type = models.CharField(max_length=20, choices=MOVEMENT_CHOICES)
    custom_reason_code = models.CharField(max_length=50, blank=True, help_text="Tenant-defined custom reason code")
    item = models.ForeignKey('catalog.Item', on_delete=models.CASCADE, related_name='stock_movements')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='movements_from')
    destination_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movements_to',
        help_text="Required for transfer movements"
    )
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.DecimalField(max_digits=15, decimal_places=4)
    unit_cost = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    reference = models.CharField(max_length=100, blank=True, help_text="Document reference (e.g. PO# or INV#)")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.movement_type}] {self.quantity} x {self.item.sku} @ {self.warehouse.code}"

    @classmethod
    def record_movement(cls, tenant, movement_type, item, warehouse, quantity,
                        unit_cost=Decimal('0.00'), reference='', destination_warehouse=None,
                        batch=None, custom_reason_code='', notes=''):
        """
        Atomic execution of a stock movement updating StockItem on-hand balances.
        """
        if not item.is_stock_tracked:
            # Skip physical stock tracking for services or non-tracked items
            return None

        with transaction.atomic():
            movement = cls.objects.create(
                tenant=tenant,
                movement_type=movement_type,
                item=item,
                warehouse=warehouse,
                destination_warehouse=destination_warehouse,
                batch=batch,
                quantity=quantity,
                unit_cost=unit_cost,
                reference=reference,
                custom_reason_code=custom_reason_code,
                notes=notes
            )

            # Update source warehouse stock
            stock_source, _ = StockItem.objects.select_for_update().get_or_create(
                tenant=tenant,
                warehouse=warehouse,
                item=item,
                defaults={'quantity_on_hand': Decimal('0.0000')}
            )

            if movement_type in [cls.TYPE_RECEIPT, cls.TYPE_RETURN]:
                stock_source.quantity_on_hand += quantity
            elif movement_type == cls.TYPE_ISSUE:
                stock_source.quantity_on_hand -= quantity
            elif movement_type == cls.TYPE_ADJUSTMENT:
                # Can be positive or negative
                stock_source.quantity_on_hand += quantity
            elif movement_type == cls.TYPE_TRANSFER:
                if not destination_warehouse:
                    raise ValidationError("Destination warehouse is required for transfer.")
                stock_source.quantity_on_hand -= quantity
                stock_dest, _ = StockItem.objects.select_for_update().get_or_create(
                    tenant=tenant,
                    warehouse=destination_warehouse,
                    item=item,
                    defaults={'quantity_on_hand': Decimal('0.0000')}
                )
                stock_dest.quantity_on_hand += quantity
                stock_dest.save(update_fields=['quantity_on_hand', 'updated_at'])

            stock_source.save(update_fields=['quantity_on_hand', 'updated_at'])
            return movement
