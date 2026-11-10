from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.tenancy.models import Tenant
from apps.tenancy.serializers import TenantSerializer, TenantCreateSerializer
from apps.tenancy.context import unscoped_context

class TenantAdminViewSet(viewsets.ModelViewSet):
    """
    SuperAdmin endpoint for creating and managing tenants.
    Bypasses tenant scoping to manage platform tenants.
    """
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        with unscoped_context():
            return Tenant.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return TenantCreateSerializer
        return TenantSerializer

    @action(detail=True, methods=['post'], url_path='toggle-module')
    def toggle_module(self, request, pk=None):
        tenant = self.get_object()
        module_name = request.data.get('module')
        enable = request.data.get('enable', True)

        if not module_name:
            return Response({"error": "module name required"}, status=status.HTTP_400_BAD_REQUEST)

        if enable:
            tenant.enable_module(module_name)
        else:
            tenant.disable_module(module_name)

        return Response({
            "message": f"Module '{module_name}' {'enabled' if enable else 'disabled'}.",
            "enabled_modules": tenant.enabled_modules
        })


from drf_spectacular.utils import extend_schema

class CurrentTenantView(APIView):
    """Returns details for the currently active tenant in the request context."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: TenantSerializer})
    def get(self, request):
        if not hasattr(request, 'tenant') or not request.tenant:
            return Response({"error": "No active tenant found in context"}, status=status.HTTP_404_NOT_FOUND)
        serializer = TenantSerializer(request.tenant)
        return Response(serializer.data)
