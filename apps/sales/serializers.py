from rest_framework import serializers
from decimal import Decimal
from apps.sales.models import SalesInvoice, SalesInvoiceItem

class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)

    class Meta:
        model = SalesInvoiceItem
        fields = [
            'id', 'item', 'item_sku', 'item_name', 'quantity',
            'unit_price', 'discount_percent', 'tax_rate', 'line_total'
        ]
        read_only_fields = ['id', 'line_total']


class SalesInvoiceSerializer(serializers.ModelSerializer):
    items = SalesInvoiceItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'status',
            'date', 'due_date', 'warehouse', 'warehouse_name',
            'total_amount', 'tax_amount', 'notes', 'journal_entry',
            'items', 'created_at'
        ]
        read_only_fields = ['id', 'total_amount', 'tax_amount', 'journal_entry', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        tenant = self.context['request'].tenant
        invoice = SalesInvoice.objects.create(tenant=tenant, **validated_data)
        for item_data in items_data:
            SalesInvoiceItem.objects.create(tenant=tenant, invoice=invoice, **item_data)
        invoice.recalculate_totals()
        return invoice


class InvoiceTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.sales.models import InvoiceTemplate
        model = InvoiceTemplate
        fields = ['id', 'name', 'is_default', 'description', 'config', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        tenant = self.context['request'].tenant
        return self.Meta.model.objects.create(tenant=tenant, **validated_data)

