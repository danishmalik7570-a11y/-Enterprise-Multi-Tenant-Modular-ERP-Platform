from decimal import Decimal
from django.db import models
from apps.tenancy.models import TenantAwareModel

class Category(TenantAwareModel):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Categories'
        unique_together = ('tenant', 'slug')
        ordering = ['name']

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name


class Item(TenantAwareModel):
    TYPE_GOODS = 'goods'
    TYPE_SERVICE = 'service'

    TYPE_CHOICES = [
        (TYPE_GOODS, 'Physical Product / Goods'),
        (TYPE_SERVICE, 'Service / Non-physical Item'),
    ]

    sku = models.CharField(max_length=100, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_GOODS)
    
    # Toggle inventory tracking: False for service businesses or pure retainers
    is_stock_tracked = models.BooleanField(
        default=True,
        help_text="If False, inventory stock movements are skipped for this item."
    )
    
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items'
    )
    unit_of_measure = models.CharField(max_length=50, default='pcs')
    
    # Financial pricing using Python Decimal
    selling_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    cost_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    # JSONField for tenant-defined dynamic attributes (e.g. wattage, size, billing hourly rate)
    custom_attributes = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'sku')
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'sku']),
            models.Index(fields=['tenant', 'type']),
            models.Index(fields=['tenant', 'is_stock_tracked']),
        ]

    def __str__(self):
        return f"{self.name} [{self.sku}]"

    @property
    def total_stock(self) -> Decimal:
        """Returns aggregate stock quantity on hand across all warehouses if inventory module enabled."""
        if not self.is_stock_tracked:
            return Decimal('0.00')
        from apps.inventory.models import StockItem
        stocks = StockItem.objects.filter(item=self)
        return sum((s.quantity_on_hand for s in stocks), Decimal('0.00'))
