from apps.finance.models import Account

STANDARD_CHART_OF_ACCOUNTS = [
    # Assets
    ('1000', 'Cash & Bank Accounts', Account.TYPE_ASSET, 'Liquid cash, checking, and savings accounts'),
    ('1200', 'Accounts Receivable', Account.TYPE_ASSET, 'Amounts owed by customers on credit invoices'),
    ('1300', 'Inventory Asset', Account.TYPE_ASSET, 'Physical inventory valuation on hand'),

    # Liabilities
    ('2000', 'Accounts Payable', Account.TYPE_LIABILITY, 'Amounts owed to suppliers for bills received'),
    ('2200', 'Sales Tax Payable', Account.TYPE_LIABILITY, 'Collected sales taxes due to authorities'),

    # Equity
    ('3000', "Owner's Equity / Retained Earnings", Account.TYPE_EQUITY, 'Cumulative equity of the business'),

    # Revenue
    ('4000', 'Operating Sales & Revenue', Account.TYPE_REVENUE, 'Income from sales of products or services'),
    ('4100', 'Consulting & Service Income', Account.TYPE_REVENUE, 'Professional consulting and service fees'),

    # Expenses
    ('5000', 'Cost of Goods Sold (COGS)', Account.TYPE_EXPENSE, 'Direct cost of merchandise sold'),
    ('6000', 'General Operating Expense', Account.TYPE_EXPENSE, 'Rent, utilities, office expenses'),
    ('6100', 'Professional & Subcontractor Fees', Account.TYPE_EXPENSE, 'Contractors and consulting expenses'),
]

def seed_chart_of_accounts(tenant):
    """Initializes standard chart of accounts for a tenant."""
    created_accounts = {}
    for code, name, acct_type, desc in STANDARD_CHART_OF_ACCOUNTS:
        acct, _ = Account.objects.get_or_create(
            tenant=tenant,
            code=code,
            defaults={'name': name, 'type': acct_type, 'description': desc}
        )
        created_accounts[code] = acct
    return created_accounts
