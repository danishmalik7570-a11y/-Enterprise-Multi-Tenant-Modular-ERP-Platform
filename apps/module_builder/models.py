"""
Trade-off Documentation:
-----------------------
Approach Picked: JSONField Document Store per DynamicRecord.

1. JSONField Document Store:
   - Pros: Instant module & field creation without database locks, zero migration risk across tenants,
     dynamic schema evolution (add/rename/reorder fields anytime), GIN indexed on PostgreSQL.
   - Cons: Type constraints enforced in application layer rather than strict SQL column constraints.

2. Dynamic DB Tables (Alternative):
   - Pros: Native SQL type safety, relational FK constraints.
   - Cons: Requires running DDL ('CREATE TABLE', 'ALTER TABLE') at runtime in production, causes lock contention,
     breaks schema synchronization, and is highly dangerous in multi-tenant environments.
"""

from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from apps.tenancy.models import TenantAwareModel

class ModuleDefinition(TenantAwareModel):
    """
    Metadata defining a dynamic tenant module (e.g. 'Vehicle Fleet', 'Service Tickets').
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    display_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='layers')
    is_active = models.BooleanField(default=True)

    # Optional finance ledger wiring
    is_financial_module = models.BooleanField(
        default=False,
        help_text="If True, creating records will automatically post balanced financial entries."
    )
    debit_account = models.ForeignKey(
        'finance.Account',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    credit_account = models.ForeignKey(
        'finance.Account',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )
    financial_amount_field = models.CharField(
        max_length=50,
        blank=True,
        help_text="Name of the dynamic field containing transaction amount (e.g. 'total_cost')"
    )

    class Meta:
        unique_together = ('tenant', 'slug')
        ordering = ['display_name']

    def __str__(self):
        return f"{self.display_name} ({self.slug})"


class FieldDefinition(TenantAwareModel):
    """
    Field schema for a custom module.
    """
    TYPE_TEXT = 'text'
    TYPE_NUMBER = 'number'
    TYPE_DATE = 'date'
    TYPE_DROPDOWN = 'dropdown'
    TYPE_RELATION = 'relation'
    TYPE_BOOLEAN = 'boolean'
    TYPE_FILE = 'file'

    FIELD_TYPE_CHOICES = [
        (TYPE_TEXT, 'Text / String'),
        (TYPE_NUMBER, 'Numeric (Decimal / Integer)'),
        (TYPE_DATE, 'Date'),
        (TYPE_DROPDOWN, 'Dropdown Selection'),
        (TYPE_RELATION, 'Relation to Party / Item'),
        (TYPE_BOOLEAN, 'Boolean (Yes/No)'),
        (TYPE_FILE, 'File / Document Attachment'),
    ]

    module = models.ForeignKey(ModuleDefinition, on_delete=models.CASCADE, related_name='fields')
    field_name = models.SlugField(max_length=50)
    label = models.CharField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES, default=TYPE_TEXT)
    is_required = models.BooleanField(default=False)
    default_value = models.CharField(max_length=255, blank=True)
    options = models.JSONField(
        default=list,
        blank=True,
        help_text="Allowed choice options for dropdown field type"
    )
    relation_target = models.CharField(
        max_length=100,
        blank=True,
        help_text="Target model for relation field (e.g. 'parties.Party', 'catalog.Item')"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('tenant', 'module', 'field_name')
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.module.slug}.{self.field_name} ({self.field_type})"


class DynamicRecord(TenantAwareModel):
    """
    Data record for a custom module, stored in JSONField document store.
    """
    module = models.ForeignKey(ModuleDefinition, on_delete=models.CASCADE, related_name='records')
    data = models.JSONField(default=dict)
    journal_entry = models.ForeignKey(
        'finance.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dynamic_records'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        primary_val = list(self.data.values())[0] if self.data else self.id
        return f"[{self.module.slug} #{self.id}] {primary_val}"

    def clean(self):
        super().clean()
        # Validate data against FieldDefinition rules
        fields = {f.field_name: f for f in self.module.fields.all()}
        for field_name, fdef in fields.items():
            val = self.data.get(field_name)
            if fdef.is_required and (val is None or val == ''):
                raise ValidationError({field_name: f"Field '{fdef.label}' is required."})
            if fdef.field_type == FieldDefinition.TYPE_DROPDOWN and val:
                if fdef.options and val not in fdef.options:
                    raise ValidationError({field_name: f"Value '{val}' is not in allowed choices: {fdef.options}"})

    def save(self, *args, **kwargs):
        self.clean()
        with transaction.atomic():
            super().save(*args, **kwargs)
            # Check financial auto-posting
            if self.module.is_financial_module and not self.journal_entry:
                amt_field = self.module.financial_amount_field
                amt_str = self.data.get(amt_field)
                if amt_str and self.module.debit_account and self.module.credit_account:
                    from apps.finance.models import JournalEntry
                    amount = Decimal(str(amt_str))
                    lines_data = [
                        {
                            'account': self.module.debit_account,
                            'party': None,
                            'debit': amount,
                            'credit': Decimal('0.00'),
                            'description': f"{self.module.display_name} Record #{self.id}"
                        },
                        {
                            'account': self.module.credit_account,
                            'party': None,
                            'debit': Decimal('0.00'),
                            'credit': amount,
                            'description': f"{self.module.display_name} Record #{self.id}"
                        }
                    ]
                    entry = JournalEntry.post_entry(
                        tenant=self.tenant,
                        entry_number=f"MOD-{self.module.slug[:6].upper()}-{self.id}",
                        memo=f"Custom Module {self.module.display_name} #{self.id}",
                        lines_data=lines_data,
                        source_module=f"module_builder.{self.module.slug}",
                        source_reference=str(self.id)
                    )
                    self.journal_entry = entry
                    super().save(update_fields=['journal_entry'])
