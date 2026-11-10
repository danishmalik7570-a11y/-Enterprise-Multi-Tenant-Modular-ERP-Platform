from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.tenancy.models import TenantAwareModel

class Account(TenantAwareModel):
    """
    Tenant-configurable Chart of Accounts (COA).
    Supports assets, liabilities, equity, revenue, and expenses.
    """
    TYPE_ASSET = 'asset'
    TYPE_LIABILITY = 'liability'
    TYPE_EQUITY = 'equity'
    TYPE_REVENUE = 'revenue'
    TYPE_EXPENSE = 'expense'

    ACCOUNT_TYPE_CHOICES = [
        (TYPE_ASSET, 'Asset'),
        (TYPE_LIABILITY, 'Liability'),
        (TYPE_EQUITY, 'Equity'),
        (TYPE_REVENUE, 'Revenue'),
        (TYPE_EXPENSE, 'Expense'),
    ]

    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sub_accounts'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_type_display()})"

    @property
    def balance(self) -> Decimal:
        """
        Computes current balance based on account normal balance rules:
        - Assets & Expenses: normal balance is Debit (Debit - Credit)
        - Liabilities, Equity & Revenue: normal balance is Credit (Credit - Debit)
        """
        lines = self.ledger_lines.filter(entry__is_posted=True)
        total_debit = sum((line.debit for line in lines), Decimal('0.00'))
        total_credit = sum((line.credit for line in lines), Decimal('0.00'))

        if self.type in [self.TYPE_ASSET, self.TYPE_EXPENSE]:
            return total_debit - total_credit
        else:
            return total_credit - total_debit


class JournalEntry(TenantAwareModel):
    """
    Central double-entry journal entry.
    All modules (purchasing, sales, payments, custom modules) post here.
    """
    entry_number = models.CharField(max_length=50, db_index=True)
    date = models.DateField(default=timezone.now)
    memo = models.CharField(max_length=255)
    source_module = models.CharField(max_length=50, default='manual')  # sales, purchasing, payment, manual
    source_reference = models.CharField(max_length=100, blank=True)
    is_posted = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'entry_number')
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.entry_number} ({self.date}): {self.memo}"

    def clean(self):
        super().clean()
        if self.pk:
            lines = list(self.lines.all())
            if lines:
                total_debits = sum((line.debit for line in lines), Decimal('0.00'))
                total_credits = sum((line.credit for line in lines), Decimal('0.00'))
                if total_debits != total_credits:
                    raise ValidationError(
                        f"Double-entry invariant violated: Total Debits ({total_debits}) must equal Total Credits ({total_credits})."
                    )

    @classmethod
    def post_entry(cls, tenant, entry_number, memo, lines_data, date=None, source_module='manual', source_reference=''):
        """
        Atomic method to create and post a balanced double-entry transaction.
        lines_data: list of dicts:
          [{'account': Account, 'party': Party(optional), 'debit': Decimal, 'credit': Decimal, 'description': str}]
        """
        if not date:
            date = timezone.now().date()

        total_debits = sum((item.get('debit', Decimal('0.00')) for item in lines_data), Decimal('0.00'))
        total_credits = sum((item.get('credit', Decimal('0.00')) for item in lines_data), Decimal('0.00'))

        if total_debits != total_credits:
            raise ValidationError(
                f"Double-entry invariant violated: Total Debits ({total_debits}) != Total Credits ({total_credits})."
            )

        with transaction.atomic():
            entry = cls.objects.create(
                tenant=tenant,
                entry_number=entry_number,
                date=date,
                memo=memo,
                source_module=source_module,
                source_reference=source_reference,
                is_posted=True
            )

            for line in lines_data:
                LedgerLine.objects.create(
                    tenant=tenant,
                    entry=entry,
                    account=line['account'],
                    party=line.get('party'),
                    debit=line.get('debit', Decimal('0.00')),
                    credit=line.get('credit', Decimal('0.00')),
                    description=line.get('description', memo)
                )

            return entry


class LedgerLine(TenantAwareModel):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='ledger_lines')
    party = models.ForeignKey('parties.Party', on_delete=models.SET_NULL, null=True, blank=True, related_name='ledger_lines')
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.account.code} | Dr: {self.debit} Cr: {self.credit}"


