from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.module_builder.models import ModuleDefinition, FieldDefinition, DynamicRecord
from apps.module_builder.serializers import (
    ModuleDefinitionSerializer, FieldDefinitionSerializer, DynamicRecordSerializer
)
from apps.role_builder.permissions import HasDynamicPermission

class ModuleDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'module_builder'

    def get_queryset(self):
        return ModuleDefinition.objects.all().prefetch_related('fields')

    @action(detail=True, methods=['get'], url_path='schema')
    def form_schema(self, request, pk=None):
        """
        Returns full low-code UI form schema and column metadata for the custom module.
        """
        module = self.get_object()
        fields_schema = []
        for f in module.fields.all():
            fields_schema.append({
                'field_name': f.field_name,
                'label': f.label,
                'type': f.field_type,
                'required': f.is_required,
                'default': f.default_value,
                'options': f.options,
                'relation_target': f.relation_target,
                'order': f.order,
            })

        return Response({
            'module_id': module.id,
            'name': module.name,
            'slug': module.slug,
            'display_name': module.display_name,
            'icon': module.icon,
            'is_financial': module.is_financial_module,
            'financial_amount_field': module.financial_amount_field,
            'fields': fields_schema,
            'list_columns': [f['field_name'] for f in fields_schema[:4]],
        })

    @action(detail=True, methods=['post'], url_path='add-field')
    def add_field(self, request, pk=None):
        module = self.get_object()
        serializer = FieldDefinitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        field = FieldDefinition.objects.create(
            tenant=request.tenant,
            module=module,
            **serializer.validated_data
        )
        return Response(FieldDefinitionSerializer(field).data, status=status.HTTP_201_CREATED)


class DynamicRecordViewSet(viewsets.ModelViewSet):
    serializer_class = DynamicRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DynamicRecord.objects.all().select_related('module')
        module_slug = self.request.query_params.get('module')
        if module_slug:
            qs = qs.filter(module__slug=module_slug)
        module_id = self.request.query_params.get('module_id')
        if module_id:
            qs = qs.filter(module_id=module_id)
        return qs
