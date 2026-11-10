from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.module_builder.views import ModuleDefinitionViewSet, DynamicRecordViewSet

router = DefaultRouter()
router.register(r'modules', ModuleDefinitionViewSet, basename='module-definition')
router.register(r'records', DynamicRecordViewSet, basename='dynamic-record')

urlpatterns = [
    path('', include(router.urls)),
]
