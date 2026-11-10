from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from apps.finance.models import Account, LedgerLine
from apps.parties.models import Party
from apps.catalog.models import Item
from apps.inventory.models import StockItem

def get_dashboard_summary(tenant):
    """
    Returns dashboard widgets dynamically filtered by tenant.enabled_modules.
    """
    summary = {
        'tenant': tenant.name,
        'currency': tenant.currency,
        'enabled_modules': tenant.enabled_modules,
        'widgets': {}
    }

    # Finance Widget (if finance enabled)
    if tenant.is_module_enabled('finance'):
        cash_accounts = Account.objects.filter(tenant=tenant, type=Account.TYPE_ASSET, code__startswith='10')
        cash_balance = sum((acct.balance for acct in cash_accounts), Decimal('0.00'))

        ar_account = Account.objects.filter(tenant=tenant, code='1200').first()
        ar_balance = ar_account.balance if ar_account else Decimal('0.00')

        ap_account = Account.objects.filter(tenant=tenant, code='2000').first()
        ap_balance = ap_account.balance if ap_account else Decimal('0.00')

        revenue_accounts = Account.objects.filter(tenant=tenant, type=Account.TYPE_REVENUE)
        total_revenue = sum((acct.balance for acct in revenue_accounts), Decimal('0.00'))

        expense_accounts = Account.objects.filter(tenant=tenant, type=Account.TYPE_EXPENSE)
        total_expense = sum((acct.balance for acct in expense_accounts), Decimal('0.00'))

        summary['widgets']['finance'] = {
            'cash_and_bank': str(cash_balance),
            'accounts_receivable': str(ar_balance),
            'accounts_payable': str(ap_balance),
            'total_revenue': str(total_revenue),
            'total_expense': str(total_expense),
            'net_profit': str(total_revenue - total_expense)
        }

    # Sales Widget
    if tenant.is_module_enabled('sales'):
        from apps.sales.models import SalesInvoice
        invoices = SalesInvoice.objects.filter(tenant=tenant)
        summary['widgets']['sales'] = {
            'invoice_count': invoices.count(),
            'total_invoiced': str(sum((inv.total_amount for inv in invoices), Decimal('0.00'))),
            'paid_invoices_count': invoices.filter(status=SalesInvoice.STATUS_PAID).count()
        }

    # Purchasing Widget
    if tenant.is_module_enabled('purchasing'):
        from apps.purchasing.models import PurchaseOrder
        orders = PurchaseOrder.objects.filter(tenant=tenant)
        summary['widgets']['purchasing'] = {
            'orders_count': orders.count(),
            'total_purchased': str(sum((po.total_amount for po in orders), Decimal('0.00'))),
            'received_count': orders.filter(status=PurchaseOrder.STATUS_RECEIVED).count()
        }

    # Inventory Widget (only if enabled for this tenant)
    if tenant.is_module_enabled('inventory'):
        stocks = StockItem.objects.filter(tenant=tenant).select_related('item', 'warehouse')
        total_qty = sum((s.quantity_on_hand for s in stocks), Decimal('0.00'))
        total_val = sum((s.quantity_on_hand * s.item.cost_price for s in stocks), Decimal('0.00'))
        summary['widgets']['inventory'] = {
            'tracked_items_count': Item.objects.filter(tenant=tenant, is_stock_tracked=True).count(),
            'total_units_on_hand': str(total_qty),
            'total_valuation': str(total_val.quantize(Decimal('0.01')))
        }

    return summary


def get_stock_summary(tenant):
    """Returns inventory levels and valuations by warehouse and item."""
    stocks = StockItem.objects.filter(tenant=tenant).select_related('item', 'warehouse')
    results = []
    for s in stocks:
        val = (s.quantity_on_hand * s.item.cost_price).quantize(Decimal('0.01'))
        results.append({
            'item_id': s.item.id,
            'sku': s.item.sku,
            'name': s.item.name,
            'warehouse': s.warehouse.name,
            'warehouse_code': s.warehouse.code,
            'quantity_on_hand': str(s.quantity_on_hand),
            'unit_cost': str(s.item.cost_price),
            'valuation': str(val)
        })
    return results


def get_profit_and_loss(tenant, start_date=None, end_date=None):
    """Computes Revenue minus Expenses for the tenant."""
    rev_accounts = Account.objects.filter(tenant=tenant, type=Account.TYPE_REVENUE)
    exp_accounts = Account.objects.filter(tenant=tenant, type=Account.TYPE_EXPENSE)

    rev_lines = LedgerLine.objects.filter(
        tenant=tenant, account__in=rev_accounts, entry__is_posted=True
    )
    exp_lines = LedgerLine.objects.filter(
        tenant=tenant, account__in=exp_accounts, entry__is_posted=True
    )

    if start_date:
        rev_lines = rev_lines.filter(entry__date__gte=start_date)
        exp_lines = exp_lines.filter(entry__date__gte=start_date)
    if end_date:
        rev_lines = rev_lines.filter(entry__date__lte=end_date)
        exp_lines = exp_lines.filter(entry__date__lte=end_date)

    total_revenue = sum((line.credit - line.debit for line in rev_lines), Decimal('0.00'))
    total_expense = sum((line.debit - line.credit for line in exp_lines), Decimal('0.00'))
    net_income = total_revenue - total_expense

    return {
        'total_revenue': str(total_revenue),
        'total_expense': str(total_expense),
        'net_income': str(net_income)
    }


