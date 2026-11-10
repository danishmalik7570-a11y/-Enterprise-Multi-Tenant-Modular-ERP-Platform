import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.finance.models import Account, JournalEntry, Payment
from apps.finance.defaults import seed_chart_of_accounts
from apps.parties.models import Party

@pytest.mark.django_db
def test_double_entry_ledger_invariants():
    tenant = Tenant.objects.create(name="Delta Finance Corp", subdomain="delta", plan="growth")

    with tenant_context(tenant):
        coa = seed_chart_of_accounts(tenant)
        cash = coa['1000']
        revenue = coa['4000']

        # 1. Unbalanced journal entry should raise ValidationError
        unbalanced_lines = [
            {'account': cash, 'debit': Decimal('100.00'), 'credit': Decimal('0.00')},
            {'account': revenue, 'debit': Decimal('0.00'), 'credit': Decimal('90.00')},  # 100 != 90
        ]
        with pytest.raises(ValidationError) as exc:
            JournalEntry.post_entry(
                tenant=tenant,
                entry_number="JE-FAIL-01",
                memo="Unbalanced entry test",
                lines_data=unbalanced_lines
            )
        assert "Double-entry invariant violated" in str(exc.value)

        # 2. Balanced entry succeeds
        balanced_lines = [
            {'account': cash, 'debit': Decimal('100.00'), 'credit': Decimal('0.00')},
            {'account': revenue, 'debit': Decimal('0.00'), 'credit': Decimal('100.00')},
        ]
        entry = JournalEntry.post_entry(
            tenant=tenant,
            entry_number="JE-PASS-01",
            memo="Balanced entry test",
            lines_data=balanced_lines
        )
        assert entry.id is not None
        assert entry.is_posted is True

@pytest.mark.django_db
def test_payment_and_party_balance_calculation():
    tenant = Tenant.objects.create(name="Epsilon Trading", subdomain="epsilon", plan="growth")

    with tenant_context(tenant):
        coa = seed_chart_of_accounts(tenant)
        customer = Party.objects.create(name="Globex Corp", code="C-GLOBEX", type=Party.TYPE_CUSTOMER)
        assert customer.current_balance == Decimal('0.00')

        # Invoice customer for $5,000.00 (Debit AR, Credit Revenue)
        JournalEntry.post_entry(
            tenant=tenant,
            entry_number="JE-INV-001",
            memo="Invoice Globex",
            lines_data=[
                {'account': coa['1200'], 'party': customer, 'debit': Decimal('5000.00'), 'credit': Decimal('0.00')},
                {'account': coa['4000'], 'party': None, 'debit': Decimal('0.00'), 'credit': Decimal('5000.00')},
            ]
        )
        # Outstanding receivable balance should now be $5,000.00
        assert customer.current_balance == Decimal('5000.00')

        # Customer pays $3,000.00
        Payment.record_payment(
            tenant=tenant,
            payment_number="PAY-GLO-01",
            party=customer,
            payment_type=Payment.TYPE_INBOUND,
            amount=Decimal('3000.00')
        )
        # Outstanding receivable balance should now decrease to $2,000.00
        assert customer.current_balance == Decimal('2000.00')
