from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tenancy.views import TenantAdminViewSet, CurrentTenantView

router = DefaultRouter()
router.register(r'admin/tenants', TenantAdminViewSet, basename='tenant-admin')

urlpatterns = [
    path('', include(router.urls)),
    path('current/', CurrentTenantView.as_view(), name='current-tenant'),
]
