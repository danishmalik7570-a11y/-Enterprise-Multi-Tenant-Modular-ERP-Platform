from django.db import models
from django.core.exceptions import ValidationError
from apps.tenancy.context import get_current_tenant, is_tenant_bypass_active

class Tenant(models.Model):
    name = models.CharField(max_length=255)
    subdomain = models.SlugField(max_length=100, unique=True, db_index=True)
    plan = models.CharField(max_length=50, default='growth')
    is_active = models.BooleanField(default=True)
    currency = models.CharField(max_length=10, default='Rs.')
    timezone = models.CharField(max_length=50, default='UTC')
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    
    # List of enabled module names: e.g. ['catalog', 'inventory', 'purchasing', 'sales', 'finance', 'reports', 'module_builder']
    enabled_modules = models.JSONField(
        default=list,
        help_text="List of enabled modules for this tenant"
    )
    
    # Tenant-specific configuration overrides (tax rates, number formats, etc.)
    settings = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['subdomain']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.subdomain})"

    def is_module_enabled(self, module_name: str) -> bool:
        if not self.enabled_modules:
            return True  # By default all core modules enabled if empty
        return module_name in self.enabled_modules

    def enable_module(self, module_name: str):
        if module_name not in self.enabled_modules:
            self.enabled_modules.append(module_name)
            self.save(update_fields=['enabled_modules', 'updated_at'])

    def disable_module(self, module_name: str):
        if module_name in self.enabled_modules:
            self.enabled_modules.remove(module_name)
            self.save(update_fields=['enabled_modules', 'updated_at'])


class TenantQuerySet(models.QuerySet):
    def for_tenant(self, tenant):
        return self.filter(tenant=tenant)


class TenantManager(models.Manager):
    def get_queryset(self):
        qs = TenantQuerySet(self.model, using=self._db)
        if is_tenant_bypass_active():
            return qs
        current_tenant = get_current_tenant()
        if current_tenant:
            return qs.filter(tenant=current_tenant)
        return qs

    def unscoped(self):
        """Explicitly return unfiltered queryset."""
        return TenantQuerySet(self.model, using=self._db)


class TenantAwareModel(models.Model):
    """
    Abstract base model that guarantees strict tenant isolation.
    Automatically assigns tenant on save and filters queries via TenantManager.
    """
    tenant = models.ForeignKey(
        'tenancy.Tenant',
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            current_tenant = get_current_tenant()
            if current_tenant:
                self.tenant = current_tenant
            elif not is_tenant_bypass_active():
                raise ValidationError("Tenant is required to save a TenantAwareModel instance.")
        super().save(*args, **kwargs)
