from rest_framework import serializers
from decimal import Decimal
from apps.finance.models import Account, JournalEntry, LedgerLine, Payment

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = Account
        fields = ['id', 'code', 'name', 'type', 'parent', 'description', 'is_active', 'balance', 'created_at']
        read_only_fields = ['id', 'balance', 'created_at']


class LedgerLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    party_name = serializers.CharField(source='party.name', read_only=True)

    class Meta:
        model = LedgerLine
        fields = [
            'id', 'account', 'account_code', 'account_name',
            'party', 'party_name', 'debit', 'credit', 'description'
        ]
        read_only_fields = ['id']


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = LedgerLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'entry_number', 'date', 'memo', 'source_module',
            'source_reference', 'is_posted', 'lines', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        tenant = self.context['request'].tenant
        return JournalEntry.post_entry(
            tenant=tenant,
            entry_number=validated_data['entry_number'],
            memo=validated_data['memo'],
            lines_data=lines_data,
            date=validated_data.get('date'),
            source_module=validated_data.get('source_module', 'manual'),
            source_reference=validated_data.get('source_reference', '')
        )


class PaymentSerializer(serializers.ModelSerializer):
    party_name = serializers.CharField(source='party.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'party', 'party_name', 'payment_type',
            'payment_method', 'amount', 'date', 'reference', 'notes',
            'journal_entry', 'created_at'
        ]
        read_only_fields = ['id', 'journal_entry', 'created_at']

    def create(self, validated_data):
        tenant = self.context['request'].tenant
        return Payment.record_payment(
            tenant=tenant,
            payment_number=validated_data['payment_number'],
            party=validated_data['party'],
            payment_type=validated_data['payment_type'],
            amount=validated_data['amount'],
            payment_method=validated_data.get('payment_method', Payment.METHOD_BANK),
            date=validated_data.get('date'),
            reference=validated_data.get('reference', ''),
            notes=validated_data.get('notes', '')
        )
