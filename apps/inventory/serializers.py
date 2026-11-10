from rest_framework import serializers
from decimal import Decimal
from apps.inventory.models import Warehouse, StockItem, StockMovement, Batch

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ['id', 'code', 'name', 'address', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class BatchSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source='item.sku', read_only=True)

    class Meta:
        model = Batch
        fields = ['id', 'item', 'item_sku', 'batch_number', 'manufacturing_date', 'expiration_date', 'notes']
        read_only_fields = ['id']


class StockItemSerializer(serializers.ModelSerializer):
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    available_quantity = serializers.DecimalField(max_digits=15, decimal_places=4, read_only=True)

    class Meta:
        model = StockItem
        fields = [
            'id', 'warehouse', 'warehouse_code', 'warehouse_name',
            'item', 'item_sku', 'item_name', 'quantity_on_hand',
            'quantity_reserved', 'available_quantity', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class StockMovementSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    warehouse_code = serializers.CharField(source='warehouse.code', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'movement_type', 'custom_reason_code', 'item', 'item_sku',
            'warehouse', 'warehouse_code', 'destination_warehouse',
            'batch', 'quantity', 'unit_cost', 'reference', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        tenant = self.context['request'].tenant
        return StockMovement.record_movement(
            tenant=tenant,
            movement_type=validated_data['movement_type'],
            item=validated_data['item'],
            warehouse=validated_data['warehouse'],
            quantity=validated_data['quantity'],
            unit_cost=validated_data.get('unit_cost', Decimal('0.00')),
            reference=validated_data.get('reference', ''),
            destination_warehouse=validated_data.get('destination_warehouse'),
            batch=validated_data.get('batch'),
            custom_reason_code=validated_data.get('custom_reason_code', ''),
            notes=validated_data.get('notes', '')
        )
