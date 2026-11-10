from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.parties.views import PartyViewSet

router = DefaultRouter()
router.register(r'', PartyViewSet, basename='party')

urlpatterns = [
    path('', include(router.urls)),
]
