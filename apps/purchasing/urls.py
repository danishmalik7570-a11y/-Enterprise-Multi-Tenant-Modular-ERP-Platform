from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.purchasing.views import PurchaseOrderViewSet

router = DefaultRouter()
router.register(r'orders', PurchaseOrderViewSet, basename='purchase-order')

urlpatterns = [
    path('', include(router.urls)),
]
