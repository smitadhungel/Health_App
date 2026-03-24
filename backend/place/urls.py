from django.urls import path
from .views import NearbyPlacesView

urlpatterns = [
    # ...
    path('api/places/nearby/', NearbyPlacesView.as_view(), name='nearby-places'),
]