from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from apps.users.models import TenantUser, AuditLog
from apps.role_builder.serializers import RoleSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class TenantUserSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    role_details = RoleSerializer(source='role', read_only=True)

    class Meta:
        model = TenantUser
        fields = [
            'id', 'user', 'user_id', 'role', 'role_details',
            'is_tenant_admin', 'branch_or_warehouse', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that embeds tenant ID, subdomain, and user role into token payload.
    """
    tenant_subdomain = serializers.CharField(required=False, write_only=True)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Identify tenant from serializer input or user's first tenant membership
        tenant_subdomain = self.initial_data.get('tenant_subdomain')
        membership_qs = TenantUser.objects.filter(user=user, tenant__is_active=True).select_related('tenant', 'role')

        if tenant_subdomain:
            membership = membership_qs.filter(tenant__subdomain=tenant_subdomain.lower()).first()
        else:
            membership = membership_qs.first()

        if membership:
            data['tenant'] = {
                'id': membership.tenant.id,
                'name': membership.tenant.name,
                'subdomain': membership.tenant.subdomain,
                'currency': membership.tenant.currency,
                'enabled_modules': membership.tenant.enabled_modules,
            }
            data['role'] = membership.role.name if membership.role else None
            data['is_tenant_admin'] = membership.is_tenant_admin
            
            # Enrich token payload
            refresh = self.get_token(user)
            refresh['tenant_id'] = membership.tenant.id
            refresh['tenant_subdomain'] = membership.tenant.subdomain
            if membership.role:
                refresh['role'] = membership.role.name
            data['access'] = str(refresh.access_token)
            data['refresh'] = str(refresh)
        
        data['user'] = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
        }
        return data


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_email', 'action', 'module', 'object_id', 'details', 'ip_address', 'created_at']
        read_only_fields = ['id', 'created_at']
