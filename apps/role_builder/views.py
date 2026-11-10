from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.role_builder.models import Role, Permission, RolePermission
from apps.role_builder.serializers import RoleSerializer, PermissionSerializer
from apps.role_builder.presets import seed_starter_roles

class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Role.objects.all().prefetch_related('permissions')

    @action(detail=True, methods=['post'], url_path='clone')
    def clone(self, request, pk=None):
        source_role = self.get_object()
        new_name = request.data.get('name', f"Copy of {source_role.name}")
        
        cloned_role = Role.objects.create(
            tenant=request.tenant,
            name=new_name,
            description=f"Cloned from {source_role.name}",
            is_template=False,
            scope=source_role.scope,
            field_permissions=source_role.field_permissions
        )
        for perm in source_role.permissions.all():
            RolePermission.objects.create(
                tenant=request.tenant,
                role=cloned_role,
                permission=perm
            )

        serializer = self.get_serializer(cloned_role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='seed-starter-roles')
    def seed_defaults(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context found"}, status=status.HTTP_400_BAD_REQUEST)
        roles = seed_starter_roles(request.tenant)
        return Response({
            "message": "Starter roles successfully created.",
            "roles": [r.name for r in roles.values()]
        })


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated]
