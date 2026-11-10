from rest_framework import viewsets, permissions, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from apps.users.models import TenantUser, AuditLog
from apps.users.serializers import (
    UserSerializer, TenantUserSerializer, AuditLogSerializer,
    TenantTokenObtainPairSerializer
)
from apps.role_builder.permissions import HasDynamicPermission

User = get_user_model()

class TenantTokenObtainPairView(TokenObtainPairView):
    serializer_class = TenantTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('email')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Allow creating new user and assigning to tenant
        password = request.data.pop('password', 'DefaultERPPass123!')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(password=password, **serializer.validated_data)
        
        # Link to current tenant if available
        if request.tenant:
            role_id = request.data.get('role_id')
            TenantUser.objects.create(
                tenant=request.tenant,
                user=user,
                role_id=role_id,
                is_tenant_admin=request.data.get('is_tenant_admin', False)
            )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class TenantUserViewSet(viewsets.ModelViewSet):
    serializer_class = TenantUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    permission_module = 'users'

    def get_queryset(self):
        return TenantUser.objects.all().select_related('user', 'role')


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    permission_module = 'users'

    def get_queryset(self):
        return AuditLog.objects.all()


from drf_spectacular.utils import extend_schema, inline_serializer

class CurrentUserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: inline_serializer(
            name='CurrentUserProfileResponse',
            fields={
                'user': UserSerializer(),
                'tenant': serializers.DictField(allow_null=True),
                'role': serializers.CharField(allow_null=True),
                'is_tenant_admin': serializers.BooleanField(),
            }
        )}
    )
    def get(self, request):
        user = request.user
        membership = None
        if request.tenant:
            membership = TenantUser.objects.filter(tenant=request.tenant, user=user).select_related('role').first()

        return Response({
            'user': UserSerializer(user).data,
            'tenant': {
                'id': request.tenant.id,
                'name': request.tenant.name,
                'subdomain': request.tenant.subdomain,
            } if request.tenant else None,
            'role': membership.role.name if membership and membership.role else None,
            'is_tenant_admin': membership.is_tenant_admin if membership else user.is_staff,
        })
