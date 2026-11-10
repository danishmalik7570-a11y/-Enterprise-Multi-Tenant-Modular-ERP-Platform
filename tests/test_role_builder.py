import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.tenancy.models import Tenant
from apps.tenancy.context import tenant_context
from apps.role_builder.models import Role, Permission, RolePermission
from apps.role_builder.presets import seed_starter_roles
from apps.catalog.models import Item
from apps.catalog.serializers import ItemSerializer
from apps.users.models import TenantUser

User = get_user_model()

@pytest.mark.django_db
def test_starter_roles_and_field_masking():
    tenant = Tenant.objects.create(name="Omega Distribution", subdomain="omega", plan="enterprise")

    with tenant_context(tenant):
        roles = seed_starter_roles(tenant)
        assert 'Owner' in roles
        assert 'Finance' in roles
        assert 'Sales' in roles
        assert 'Warehouse' in roles

        # Create user with Sales role
        sales_user = User.objects.create_user(email="salesman@omega.com", password="pass")
        sales_membership = TenantUser.objects.create(
            tenant=tenant,
            user=sales_user,
            role=roles['Sales']
        )

        item = Item.objects.create(
            sku="TEST-SKU-99",
            name="Industrial Drill",
            selling_price=Decimal("450.00"),
            cost_price=Decimal("220.00"),
            is_stock_tracked=True
        )

        from types import SimpleNamespace
        mock_sales_request = SimpleNamespace(
            user=sales_user,
            tenant=tenant,
            tenant_user=sales_membership
        )

        serializer = ItemSerializer(item, context={'request': mock_sales_request})
        data = serializer.data

        # Verify cost_price is masked/hidden from Sales role!
        assert 'cost_price' not in data, "Sales role must not see cost_price according to field_permissions"
        assert data['selling_price'] == '450.00'
        assert data['sku'] == 'TEST-SKU-99'

        # Owner role should see cost_price
        owner_user = User.objects.create_user(email="boss@omega.com", password="pass")
        owner_membership = TenantUser.objects.create(
            tenant=tenant,
            user=owner_user,
            role=roles['Owner'],
            is_tenant_admin=True
        )
        mock_owner_request = SimpleNamespace(
            user=owner_user,
            tenant=tenant,
            tenant_user=owner_membership
        )

        owner_serializer = ItemSerializer(item, context={'request': mock_owner_request})
        owner_data = owner_serializer.data
        assert 'cost_price' in owner_data
        assert owner_data['cost_price'] == '220.00'
