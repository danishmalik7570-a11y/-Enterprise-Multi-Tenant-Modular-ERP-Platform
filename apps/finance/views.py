from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.finance.models import Account, JournalEntry, LedgerLine, Payment
from apps.finance.serializers import (
    AccountSerializer, JournalEntrySerializer,
    LedgerLineSerializer, PaymentSerializer
)
from apps.finance.defaults import seed_chart_of_accounts
from apps.role_builder.permissions import HasDynamicPermission

class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'finance'

    def get_queryset(self):
        qs = Account.objects.all()
        acct_type = self.request.query_params.get('type')
        if acct_type:
            qs = qs.filter(type=acct_type)
        return qs

    @action(detail=False, methods=['post'], url_path='seed-default-accounts')
    def seed_coa(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context found"}, status=status.HTTP_400_BAD_REQUEST)
        accounts = seed_chart_of_accounts(request.tenant)
        return Response({
            "message": "Standard Chart of Accounts initialized.",
            "accounts_count": len(accounts)
        })


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'finance'

    def get_queryset(self):
        return JournalEntry.objects.all().prefetch_related('lines__account', 'lines__party')


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'finance'

    def get_queryset(self):
        qs = Payment.objects.all().select_related('party')
        payment_type = self.request.query_params.get('type')
        if payment_type:
            qs = qs.filter(payment_type=payment_type)
        return qs
