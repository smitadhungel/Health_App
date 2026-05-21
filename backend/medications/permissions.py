# ============================================
# medications/permissions.py
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


class IsMedicationOwner(permissions.BasePermission):
    """
    Permission to check if user is the owner of the medication
    (the patient it's prescribed to) or the doctor who prescribed it
    """
    message = "You don't have permission to access this medication"
    
    def has_object_permission(self, request, view, obj):
        # Patient can access their own medications
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        # Doctor can access medications they prescribed
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.prescribed_by == request.user.doctor_profile
        
        # Admin can access all
        if request.user.is_staff:
            return True
        
        return False


class CanModifyMedication(permissions.BasePermission):
    """
    Permission to check if user can modify the medication
    Both patient and prescribing doctor can modify
    """
    message = "You cannot modify this medication"
    
    def has_object_permission(self, request, view, obj):
        # Patient can modify their own medications
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        # Doctor can modify medications they prescribed
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.prescribed_by == request.user.doctor_profile
        
        return False


class CanLogMedication(permissions.BasePermission):
    """
    Permission to check if user can log medication intake
    Only the patient can log their own medications
    """
    message = "Only the patient can log medication intake"
    
    def has_object_permission(self, request, view, obj):
        # Only the patient can log their medications
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        return False


class CanRequestRefill(permissions.BasePermission):
    """
    Permission to check if user can request medication refill
    Only the patient can request refills for their medications
    """
    message = "Only the patient can request medication refills"
    
    def has_object_permission(self, request, view, obj):
        # Only the patient can request refills
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        return False


class CanApproveRefill(permissions.BasePermission):
    """
    Permission to check if doctor can approve refill
    Only the prescribing doctor can approve refills
    """
    message = "Only the prescribing doctor can approve this refill"
    
    def has_object_permission(self, request, view, obj):
        # Only the prescribing doctor can approve
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.medication.prescribed_by == request.user.doctor_profile
        
        return False