from rest_framework import serializers
from apps.catalog.models import Category, Item
from apps.role_builder.permissions import FieldMaskingSerializerMixin

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class ItemSerializer(FieldMaskingSerializerMixin, serializers.ModelSerializer):
    model_identifier = 'catalog.item'
    total_stock = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Item
        fields = [
            'id', 'sku', 'name', 'type', 'is_stock_tracked',
            'category', 'category_name', 'unit_of_measure',
            'selling_price', 'cost_price', 'tax_rate',
            'custom_attributes', 'is_active', 'total_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_stock', 'created_at', 'updated_at']
