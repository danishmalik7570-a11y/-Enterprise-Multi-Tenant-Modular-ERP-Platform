from rest_framework import serializers
from decimal import Decimal, InvalidOperation
from apps.module_builder.models import ModuleDefinition, FieldDefinition, DynamicRecord

class FieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldDefinition
        fields = [
            'id', 'module', 'field_name', 'label', 'field_type',
            'is_required', 'default_value', 'options', 'relation_target',
            'order'
        ]
        read_only_fields = ['id']


class ModuleDefinitionSerializer(serializers.ModelSerializer):
    fields = FieldDefinitionSerializer(many=True, read_only=True)
    debit_account_code = serializers.CharField(source='debit_account.code', read_only=True)
    credit_account_code = serializers.CharField(source='credit_account.code', read_only=True)

    class Meta:
        model = ModuleDefinition
        fields = [
            'id', 'name', 'slug', 'display_name', 'description', 'icon',
            'is_active', 'is_financial_module', 'debit_account', 'debit_account_code',
            'credit_account', 'credit_account_code', 'financial_amount_field',
            'fields', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DynamicRecordSerializer(serializers.ModelSerializer):
    module_slug = serializers.CharField(source='module.slug', read_only=True)

    class Meta:
        model = DynamicRecord
        fields = ['id', 'module', 'module_slug', 'data', 'journal_entry', 'created_at', 'updated_at']
        read_only_fields = ['id', 'journal_entry', 'created_at', 'updated_at']

    def validate(self, attrs):
        module = attrs.get('module') or (self.instance.module if self.instance else None)
        data = attrs.get('data', {})

        if not module:
            raise serializers.ValidationError("Module definition is required.")

        field_defs = {f.field_name: f for f in module.fields.all()}
        for fname, fdef in field_defs.items():
            val = data.get(fname)
            if fdef.is_required and (val is None or val == ''):
                raise serializers.ValidationError({fname: f"{fdef.label} is required."})
            if fdef.field_type == FieldDefinition.TYPE_NUMBER and val is not None and val != '':
                try:
                    Decimal(str(val))
                except InvalidOperation:
                    raise serializers.ValidationError({fname: f"{fdef.label} must be a valid numeric amount."})
            if fdef.field_type == FieldDefinition.TYPE_DROPDOWN and val:
                if fdef.options and val not in fdef.options:
                    raise serializers.ValidationError({fname: f"Invalid choice. Allowed: {fdef.options}"})

        return attrs
