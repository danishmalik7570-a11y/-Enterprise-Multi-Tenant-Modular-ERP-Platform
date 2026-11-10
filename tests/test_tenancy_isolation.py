import pytest
from decimal import Decimal
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.catalog.models import Item
from apps.parties.models import Party

@pytest.mark.django_db
def test_tenant_data_isolation():
    """Verify that records created in Tenant A are never visible or accessible in Tenant B."""
    t1 = Tenant.objects.create(name="Company Alpha", subdomain="alpha", plan="growth")
    t2 = Tenant.objects.create(name="Company Beta", subdomain="beta", plan="growth")

    # Create items in Tenant 1
    with tenant_context(t1):
        item_alpha = Item.objects.create(
            sku="ITEM-ALPHA-01",
            name="Alpha Solar Generator",
            selling_price=Decimal("1500.00"),
            cost_price=Decimal("900.00")
        )
        party_alpha = Party.objects.create(
            name="Alpha Customer",
            code="CUST-A",
            type=Party.TYPE_CUSTOMER
        )
        assert Item.objects.count() == 1
        assert Party.objects.count() == 1
        assert Item.objects.first().sku == "ITEM-ALPHA-01"

    # Switch to Tenant 2
    with tenant_context(t2):
        assert Item.objects.count() == 0, "Tenant 2 should not see Tenant 1's items"
        assert Party.objects.count() == 0, "Tenant 2 should not see Tenant 1's parties"

        # Create items in Tenant 2
        Item.objects.create(
            sku="ITEM-BETA-01",
            name="Beta Software License",
            selling_price=Decimal("300.00"),
            cost_price=Decimal("0.00"),
            is_stock_tracked=False
        )
        assert Item.objects.count() == 1
        assert Item.objects.first().sku == "ITEM-BETA-01"

    # Switch back to Tenant 1
    with tenant_context(t1):
        assert Item.objects.count() == 1
        assert Item.objects.first().sku == "ITEM-ALPHA-01"
