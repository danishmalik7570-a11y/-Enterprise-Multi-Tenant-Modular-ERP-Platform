import jwt
from django.conf import settings
from django.http import JsonResponse
from apps.tenancy.models import Tenant
from apps.tenancy.context import set_current_tenant, reset_current_tenant

class TenantMiddleware:
    """
    Middleware that identifies the tenant for every incoming request via:
    1. 'X-Tenant-ID' or 'X-Tenant-Subdomain' header
    2. Request subdomain (e.g. 'retail.erp.local')
    3. JWT claims ('tenant_id' or 'tenant_subdomain')
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Allow open system routes to pass through without tenant enforcement
        bypass_paths = [
            '/api/schema',
            '/api/auth/token',
            '/api/tenants/admin',
            '/admin/',
            '/favicon.ico',
        ]
        is_bypass_path = any(request.path.startswith(p) for p in bypass_paths)

        tenant = self.resolve_tenant(request)
        token = set_current_tenant(tenant)
        request.tenant = tenant

        if not tenant and not is_bypass_path:
            # Check if this is an API call requiring tenant
            if request.path.startswith('/api/'):
                reset_current_tenant(token)
                return JsonResponse({
                    "detail": "Tenant could not be resolved. Please provide X-Tenant-ID header, X-Tenant-Subdomain header, or tenant subdomain."
                }, status=400)

        try:
            response = self.get_response(request)
        finally:
            reset_current_tenant(token)

        return response

    def resolve_tenant(self, request):
        # 1. Custom Headers
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            try:
                return Tenant.objects.get(id=tenant_id, is_active=True)
            except (Tenant.DoesNotExist, ValueError):
                return None

        tenant_subdomain = request.headers.get('X-Tenant-Subdomain')
        if tenant_subdomain:
            return Tenant.objects.filter(subdomain=tenant_subdomain.lower(), is_active=True).first()

        # 2. Subdomain from host
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        if len(parts) >= 3 and parts[0] not in ('www', 'api', 'localhost', '127'):
            subdomain = parts[0].lower()
            tenant = Tenant.objects.filter(subdomain=subdomain, is_active=True).first()
            if tenant:
                return tenant

        # 3. JWT Claims
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            raw_token = auth_header.split(' ')[1]
            try:
                unverified_payload = jwt.decode(
                    raw_token,
                    options={"verify_signature": False}
                )
                if 'tenant_id' in unverified_payload:
                    return Tenant.objects.filter(id=unverified_payload['tenant_id'], is_active=True).first()
                if 'tenant_subdomain' in unverified_payload:
                    return Tenant.objects.filter(subdomain=unverified_payload['tenant_subdomain'], is_active=True).first()
            except Exception:
                pass

        return None
