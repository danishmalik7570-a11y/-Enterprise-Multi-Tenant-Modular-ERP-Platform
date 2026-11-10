from django.db import models
from apps.tenancy.models import TenantAwareModel

class Permission(models.Model):
    """System-wide permission dictionary (e.g. catalog.view, sales.create, finance.approve)."""
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=50)  # view, create, edit, delete, approve
    code = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['module', 'action']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Role(TenantAwareModel):
    """
    Tenant-defined role as data, not code.
    Can be created/customized dynamically by tenant admins.
    """
    SCOPE_ALL = 'all'
    SCOPE_OWN = 'own'
    SCOPE_WAREHOUSE = 'warehouse'

    SCOPE_CHOICES = [
        (SCOPE_ALL, 'All Records'),
        (SCOPE_OWN, 'Own Records Only'),
        (SCOPE_WAREHOUSE, 'Own Warehouse / Branch Only'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_template = models.BooleanField(default=False)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default=SCOPE_ALL)
    
    # Field-level permission overrides per entity
    # Example: {"catalog.item": {"hidden_fields": ["cost_price"], "readonly_fields": ["sku"]}}
    field_permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dictionary specifying hidden and readonly fields per model."
    )

    permissions = models.ManyToManyField(
        Permission,
        through='RolePermission',
        related_name='roles',
        blank=True
    )

    class Meta:
        unique_together = ('tenant', 'name')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"

    def has_perm(self, perm_code: str) -> bool:
        return self.permissions.filter(code=perm_code).exists()

    def get_hidden_fields(self, model_identifier: str) -> list:
        config = self.field_permissions.get(model_identifier, {})
        return config.get('hidden_fields', [])

    def get_readonly_fields(self, model_identifier: str) -> list:
        config = self.field_permissions.get(model_identifier, {})
        return config.get('readonly_fields', [])


class RolePermission(TenantAwareModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role.name} -> {self.permission.code}"
