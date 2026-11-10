from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView
)

from django.views.generic import TemplateView

urlpatterns = [
    # Interactive Frontend Web App
    path('', TemplateView.as_view(template_name='index.html'), name='frontend-index'),

    path('admin/', admin.site.urls),

    # OpenAPI 3 Schema & Interactive Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Modular ERP APIs
    path('api/tenancy/', include('apps.tenancy.urls')),
    path('api/auth/', include('apps.users.urls')),
    path('api/role-builder/', include('apps.role_builder.urls')),
    path('api/parties/', include('apps.parties.urls')),
    path('api/catalog/', include('apps.catalog.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/purchasing/', include('apps.purchasing.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/finance/', include('apps.finance.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/module-builder/', include('apps.module_builder.urls')),
    path('api/extensions/', include('apps.extensions.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static('/assets/', document_root=settings.BASE_DIR / 'frontend' / 'dist' / 'assets')
