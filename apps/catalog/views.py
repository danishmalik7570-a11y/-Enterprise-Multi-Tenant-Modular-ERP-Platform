from rest_framework import viewsets, permissions
from apps.catalog.models import Category, Item
from apps.catalog.serializers import CategorySerializer, ItemSerializer
from apps.role_builder.permissions import HasDynamicPermission

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'catalog'

    def get_queryset(self):
        return Category.objects.all().select_related('parent')


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'catalog'

    def get_queryset(self):
        qs = Item.objects.all().select_related('category')
        item_type = self.request.query_params.get('type')
        if item_type:
            qs = qs.filter(type=item_type)
        is_tracked = self.request.query_params.get('is_stock_tracked')
        if is_tracked is not None:
            qs = qs.filter(is_stock_tracked=(is_tracked.lower() == 'true'))
        return qs