class Payment(TenantAwareModel):
    """Payment received from a customer or paid to a supplier."""
    TYPE_INBOUND = 'inbound'    # Customer payment received
    TYPE_OUTBOUND = 'outbound'  # Supplier payment made

    TYPE_CHOICES = [
        (TYPE_INBOUND, 'Inbound (Customer Payment)'),
        (TYPE_OUTBOUND, 'Outbound (Supplier Payment)'),
    ]

    METHOD_BANK = 'bank'
    METHOD_CASH = 'cash'
    METHOD_CARD = 'card'
    METHOD_CHECK = 'check'
    METHOD_OTHER = 'other'

    METHOD_CHOICES = [
        (METHOD_BANK, 'Bank Transfer'),
        (METHOD_CASH, 'Cash'),
        (METHOD_CARD, 'Credit/Debit Card'),
        (METHOD_CHECK, 'Check'),
        (METHOD_OTHER, 'Other'),
    ]

    payment_number = models.CharField(max_length=50)
    party = models.ForeignKey('parties.Party', on_delete=models.CASCADE, related_name='payments')
    payment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default=METHOD_BANK)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField(default=timezone.now)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('tenant', 'payment_number')
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.payment_number} - {self.get_payment_type_display()}: {self.amount} ({self.party.name})"

    @classmethod
    def record_payment(cls, tenant, payment_number, party, payment_type, amount,
                       payment_method=METHOD_BANK, date=None, reference='', notes=''):
        """
        Atomically records payment and generates balancing double-entry journal lines:
        - Inbound (Customer payment):
          Debit: Cash & Bank Account
          Credit: Accounts Receivable (linked to customer Party)
        - Outbound (Supplier payment):
          Debit: Accounts Payable (linked to supplier Party)
          Credit: Cash & Bank Account
        """
        if not date:
            date = timezone.now().date()

        with transaction.atomic():
            # Retrieve or default tenant accounts
            cash_account = Account.objects.filter(tenant=tenant, code='1000').first()
            if not cash_account:
                cash_account = Account.objects.create(
                    tenant=tenant, code='1000', name='Cash & Bank', type=Account.TYPE_ASSET
                )

            ar_account = Account.objects.filter(tenant=tenant, code='1200').first()
            if not ar_account:
                ar_account = Account.objects.create(
                    tenant=tenant, code='1200', name='Accounts Receivable', type=Account.TYPE_ASSET
                )

            ap_account = Account.objects.filter(tenant=tenant, code='2000').first()
            if not ap_account:
                ap_account = Account.objects.create(
                    tenant=tenant, code='2000', name='Accounts Payable', type=Account.TYPE_LIABILITY
                )

            lines = []
            if payment_type == cls.TYPE_INBOUND:
                # Money in: Debit Cash, Credit AR
                lines = [
                    {'account': cash_account, 'party': None, 'debit': amount, 'credit': Decimal('0.00'), 'description': f"Payment received - {reference}"},
                    {'account': ar_account, 'party': party, 'debit': Decimal('0.00'), 'credit': amount, 'description': f"Payment from {party.name}"},
                ]
            else:
                # Money out: Debit AP, Credit Cash
                lines = [
                    {'account': ap_account, 'party': party, 'debit': amount, 'credit': Decimal('0.00'), 'description': f"Payment to {party.name}"},
                    {'account': cash_account, 'party': None, 'debit': Decimal('0.00'), 'credit': amount, 'description': f"Payment disbursed - {reference}"},
                ]

            entry = JournalEntry.post_entry(
                tenant=tenant,
                entry_number=f"JE-{payment_number}",
                memo=f"{payment_type.title()} payment: {party.name}",
                lines_data=lines,
                date=date,
                source_module='payment',
                source_reference=payment_number
            )

            payment = cls.objects.create(
                tenant=tenant,
                payment_number=payment_number,
                party=party,
                payment_type=payment_type,
                payment_method=payment_method,
                amount=amount,
                date=date,
                reference=reference,
                notes=notes,
                journal_entry=entry
            )
            return payment
