# ============================================
# appointments/permissions.py
# ============================================

from rest_framework import permissions


class IsPatient(permissions.BasePermission):
    """
    Permission to check if user is a patient
    """
    message = "Only patients can perform this action"
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PATIENT'


class IsDoctor(permissions.BasePermission):
    """
    Permission to check if user is a doctor
    """
    message = "Only doctors can perform this action"
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'DOCTOR'


class IsAppointmentOwner(permissions.BasePermission):
    """
    Permission to check if user is the owner of the appointment
    (either the patient who booked it or the doctor it's with)
    """
    message = "You don't have permission to access this appointment"
    
    def has_object_permission(self, request, view, obj):
        # Patient can access their own appointments
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        # Doctor can access appointments with them
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.doctor == request.user.doctor_profile
        
        # Admin can access all
        if request.user.is_staff:
            return True
        
        return False


class CanCancelAppointment(permissions.BasePermission):
    """
    Permission to check if user can cancel the appointment
    """
    message = "You cannot cancel this appointment"
    
    def has_object_permission(self, request, view, obj):
        # Check if appointment can be cancelled
        if not obj.can_cancel:
            return False
        
        # Patient can cancel their appointments
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        # Doctor can cancel their appointments
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.doctor == request.user.doctor_profile
        
        return False


class CanUpdateAppointment(permissions.BasePermission):
    """
    Permission to check if user can update the appointment
    """
    message = "You cannot update this appointment"
    
    def has_object_permission(self, request, view, obj):
        # Patient can update their upcoming appointments
        if request.user.role == 'PATIENT':
            return obj.patient == request.user and obj.is_upcoming
        
        # Doctor can update their appointments
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.doctor == request.user.doctor_profile
        
        return False