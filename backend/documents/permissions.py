# ============================================
# documents/permissions.py
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


class IsDocumentOwner(permissions.BasePermission):
    """
    Permission to check if user is the owner of the document
    (the patient who uploaded it) or has access to it (doctor it's shared with)
    """
    message = "You don't have permission to access this document"
    
    def has_object_permission(self, request, view, obj):
        # Patient can access their own documents
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        # Doctor can access documents shared with them
        if request.user.role == 'DOCTOR' and hasattr(request.user, 'doctor_profile'):
            return obj.shared_with_doctors.filter(
                id=request.user.doctor_profile.id
            ).exists()
        
        # Admin can access all
        if request.user.is_staff:
            return True
        
        return False


class CanModifyDocument(permissions.BasePermission):
    """
    Permission to check if user can modify the document
    Only the patient who owns the document can modify it
    """
    message = "Only the document owner can modify this document"
    
    def has_object_permission(self, request, view, obj):
        # Only the patient who owns the document can modify
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        return False


class CanShareDocument(permissions.BasePermission):
    """
    Permission to check if user can share the document
    Only the patient who owns the document can share it
    """
    message = "Only the document owner can share this document"
    
    def has_object_permission(self, request, view, obj):
        # Only the patient who owns the document can share
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        return False


class CanViewDocumentLogs(permissions.BasePermission):
    """
    Permission to check if user can view document access logs
    Only the patient who owns the document can view logs
    """
    message = "Only the document owner can view access logs"
    
    def has_object_permission(self, request, view, obj):
        # Only the patient who owns the document can view logs
        if request.user.role == 'PATIENT':
            return obj.patient == request.user
        
        return False