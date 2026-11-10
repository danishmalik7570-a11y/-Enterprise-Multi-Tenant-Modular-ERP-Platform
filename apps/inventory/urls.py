from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.inventory.views import (
    WarehouseViewSet, StockItemViewSet,
    StockMovementViewSet, BatchViewSet
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet, basename='warehouse')
router.register(r'levels', StockItemViewSet, basename='stock-level')
router.register(r'movements', StockMovementViewSet, basename='stock-movement')
router.register(r'batches', BatchViewSet, basename='batch')

urlpatterns = [
    path('', include(router.urls)),
]
