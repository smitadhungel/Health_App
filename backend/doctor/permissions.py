from rest_framework import permissions


class IsDoctor(permissions.BasePermission):
    """Only doctors can access"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'DOCTOR'


class IsPatient(permissions.BasePermission):
    """Only patients can access"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PATIENT'


class IsDoctorOwner(permissions.BasePermission):
    """Check if user is the owner of the doctor profile"""
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
