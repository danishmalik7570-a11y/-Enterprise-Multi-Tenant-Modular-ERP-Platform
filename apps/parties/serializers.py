from rest_framework import serializers
from apps.parties.models import Party

class PartySerializer(serializers.ModelSerializer):
    current_balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = Party
        fields = [
            'id', 'name', 'code', 'type', 'email', 'phone', 'tax_id',
            'billing_address', 'shipping_address', 'payment_terms_days',
            'credit_limit', 'custom_fields', 'is_active', 'current_balance',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_balance', 'created_at', 'updated_at']
