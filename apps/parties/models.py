from decimal import Decimal
from django.db import models
from apps.tenancy.models import TenantAwareModel

class Party(TenantAwareModel):
    TYPE_CUSTOMER = 'customer'
    TYPE_SUPPLIER = 'supplier'
    TYPE_EMPLOYEE = 'employee'
    TYPE_BOTH = 'both'
    TYPE_CUSTOM = 'custom'

    TYPE_CHOICES = [
        (TYPE_CUSTOMER, 'Customer'),
        (TYPE_SUPPLIER, 'Supplier'),
        (TYPE_EMPLOYEE, 'Employee'),
        (TYPE_BOTH, 'Customer & Supplier'),
        (TYPE_CUSTOM, 'Custom / Other'),
    ]

    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, blank=True, null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_CUSTOMER)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    billing_address = models.TextField(blank=True)
    shipping_address = models.TextField(blank=True)
    payment_terms_days = models.PositiveIntegerField(default=30)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    # JSONField-backed dynamic attributes per tenant (e.g. industry-specific license numbers, credit ratings, etc.)
    custom_fields = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'code'],
                condition=models.Q(code__isnull=False),
                name='unique_tenant_party_code'
            )
        ]
        indexes = [
            models.Index(fields=['tenant', 'type']),
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    @property
    def current_balance(self) -> Decimal:
        """
        Dynamically calculates party's net ledger balance from posted Journal lines.
        Debit increases receivable, Credit decreases receivable (for customer).
        Credit increases payable, Debit decreases payable (for supplier).
        """
        from apps.finance.models import LedgerLine
        lines = LedgerLine.objects.filter(party=self, entry__is_posted=True)
        total_debit = sum((line.debit for line in lines), Decimal('0.00'))
        total_credit = sum((line.credit for line in lines), Decimal('0.00'))
        return total_debit - total_credit
