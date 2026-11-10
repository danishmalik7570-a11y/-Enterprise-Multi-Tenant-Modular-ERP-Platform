from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.parties.models import Party
from apps.parties.serializers import PartySerializer
from apps.role_builder.permissions import HasDynamicPermission

class PartyViewSet(viewsets.ModelViewSet):
    serializer_class = PartySerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'parties'

    def get_queryset(self):
        qs = Party.objects.all()
        party_type = self.request.query_params.get('type')
        if party_type:
            qs = qs.filter(type=party_type)
        return qs

    @action(detail=True, methods=['get'], url_path='ledger')
    def ledger(self, request, pk=None):
        """Returns the complete transaction ledger history for this party."""
        party = self.get_object()
        from apps.finance.models import LedgerLine
        lines = LedgerLine.objects.filter(
            party=party,
            entry__is_posted=True
        ).select_related('entry', 'account').order_by('entry__date', 'entry__id')

        history = []
        running_balance = 0
        for line in lines:
            # Debit increases receivable/decreases payable; Credit decreases receivable/increases payable
            running_balance += (line.debit - line.credit)
            history.append({
                'id': line.id,
                'entry_id': line.entry.id,
                'entry_number': line.entry.entry_number,
                'date': line.entry.date,
                'account': line.account.name,
                'account_code': line.account.code,
                'description': line.description or line.entry.memo,
                'debit': str(line.debit),
                'credit': str(line.credit),
                'running_balance': str(running_balance),
            })

        return Response({
            'party_id': party.id,
            'party_name': party.name,
            'current_balance': str(party.current_balance),
            'ledger_entries': history
        })
