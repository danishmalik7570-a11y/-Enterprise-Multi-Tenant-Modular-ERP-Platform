from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem
from apps.purchasing.serializers import PurchaseOrderSerializer, PurchaseOrderItemSerializer
from apps.role_builder.permissions import HasDynamicPermission

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'purchasing'

    def get_queryset(self):
        return PurchaseOrder.objects.all().prefetch_related('items__item').select_related('supplier', 'warehouse')

    @action(detail=True, methods=['post'], url_path='receive')
    def receive(self, request, pk=None):
        po = self.get_object()
        try:
            po.receive_and_post()
            return Response({
                "message": f"Purchase Order {po.order_number} received, stock updated and ledger entry posted.",
                "status": po.status,
                "journal_entry_id": po.journal_entry_id
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
