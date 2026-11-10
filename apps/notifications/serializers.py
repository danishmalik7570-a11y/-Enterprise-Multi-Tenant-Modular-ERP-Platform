from rest_framework import serializers
from apps.notifications.models import NotificationRule, NotificationLog

class NotificationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRule
        fields = ['id', 'name', 'trigger_type', 'threshold', 'email_recipient', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = ['id', 'rule', 'title', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
