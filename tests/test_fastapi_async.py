import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from async_services.main import app
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.catalog.models import Item
from apps.inventory.models import Warehouse, StockItem
from apps.parties.models import Party
from apps.finance.defaults import seed_chart_of_accounts
from apps.finance.models import JournalEntry

client = TestClient(app)

def test_async_health():
    response = client.get("/api/async/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

@pytest.mark.django_db(transaction=True)
def test_async_live_stock_availability():
    tenant = Tenant.objects.create(name="Live Logistics", subdomain="live-logistics", plan="enterprise")
    with tenant_context(tenant):
        item = Item.objects.create(
            sku="LIVE-PROD-01",
            name="Live Sensor Unit",
            is_stock_tracked=True,
            selling_price=Decimal("99.00")
        )
        wh = Warehouse.objects.create(code="WH-LIVE", name="Live Warehouse")
        StockItem.objects.create(
            warehouse=wh,
            item=item,
            quantity_on_hand=Decimal("150.0000"),
            quantity_reserved=Decimal("20.0000")
        )

    # Call FastAPI async endpoint directly
    response = client.get("/api/async/stock-availability?tenant_subdomain=live-logistics&sku=LIVE-PROD-01")
    assert response.status_code == 200
    data = response.json()
    assert data["sku"] == "LIVE-PROD-01"
    assert Decimal(data["total_on_hand"]) == Decimal("150.0000")
    assert Decimal(data["total_available"]) == Decimal("130.0000")
    assert len(data["warehouses"]) == 1

@pytest.mark.django_db(transaction=True)
def test_async_live_party_balance_and_webhook():
    tenant = Tenant.objects.create(name="Live Trade", subdomain="live-trade", plan="growth")
    with tenant_context(tenant):
        coa = seed_chart_of_accounts(tenant)
        cust = Party.objects.create(name="Async Client", type=Party.TYPE_CUSTOMER)
        # Create posted receivable line
        JournalEntry.post_entry(
            tenant=tenant,
            entry_number="JE-ASYNC-1",
            memo="Async sale",
            lines_data=[
                {'account': coa['1200'], 'party': cust, 'debit': Decimal('850.00'), 'credit': Decimal('0.00')},
                {'account': coa['4000'], 'party': None, 'debit': Decimal('0.00'), 'credit': Decimal('850.00')},
            ]
        )

    # 1. Test live party balance endpoint
    response = client.get(f"/api/async/party-balance?tenant_subdomain=live-trade&party_id={cust.id}")
    assert response.status_code == 200
    assert response.json()["net_balance"] == "850.00"

    # 2. Test webhook ingestion
    webhook_res = client.post(
        "/api/async/webhooks/live-trade",
        json={
            "event_type": "stripe.payment_intent.succeeded",
            "event_id": "evt_9981241",
            "data": {"amount": 85000, "currency": "usd", "customer": "cus_123"}
        }
    )
    assert webhook_res.status_code == 200
    assert webhook_res.json()["status"] == "acknowledged"
    assert webhook_res.json()["event_type"] == "stripe.payment_intent.succeeded"
