from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.notifications.models import NotificationRule, NotificationLog
from apps.notifications.serializers import NotificationRuleSerializer, NotificationLogSerializer
from apps.notifications.tasks import check_tenant_low_stock, check_tenant_payment_due

class NotificationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationRule.objects.all()

    @action(detail=False, methods=['post'], url_path='trigger-checks')
    def trigger_checks(self, request):
        """Manually trigger background notification evaluation for current tenant."""
        tenant = request.tenant
        if not tenant:
            return Response({"error": "No tenant found"}, status=status.HTTP_400_BAD_REQUEST)

        check_tenant_low_stock.delay(tenant.id)
        check_tenant_payment_due.delay(tenant.id)
        return Response({"message": "Triggered low stock and payment due notification tasks."})


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationLog.objects.all()
