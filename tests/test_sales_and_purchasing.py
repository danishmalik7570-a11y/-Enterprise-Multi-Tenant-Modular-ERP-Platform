import pytest
from decimal import Decimal
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.finance.defaults import seed_chart_of_accounts
from apps.parties.models import Party
from apps.catalog.models import Item
from apps.inventory.models import Warehouse, StockItem, StockMovement
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem
from apps.sales.models import SalesInvoice, SalesInvoiceItem

@pytest.mark.django_db
def test_purchasing_and_sales_physical_goods_flow():
    tenant = Tenant.objects.create(
        name="Titan Gear", subdomain="titan",
        enabled_modules=['catalog', 'inventory', 'purchasing', 'sales', 'finance']
    )

    with tenant_context(tenant):
        seed_chart_of_accounts(tenant)
        warehouse = Warehouse.objects.create(code="WH-1", name="Main Warehouse")
        supplier = Party.objects.create(name="Steel Supplier", type=Party.TYPE_SUPPLIER)
        customer = Party.objects.create(name="Construction Client", type=Party.TYPE_CUSTOMER)

        item = Item.objects.create(
            sku="STEEL-BEAM-01",
            name="Structural Steel Beam",
            type=Item.TYPE_GOODS,
            is_stock_tracked=True,
            selling_price=Decimal("500.00"),
            cost_price=Decimal("300.00")
        )

        # 1. Purchasing Flow: Purchase 20 units @ $300.00
        po = PurchaseOrder.objects.create(
            order_number="PO-101", supplier=supplier, warehouse=warehouse
        )
        PurchaseOrderItem.objects.create(
            order=po, item=item, quantity=Decimal("20.0000"), unit_price=Decimal("300.00")
        )
        po.recalculate_totals()
        po.receive_and_post()

        # Stock should now be 20 in WH-1
        stock = StockItem.objects.get(warehouse=warehouse, item=item)
        assert stock.quantity_on_hand == Decimal("20.0000")
        assert StockMovement.objects.filter(item=item, movement_type=StockMovement.TYPE_RECEIPT).count() == 1
        assert po.journal_entry is not None

        # 2. Sales Flow: Sell 5 units @ $500.00
        inv = SalesInvoice.objects.create(
            invoice_number="INV-201", customer=customer, warehouse=warehouse
        )
        SalesInvoiceItem.objects.create(
            invoice=inv, item=item, quantity=Decimal("5.0000"), unit_price=Decimal("500.00")
        )
        inv.recalculate_totals()
        inv.confirm_and_post()

        # Stock should decrease from 20 to 15
        stock.refresh_from_db()
        assert stock.quantity_on_hand == Decimal("15.0000")
        assert StockMovement.objects.filter(item=item, movement_type=StockMovement.TYPE_ISSUE).count() == 1
        assert inv.journal_entry is not None

@pytest.mark.django_db
def test_services_sales_bypasses_inventory():
    """Service consulting company does not track inventory; stock movements are skipped."""
    tenant = Tenant.objects.create(
        name="Clarity Advisory", subdomain="clarity",
        enabled_modules=['catalog', 'sales', 'finance']  # inventory disabled
    )

    with tenant_context(tenant):
        seed_chart_of_accounts(tenant)
        customer = Party.objects.create(name="Enterprise Client", type=Party.TYPE_CUSTOMER)
        service_item = Item.objects.create(
            sku="AUDIT-HOURS",
            name="Security Audit Hours",
            type=Item.TYPE_SERVICE,
            is_stock_tracked=False,
            selling_price=Decimal("200.00")
        )

        inv = SalesInvoice.objects.create(invoice_number="INV-SRV-01", customer=customer)
        SalesInvoiceItem.objects.create(
            invoice=inv, item=service_item, quantity=Decimal("10.0000"), unit_price=Decimal("200.00")
        )
        inv.recalculate_totals()
        inv.confirm_and_post()

        # Verification: Zero stock movements occurred!
        assert StockMovement.objects.count() == 0
        assert inv.status == SalesInvoice.STATUS_CONFIRMED
        assert inv.journal_entry is not None
        assert customer.current_balance == Decimal("2000.00")
