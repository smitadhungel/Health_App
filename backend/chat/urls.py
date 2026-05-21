from django.urls import path
from .views import MedicationChatView

urlpatterns = [
    path('message/', MedicationChatView.as_view(), name='chat-message'),
]