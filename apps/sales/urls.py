from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.sales.views import SalesInvoiceViewSet, InvoiceTemplateViewSet

router = DefaultRouter()
router.register(r'invoices', SalesInvoiceViewSet, basename='sales-invoice')
router.register(r'templates', InvoiceTemplateViewSet, basename='invoice-template')


urlpatterns = [
    path('', include(router.urls)),
]
