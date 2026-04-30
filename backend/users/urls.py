from django.urls import path
from . import views
from .views import AdminPatientListView, AdminPatientDetailView,platform_stats


app_name = 'users'

urlpatterns = [
    path('register/', views.register_user, name='register'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('profile/', views.get_user_profile, name='profile'),
    path('profile/update/', views.update_user_profile, name='profile-update'),
    path('users/',AdminPatientListView.as_view(), name='admin-patient-list'),
    path('users/<int:pk>/',AdminPatientDetailView.as_view(), name='admin-patient-detail'),
     path('stats/', views.platform_stats, name='platform-stats'),
]