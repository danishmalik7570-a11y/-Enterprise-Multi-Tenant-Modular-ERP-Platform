from rest_framework import serializers
from decimal import Decimal
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'item', 'item_sku', 'item_name', 'quantity', 'unit_price', 'tax_rate', 'line_total']
        read_only_fields = ['id', 'line_total']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'supplier', 'supplier_name', 'status',
            'order_date', 'warehouse', 'warehouse_name', 'total_amount',
            'tax_amount', 'notes', 'journal_entry', 'items', 'created_at'
        ]
        read_only_fields = ['id', 'total_amount', 'tax_amount', 'journal_entry', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        tenant = self.context['request'].tenant
        po = PurchaseOrder.objects.create(tenant=tenant, **validated_data)
        for item_data in items_data:
            PurchaseOrderItem.objects.create(tenant=tenant, order=po, **item_data)
        po.recalculate_totals()
        return po
