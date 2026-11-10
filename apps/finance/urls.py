from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.finance.views import AccountViewSet, JournalEntryViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'journal-entries', JournalEntryViewSet, basename='journal-entry')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]