def get_receivables_aging(tenant):
    """Computes Accounts Receivable aging brackets per customer."""
    today = timezone.now().date()
    from apps.sales.models import SalesInvoice
    open_invoices = SalesInvoice.objects.filter(
        tenant=tenant,
        status__in=[SalesInvoice.STATUS_CONFIRMED]
    ).select_related('customer')

    aging = {}
    for inv in open_invoices:
        cust_name = inv.customer.name
        if cust_name not in aging:
            aging[cust_name] = {
                'customer_id': inv.customer.id,
                'customer_name': cust_name,
                'current_0_30': Decimal('0.00'),
                'aging_31_60': Decimal('0.00'),
                'aging_61_90': Decimal('0.00'),
                'aging_over_90': Decimal('0.00'),
                'total_outstanding': Decimal('0.00')
            }

        days_old = (today - inv.due_date).days if inv.due_date else 0
        amt = inv.total_amount
        aging[cust_name]['total_outstanding'] += amt

        if days_old <= 30:
            aging[cust_name]['current_0_30'] += amt
        elif days_old <= 60:
            aging[cust_name]['aging_31_60'] += amt
        elif days_old <= 90:
            aging[cust_name]['aging_61_90'] += amt
        else:
            aging[cust_name]['aging_over_90'] += amt

    # Convert Decimals to string for JSON serialization
    serialized = []
    for data in aging.values():
        serialized.append({k: str(v) if isinstance(v, Decimal) else v for k, v in data.items()})
    return serialized


def get_payables_aging(tenant):
    """Computes Accounts Payable aging brackets per supplier."""
    today = timezone.now().date()
    from apps.purchasing.models import PurchaseOrder
    open_pos = PurchaseOrder.objects.filter(
        tenant=tenant,
        status__in=[PurchaseOrder.STATUS_ORDERED, PurchaseOrder.STATUS_RECEIVED]
    ).select_related('supplier')

    aging = {}
    for po in open_pos:
        supp_name = po.supplier.name
        if supp_name not in aging:
            aging[supp_name] = {
                'supplier_id': po.supplier.id,
                'supplier_name': supp_name,
                'current_0_30': Decimal('0.00'),
                'aging_31_60': Decimal('0.00'),
                'aging_61_90': Decimal('0.00'),
                'aging_over_90': Decimal('0.00'),
                'total_outstanding': Decimal('0.00')
            }

        days_old = (today - po.date).days if po.date else 0
        amt = po.total_amount
        aging[supp_name]['total_outstanding'] += amt

        if days_old <= 30:
            aging[supp_name]['current_0_30'] += amt
        elif days_old <= 60:
            aging[supp_name]['aging_31_60'] += amt
        elif days_old <= 90:
            aging[supp_name]['aging_61_90'] += amt
        else:
            aging[supp_name]['aging_over_90'] += amt

    serialized = []
    for data in aging.values():
        serialized.append({k: str(v) if isinstance(v, Decimal) else v for k, v in data.items()})
    return serialized


def get_sales_report(tenant, start_date=None, end_date=None, customer_id=None, item_id=None):
    """Detailed sales breakdown by date range, customer, and product."""
    from apps.sales.models import SalesInvoice
    qs = SalesInvoice.objects.filter(tenant=tenant).select_related('customer').prefetch_related('items__item')
    if start_date:
        qs = qs.filter(date__gte=start_date)
    if end_date:
        qs = qs.filter(date__lte=end_date)
    if customer_id:
        qs = qs.filter(customer_id=customer_id)
    if item_id:
        qs = qs.filter(items__item_id=item_id).distinct()

    records = []
    total_sales = Decimal('0.00')
    total_tax = Decimal('0.00')

    for inv in qs:
        total_sales += inv.total_amount
        total_tax += inv.tax_amount
        records.append({
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'date': str(inv.date),
            'customer_name': inv.customer.name,
            'status': inv.status,
            'tax_amount': str(inv.tax_amount),
            'total_amount': str(inv.total_amount),
            'item_count': inv.items.count(),
        })

    return {
        'records': records,
        'summary': {
            'total_invoices': len(records),
            'total_revenue': str(total_sales),
            'total_tax': str(total_tax),
        }
    }


