from django.urls import path
from . import views

app_name = 'doctors'

urlpatterns = [
    # Doctor Profile Management
    path('profile/create/', views.CreateDoctorProfileView.as_view(), name='create-profile'),
    path('profile/me/', views.MyDoctorProfileView.as_view(), name='my-profile'),
    path('profile/update/', views.UpdateDoctorProfileView.as_view(), name='update-profile'),
    path('profile/toggle-availability/', views.ToggleAvailabilityView.as_view(), name='toggle-availability'),
    
    # Public Doctor Listing
    path('', views.DoctorListView.as_view(), name='list-doctors'),
    path('<int:id>/', views.DoctorDetailView.as_view(), name='doctor-detail'),
    
    # Availability
    path('availability/add/', views.AddAvailabilityView.as_view(), name='add-availability'),
    path('<int:doctor_id>/availability/', views.DoctorAvailabilityView.as_view(), name='doctor-availability'),
    
    # Reviews
    path('<int:doctor_id>/review/', views.AddReviewView.as_view(), name='add-review'),
]