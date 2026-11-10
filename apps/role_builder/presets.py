from apps.role_builder.models import Permission, Role, RolePermission

STANDARD_PERMISSIONS = [
    # Catalog
    ('catalog', 'view', 'catalog.item.view', 'View Items & Categories'),
    ('catalog', 'create', 'catalog.item.create', 'Create Items & Categories'),
    ('catalog', 'edit', 'catalog.item.edit', 'Edit Items & Categories'),
    ('catalog', 'delete', 'catalog.item.delete', 'Delete Items & Categories'),

    # Inventory
    ('inventory', 'view', 'inventory.stock.view', 'View Stock & Warehouses'),
    ('inventory', 'create', 'inventory.stock.create', 'Perform Stock Movements'),
    ('inventory', 'edit', 'inventory.stock.edit', 'Adjust Stock & Locations'),
    ('inventory', 'delete', 'inventory.stock.delete', 'Delete Warehouses'),

    # Parties
    ('parties', 'view', 'parties.party.view', 'View Customers & Suppliers'),
    ('parties', 'create', 'parties.party.create', 'Create Parties'),
    ('parties', 'edit', 'parties.party.edit', 'Edit Parties'),
    ('parties', 'delete', 'parties.party.delete', 'Delete Parties'),

    # Purchasing
    ('purchasing', 'view', 'purchasing.order.view', 'View Purchase Orders'),
    ('purchasing', 'create', 'purchasing.order.create', 'Create Purchase Orders'),
    ('purchasing', 'edit', 'purchasing.order.edit', 'Edit Purchase Orders'),
    ('purchasing', 'delete', 'purchasing.order.delete', 'Delete Purchase Orders'),
    ('purchasing', 'approve', 'purchasing.order.approve', 'Approve & Receive Purchase Orders'),

    # Sales
    ('sales', 'view', 'sales.order.view', 'View Sales Orders & Invoices'),
    ('sales', 'create', 'sales.order.create', 'Create Sales Orders & Invoices'),
    ('sales', 'edit', 'sales.order.edit', 'Edit Sales Orders'),
    ('sales', 'delete', 'sales.order.delete', 'Delete Sales Orders'),
    ('sales', 'approve', 'sales.order.approve', 'Approve & Post Invoices'),

    # Finance
    ('finance', 'view', 'finance.ledger.view', 'View Chart of Accounts & Ledger'),
    ('finance', 'create', 'finance.ledger.create', 'Create Journal Entries & Accounts'),
    ('finance', 'edit', 'finance.ledger.edit', 'Edit Financial Accounts'),
    ('finance', 'delete', 'finance.ledger.delete', 'Delete Accounts'),
    ('finance', 'approve', 'finance.payment.approve', 'Process Payments & Bank Settlements'),

    # Reports
    ('reports', 'view', 'reports.dashboard.view', 'View Analytics & ERP Reports'),

    # Module Builder
    ('module_builder', 'view', 'module_builder.module.view', 'View Custom Modules'),
    ('module_builder', 'create', 'module_builder.module.create', 'Create Custom Modules & Fields'),
    ('module_builder', 'edit', 'module_builder.module.edit', 'Edit Custom Modules'),
]

def ensure_system_permissions():
    """Ensures all standard system permissions exist globally in the database."""
    for module, action, code, name in STANDARD_PERMISSIONS:
        Permission.objects.get_or_create(
            code=code,
            defaults={'module': module, 'action': action, 'name': name}
        )

def seed_starter_roles(tenant):
    """
    Seeds the 4 required starter role presets for a tenant:
    - Owner: unrestricted full system access
    - Finance: financial ledger, payments, sales/purchase audits, reports
    - Sales: sales, parties, items (cost price hidden)
    - Warehouse: inventory movements, receipts, item catalog (cost price hidden)
    """
    ensure_system_permissions()

    # 1. Owner Role
    owner_role, _ = Role.objects.get_or_create(
        tenant=tenant,
        name='Owner',
        defaults={
            'description': 'Full administrative access to all modules and configurations',
            'is_template': True,
            'scope': Role.SCOPE_ALL,
        }
    )
    all_perms = Permission.objects.all()
    for perm in all_perms:
        RolePermission.objects.get_or_create(tenant=tenant, role=owner_role, permission=perm)

    # 2. Finance Role
    finance_role, _ = Role.objects.get_or_create(
        tenant=tenant,
        name='Finance',
        defaults={
            'description': 'Full double-entry ledger, accounts, payments, and financial analytics',
            'is_template': True,
            'scope': Role.SCOPE_ALL,
        }
    )
    finance_perms = Permission.objects.filter(
        module__in=['finance', 'reports', 'parties'],
        action__in=['view', 'create', 'edit', 'approve']
    ) | Permission.objects.filter(
        module__in=['sales', 'purchasing', 'catalog'],
        action__in=['view']
    )
    for perm in finance_perms:
        RolePermission.objects.get_or_create(tenant=tenant, role=finance_role, permission=perm)

    # 3. Sales Role (masks cost_price on catalog items)
    sales_role, _ = Role.objects.get_or_create(
        tenant=tenant,
        name='Sales',
        defaults={
            'description': 'Sales orders, invoices, and customer relationship management',
            'is_template': True,
            'scope': Role.SCOPE_ALL,
            'field_permissions': {
                'catalog.item': {
                    'hidden_fields': ['cost_price'],
                    'readonly_fields': ['sku', 'selling_price']
                }
            }
        }
    )
    sales_perms = Permission.objects.filter(
        module__in=['sales', 'parties'],
        action__in=['view', 'create', 'edit']
    ) | Permission.objects.filter(
        module__in=['catalog', 'reports'],
        action__in=['view']
    )
    for perm in sales_perms:
        RolePermission.objects.get_or_create(tenant=tenant, role=sales_role, permission=perm)

    # 4. Warehouse Role (masks cost prices and ledger figures)
    warehouse_role, _ = Role.objects.get_or_create(
        tenant=tenant,
        name='Warehouse',
        defaults={
            'description': 'Stock management, location movements, and purchase receiving',
            'is_template': True,
            'scope': Role.SCOPE_ALL,
            'field_permissions': {
                'catalog.item': {
                    'hidden_fields': ['cost_price'],
                    'readonly_fields': ['sku', 'name', 'unit_of_measure']
                }
            }
        }
    )
    warehouse_perms = Permission.objects.filter(
        module__in=['inventory'],
        action__in=['view', 'create', 'edit']
    ) | Permission.objects.filter(
        code__in=['catalog.item.view', 'purchasing.order.view', 'purchasing.order.approve']
    )
    for perm in warehouse_perms:
        RolePermission.objects.get_or_create(tenant=tenant, role=warehouse_role, permission=perm)

    return {
        'Owner': owner_role,
        'Finance': finance_role,
        'Sales': sales_role,
        'Warehouse': warehouse_role,
    }
