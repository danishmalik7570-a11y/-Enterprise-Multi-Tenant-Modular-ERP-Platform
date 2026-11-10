from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.notifications.views import NotificationRuleViewSet, NotificationLogViewSet

router = DefaultRouter()
router.register(r'rules', NotificationRuleViewSet, basename='notification-rule')
router.register(r'logs', NotificationLogViewSet, basename='notification-log')

urlpatterns = [
    path('', include(router.urls)),
]
