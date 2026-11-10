from rest_framework import serializers
from apps.tenancy.models import Tenant

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'plan', 'is_active',
            'currency', 'timezone', 'date_format',
            'enabled_modules', 'settings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'plan', 'currency',
            'timezone', 'date_format', 'enabled_modules', 'settings'
        ]

    def validate_subdomain(self, value):
        subdomain = value.lower().strip()
        if not subdomain.isalnum():
            raise serializers.ValidationError("Subdomain must be alphanumeric.")
        if Tenant.objects.filter(subdomain=subdomain).exists():
            raise serializers.ValidationError("This subdomain is already taken.")
        return subdomain
