from django.db import models
from apps.tenancy.models import TenantAwareModel

class ExtensionRegistry(models.Model):
    """
    Catalog of available plug-and-play industry extensions.
    Keeping the core ERP generic and industry-agnostic.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    description = models.TextField()
    category = models.CharField(max_length=50, default='industry')
    version = models.CharField(max_length=20, default='1.0.0')
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.code}]"


class TenantExtension(TenantAwareModel):
    """Tracks which extensions are enabled for a given tenant."""
    extension = models.ForeignKey(ExtensionRegistry, on_delete=models.CASCADE, related_name='tenant_installations')
    is_enabled = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('tenant', 'extension')

    def __str__(self):
        return f"{self.tenant.name} -> {self.extension.name}"


class ContainerImport(TenantAwareModel):
    """
    Example extension: Danish Treaders container and import freight tracking.
    Plugs in as an add-on without polluting the core generic ERP catalog or purchasing tables.
    """
    STATUS_MANIFESTED = 'manifested'
    STATUS_IN_TRANSIT = 'in_transit'
    STATUS_CUSTOMS = 'customs'
    STATUS_DELIVERED = 'delivered'

    STATUS_CHOICES = [
        (STATUS_MANIFESTED, 'Manifested'),
        (STATUS_IN_TRANSIT, 'In Transit (Ocean)'),
        (STATUS_CUSTOMS, 'Customs Clearance'),
        (STATUS_DELIVERED, 'Delivered to Warehouse'),
    ]

    container_number = models.CharField(max_length=100)
    vessel_name = models.CharField(max_length=150, blank=True)
    shipping_line = models.CharField(max_length=100, blank=True)
    port_of_loading = models.CharField(max_length=100, blank=True)
    port_of_discharge = models.CharField(max_length=100, blank=True)
    estimated_arrival = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_MANIFESTED)
    purchase_order = models.ForeignKey(
        'purchasing.PurchaseOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='containers'
    )
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('tenant', 'container_number')
        ordering = ['-estimated_arrival', '-id']

    def __str__(self):
        return f"Container {self.container_number} ({self.get_status_display()})"
