# ============================================
# your_project/urls.py (Main Project URLs)
# ============================================

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Swagger/OpenAPI imports
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# ============================================
# SWAGGER/API DOCUMENTATION CONFIGURATION
# ============================================

schema_view = get_schema_view(
    openapi.Info(
        title="Healthcare Management System API",
        default_version='v1.0',
        description="""
        Complete Healthcare Management System API
        
        Features:
        - User Management (Patients, Doctors, Pharmacy)
        - Doctor Profiles & Availability
        - Appointment Booking & Management
        - Medical Documents Upload & Sharing
        - Medication Tracking & Reminders
        - Refill Management
        
        Authentication: JWT Bearer Token
        """,
        terms_of_service="https://www.yourapp.com/terms/",
        contact=openapi.Contact(email="support@healthcare.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

# ============================================
# URL PATTERNS
# ============================================

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # ============================================
    # API ENDPOINTS
    # ============================================
    
    # User Management
    path('api/users/', include('users.urls')),
    
    # Doctor Management
    path('api/doctors/', include('doctor.urls')),
    
    # Appointments
    path('api/appointments/', include('appointments.urls')),
    
    # Medical Documents
    path('api/documents/', include('documents.urls')),
    
    # Medications
    path('api/medications/', include('medications.urls')),
    # for the pharmacy 
    path('api/places/',include('place.urls')),
    
    # ============================================
    # API DOCUMENTATION
    # ============================================
    
    # Swagger UI
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    
    # ReDoc UI
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # OpenAPI JSON
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
]

# ============================================
# MEDIA FILES (Development only)
# ============================================

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

