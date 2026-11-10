from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.extensions.models import ExtensionRegistry, TenantExtension, ContainerImport
from apps.extensions.serializers import (
    ExtensionRegistrySerializer, TenantExtensionSerializer, ContainerImportSerializer
)

class ExtensionRegistryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ExtensionRegistry.objects.filter(is_available=True)
    serializer_class = ExtensionRegistrySerializer
    permission_classes = [permissions.IsAuthenticated]


class TenantExtensionViewSet(viewsets.ModelViewSet):
    serializer_class = TenantExtensionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TenantExtension.objects.all().select_related('extension')


class ContainerImportViewSet(viewsets.ModelViewSet):
    serializer_class = ContainerImportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ContainerImport.objects.all().select_related('purchase_order')
