import os
import psycopg2
from decimal import Decimal
from typing import Optional, Dict, Any
from fastapi import FastAPI, Header, HTTPException, status, Query
from pydantic import BaseModel

app = FastAPI(
    title="Generic ERP Async Services & Webhooks",
    description="High-performance async layer sharing the PostgreSQL database for real-time live queries, webhooks, and integrations.",
    version="1.0.0"
)

def get_db_connection():
    try:
        from django.conf import settings
        db_conf = settings.DATABASES['default']
        dbname = db_conf.get('NAME')
        user = db_conf.get('USER', 'postgres')
        password = db_conf.get('PASSWORD', '')
        host = db_conf.get('HOST', '127.0.0.1')
        port = db_conf.get('PORT', '5432')
    except Exception:
        dbname = os.environ.get('DB_NAME', 'generic_erp')
        user = os.environ.get('DB_USER', 'postgres')
        password = os.environ.get('DB_PASSWORD', '')
        host = os.environ.get('DB_HOST', '127.0.0.1')
        port = os.environ.get('DB_PORT', '5432')

    return psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host or '127.0.0.1',
        port=port or '5432'
    )

class WebhookPayload(BaseModel):
    event_type: str
    event_id: Optional[str] = None
    data: Dict[str, Any]

@app.get("/api/async/health")
def health_check():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.close()
        conn.close()
        return {"status": "healthy", "database": "connected", "service": "fastapi-async"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database unreachable: {str(e)}")

@app.get("/api/async/stock-availability")
def live_stock_availability(
    tenant_subdomain: str = Query(..., description="Tenant subdomain"),
    sku: str = Query(..., description="Item SKU")
):
    """Real-time live inventory availability inquiry across warehouses."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Resolve tenant
        cur.execute("SELECT id, name FROM tenancy_tenant WHERE subdomain = %s AND is_active = true;", (tenant_subdomain,))
        tenant_row = cur.fetchone()
        if not tenant_row:
            raise HTTPException(status_code=404, detail="Tenant not found or inactive")
        tenant_id, tenant_name = tenant_row

        # Find item
        cur.execute("SELECT id, name, is_stock_tracked FROM catalog_item WHERE tenant_id = %s AND sku = %s;", (tenant_id, sku))
        item_row = cur.fetchone()
        if not item_row:
            raise HTTPException(status_code=404, detail=f"Item with SKU '{sku}' not found")
        item_id, item_name, is_stock_tracked = item_row

        if not is_stock_tracked:
            return {
                "tenant": tenant_name,
                "sku": sku,
                "item_name": item_name,
                "is_stock_tracked": False,
                "available_quantity": "Unlimited (Service / Non-tracked)"
            }

        # Query live stock per warehouse
        cur.execute("""
            SELECT w.code, w.name, s.quantity_on_hand, s.quantity_reserved
            FROM inventory_stockitem s
            JOIN inventory_warehouse w ON s.warehouse_id = w.id
            WHERE s.tenant_id = %s AND s.item_id = %s;
        """, (tenant_id, item_id))
        rows = cur.fetchall()

        breakdown = []
        total_on_hand = Decimal('0.0000')
        total_reserved = Decimal('0.0000')
        for r in rows:
            q_hand = Decimal(str(r[2]))
            q_res = Decimal(str(r[3]))
            total_on_hand += q_hand
            total_reserved += q_res
            breakdown.append({
                "warehouse_code": r[0],
                "warehouse_name": r[1],
                "quantity_on_hand": str(q_hand),
                "quantity_reserved": str(q_res),
                "available": str(q_hand - q_res)
            })

        return {
            "tenant": tenant_name,
            "sku": sku,
            "item_name": item_name,
            "total_on_hand": str(total_on_hand),
            "total_reserved": str(total_reserved),
            "total_available": str(total_on_hand - total_reserved),
            "warehouses": breakdown
        }
    finally:
        cur.close()
        conn.close()

@app.get("/api/async/party-balance")
def live_party_balance(
    tenant_subdomain: str = Query(...),
    party_id: int = Query(...)
):
    """Real-time party ledger net balance."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name FROM tenancy_tenant WHERE subdomain = %s AND is_active = true;", (tenant_subdomain,))
        tenant = cur.fetchone()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        tenant_id, tenant_name = tenant

        cur.execute("SELECT name, type FROM parties_party WHERE tenant_id = %s AND id = %s;", (tenant_id, party_id))
        party = cur.fetchone()
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        party_name, party_type = party

        # Sum debit and credit from posted lines
        cur.execute("""
            SELECT COALESCE(SUM(l.debit), 0), COALESCE(SUM(l.credit), 0)
            FROM finance_ledgerline l
            JOIN finance_journalentry e ON l.entry_id = e.id
            WHERE l.tenant_id = %s AND l.party_id = %s AND e.is_posted = true;
        """, (tenant_id, party_id))
        tot_debit, tot_credit = cur.fetchone()
        net_balance = Decimal(str(tot_debit)) - Decimal(str(tot_credit))

        return {
            "tenant": tenant_name,
            "party_id": party_id,
            "party_name": party_name,
            "party_type": party_type,
            "net_balance": str(net_balance)
        }
    finally:
        cur.close()
        conn.close()

@app.post("/api/async/webhooks/{tenant_subdomain}")
def receive_webhook(
    tenant_subdomain: str,
    payload: WebhookPayload,
    x_webhook_secret: Optional[str] = Header(None)
):
    """Generic high-throughput webhook receiver for third-party integrations."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name FROM tenancy_tenant WHERE subdomain = %s AND is_active = true;", (tenant_subdomain,))
        tenant = cur.fetchone()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        tenant_id, tenant_name = tenant

        # Record in audit log
        import json
        cur.execute("""
            INSERT INTO users_auditlog (tenant_id, action, module, object_id, details, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id;
        """, (
            tenant_id,
            f"WEBHOOK_{payload.event_type.upper()}",
            "async_webhook",
            payload.event_id or "N/A",
            json.dumps(payload.data)
        ))
        audit_id = cur.fetchone()[0]
        conn.commit()

        return {
            "status": "acknowledged",
            "audit_id": audit_id,
            "event_type": payload.event_type,
            "tenant": tenant_name
        }
    finally:
        cur.close()
        conn.close()
