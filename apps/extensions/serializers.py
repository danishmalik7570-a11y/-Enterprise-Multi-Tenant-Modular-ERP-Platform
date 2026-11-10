from rest_framework import serializers
from apps.extensions.models import ExtensionRegistry, TenantExtension, ContainerImport

class ExtensionRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtensionRegistry
        fields = ['id', 'code', 'name', 'description', 'category', 'version', 'is_available']


class TenantExtensionSerializer(serializers.ModelSerializer):
    extension_code = serializers.CharField(source='extension.code', read_only=True)
    extension_name = serializers.CharField(source='extension.name', read_only=True)

    class Meta:
        model = TenantExtension
        fields = ['id', 'extension', 'extension_code', 'extension_name', 'is_enabled', 'config', 'created_at']
        read_only_fields = ['id', 'created_at']


class ContainerImportSerializer(serializers.ModelSerializer):
    po_number = serializers.CharField(source='purchase_order.order_number', read_only=True)

    class Meta:
        model = ContainerImport
        fields = [
            'id', 'container_number', 'vessel_name', 'shipping_line',
            'port_of_loading', 'port_of_discharge', 'estimated_arrival',
            'status', 'purchase_order', 'po_number', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
