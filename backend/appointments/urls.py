
from django.urls import path
from . import views

app_name = 'appointments'

urlpatterns = [
    # ============================================
    # PATIENT ENDPOINTS
    # ============================================
    
    # Book & Manage Appointments
    path('book/', views.CreateAppointmentView.as_view(), name='book-appointment'),
    path('my-appointments/', views.MyAppointmentsListView.as_view(), name='my-appointments'),
    path('<int:id>/', views.AppointmentDetailView.as_view(), name='appointment-detail'),
    path('<int:id>/update/', views.UpdateAppointmentView.as_view(), name='update-appointment'),
    path('<int:id>/cancel/', views.CancelAppointmentView.as_view(), name='cancel-appointment'),
    path('<int:id>/reschedule/', views.RescheduleAppointmentView.as_view(), name='reschedule-appointment'),
    
    # ============================================
    # DOCTOR ENDPOINTS
    # ============================================
    
    # Doctor's Appointment Management
    path('doctor/appointments/', views.DoctorAppointmentsListView.as_view(), name='doctor-appointments'),
    path('doctor/<int:id>/update/', views.DoctorUpdateAppointmentView.as_view(), name='doctor-update-appointment'),
    path('doctor/<int:id>/complete/', views.CompleteAppointmentView.as_view(), name='complete-appointment'),
    
    # ============================================
    # UTILITY ENDPOINTS
    # ============================================
    
    # Available Slots
    path('available-slots/<int:doctor_id>/', views.AvailableTimeSlotsView.as_view(), name='available-slots'),
]