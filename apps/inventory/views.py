from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.inventory.models import Warehouse, StockItem, StockMovement, Batch
from apps.inventory.serializers import (
    WarehouseSerializer, StockItemSerializer,
    StockMovementSerializer, BatchSerializer
)
from apps.role_builder.permissions import HasDynamicPermission

class WarehouseViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'inventory'

    def get_queryset(self):
        return Warehouse.objects.all()


class StockItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'inventory'

    def get_queryset(self):
        qs = StockItem.objects.all().select_related('warehouse', 'item')
        warehouse_id = self.request.query_params.get('warehouse')
        if warehouse_id:
            qs = qs.filter(warehouse_id=warehouse_id)
        item_id = self.request.query_params.get('item')
        if item_id:
            qs = qs.filter(item_id=item_id)
        return qs


class StockMovementViewSet(viewsets.ModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'inventory'

    def get_queryset(self):
        qs = StockMovement.objects.all().select_related('item', 'warehouse')
        movement_type = self.request.query_params.get('type')
        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        return qs


class BatchViewSet(viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'inventory'

    def get_queryset(self):
        return Batch.objects.all().select_related('item')
