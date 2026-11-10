from rest_framework import permissions

class HasDynamicPermission(permissions.BasePermission):
    """
    DRF permission class that maps ViewSet actions to dynamic tenant Role permissions.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff or request.user.is_superuser:
            return True

        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False

        # Retrieve user's tenant-specific role
        tenant_user = getattr(request, 'tenant_user', None)
        if not tenant_user:
            from apps.users.models import TenantUser
            tenant_user = TenantUser.objects.filter(tenant=tenant, user=request.user).select_related('role').first()
            request.tenant_user = tenant_user

        if not tenant_user:
            return False

        if tenant_user.is_tenant_admin:
            return True

        role = tenant_user.role
        if not role:
            return False

        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            # Auto-deduce from view attributes
            module = getattr(view, 'permission_module', None)
            action_map = {
                'list': 'view',
                'retrieve': 'view',
                'create': 'create',
                'update': 'edit',
                'partial_update': 'edit',
                'destroy': 'delete',
            }
            action = action_map.get(getattr(view, 'action', 'view'), 'view')
            if module:
                required_perm = f"{module}.{action}"

        if not required_perm:
            return True

        # Check if role has this permission code or prefix
        return role.permissions.filter(code__icontains=required_perm).exists() or role.permissions.filter(code=required_perm).exists()


class FieldMaskingSerializerMixin:
    """
    Serializer mixin that automatically removes fields the current user's role is not permitted to see.
    """
    model_identifier = None  # e.g. 'catalog.item'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if not request or not hasattr(request, 'tenant_user') or not request.tenant_user:
            return ret

        role = request.tenant_user.role
        if not role or not self.model_identifier:
            return ret

        hidden = role.get_hidden_fields(self.model_identifier)
        for field in hidden:
            ret.pop(field, None)

        return ret