def get_purchase_report(tenant, start_date=None, end_date=None, supplier_id=None, item_id=None):
    """Detailed purchase order breakdown by date, supplier, and product."""
    from apps.purchasing.models import PurchaseOrder
    qs = PurchaseOrder.objects.filter(tenant=tenant).select_related('supplier').prefetch_related('items__item')
    if start_date:
        qs = qs.filter(date__gte=start_date)
    if end_date:
        qs = qs.filter(date__lte=end_date)
    if supplier_id:
        qs = qs.filter(supplier_id=supplier_id)
    if item_id:
        qs = qs.filter(items__item_id=item_id).distinct()

    records = []
    total_spend = Decimal('0.00')

    for po in qs:
        total_spend += po.total_amount
        records.append({
            'id': po.id,
            'order_number': po.order_number,
            'date': str(po.date),
            'supplier_name': po.supplier.name,
            'status': po.status,
            'total_amount': str(po.total_amount),
            'item_count': po.items.count(),
        })

    return {
        'records': records,
        'summary': {
            'total_orders': len(records),
            'total_spend': str(total_spend),
        }
    }


def get_low_stock_report(tenant, threshold=10):
    """Items where current stock is below threshold or reorder level."""
    stocks = StockItem.objects.filter(
        tenant=tenant,
        quantity_on_hand__lte=threshold
    ).select_related('item', 'warehouse')

    records = []
    for s in stocks:
        records.append({
            'item_id': s.item.id,
            'sku': s.item.sku,
            'name': s.item.name,
            'warehouse': s.warehouse.name,
            'quantity_on_hand': str(s.quantity_on_hand),
            'reorder_level': str(s.item.reorder_level if hasattr(s.item, 'reorder_level') else threshold),
            'unit_cost': str(s.item.cost_price),
            'urgency': 'CRITICAL' if s.quantity_on_hand <= 0 else 'LOW_STOCK'
        })
    return records


def get_stock_movement_report(tenant, start_date=None, end_date=None, warehouse_id=None, item_id=None):
    """Audit log of stock movements (inwards, outwards, adjustments)."""
    from apps.inventory.models import StockMovement
    qs = StockMovement.objects.filter(tenant=tenant).select_related('item', 'warehouse').order_by('-timestamp')
    if start_date:
        qs = qs.filter(timestamp__date__gte=start_date)
    if end_date:
        qs = qs.filter(timestamp__date__lte=end_date)
    if warehouse_id:
        qs = qs.filter(warehouse_id=warehouse_id)
    if item_id:
        qs = qs.filter(item_id=item_id)

    records = []
    for m in qs[:200]:
        records.append({
            'id': m.id,
            'timestamp': m.timestamp.strftime('%Y-%m-%d %H:%M'),
            'type': m.movement_type,
            'item_sku': m.item.sku,
            'item_name': m.item.name,
            'warehouse': m.warehouse.name,
            'quantity': str(m.quantity),
            'unit_cost': str(m.unit_cost),
            'reference': m.reference,
            'notes': m.notes
        })
    return records


def get_cash_flow_report(tenant, start_date=None, end_date=None):
    """Cash and bank inflow vs outflow report."""
    cash_accounts = Account.objects.filter(tenant=tenant, type=Account.TYPE_ASSET, code__startswith='10')
    lines = LedgerLine.objects.filter(tenant=tenant, account__in=cash_accounts, entry__is_posted=True).select_related('entry')
    if start_date:
        lines = lines.filter(entry__date__gte=start_date)
    if end_date:
        lines = lines.filter(entry__date__lte=end_date)

    inflow = sum((l.debit for l in lines), Decimal('0.00'))
    outflow = sum((l.credit for l in lines), Decimal('0.00'))
    net = inflow - outflow

    return {
        'cash_inflow': str(inflow),
        'cash_outflow': str(outflow),
        'net_change': str(net),
        'cash_accounts': [
            {'code': a.code, 'name': a.name, 'balance': str(a.balance)}
            for a in cash_accounts
        ]
    }


def get_party_ledger_report(tenant, party_id, start_date=None, end_date=None):
    """Detailed statement of account for a specific party."""
    party = Party.objects.filter(tenant=tenant, id=party_id).first()
    if not party:
        return {'error': 'Party not found'}

    lines = LedgerLine.objects.filter(
        tenant=tenant, party=party, entry__is_posted=True
    ).select_related('entry', 'account').order_by('entry__date', 'id')

    if start_date:
        lines = lines.filter(entry__date__gte=start_date)
    if end_date:
        lines = lines.filter(entry__date__lte=end_date)

    running_balance = Decimal('0.00')
    statement = []
    for l in lines:
        change = l.debit - l.credit
        running_balance += change
        statement.append({
            'date': str(l.entry.date),
            'entry_number': l.entry.entry_number,
            'description': l.description or l.entry.memo,
            'account': f"{l.account.code} - {l.account.name}",
            'debit': str(l.debit),
            'credit': str(l.credit),
            'balance': str(running_balance)
        })

    return {
        'party_name': party.name,
        'party_type': party.type,
        'closing_balance': str(running_balance),
        'entries': statement
    }

