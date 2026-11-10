from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.extensions.views import (
    ExtensionRegistryViewSet, TenantExtensionViewSet, ContainerImportViewSet
)

router = DefaultRouter()
router.register(r'registry', ExtensionRegistryViewSet, basename='extension-registry')
router.register(r'installations', TenantExtensionViewSet, basename='extension-installation')
router.register(r'containers', ContainerImportViewSet, basename='container-import')

urlpatterns = [
    path('', include(router.urls)),
]
