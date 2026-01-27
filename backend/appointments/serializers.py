# ============================================
# appointments/serializers.py
# ============================================

from rest_framework import serializers
from .models import Appointment, AppointmentHistory
from doctor.models import DoctorProfile
from datetime import datetime, date, time, timedelta


class DoctorBasicSerializer(serializers.ModelSerializer):
    """Basic doctor info for appointments"""
    doctor_name = serializers.CharField(source='user.get_full_name', read_only=True)
    specialization_display = serializers.CharField(source='get_specialization_display', read_only=True)
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'doctor_name', 'specialization', 'specialization_display',
            'consultation_fee', 'clinic_address'
        ]


class PatientBasicSerializer(serializers.Serializer):
    """Basic patient info for appointments"""
    id = serializers.IntegerField(read_only=True)
    patient_name = serializers.CharField(source='get_full_name', read_only=True)
    email = serializers.EmailField(read_only=True)
    phone_number = serializers.CharField(read_only=True)


class AppointmentHistorySerializer(serializers.ModelSerializer):
    """Serializer for appointment history"""
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    
    class Meta:
        model = AppointmentHistory
        fields = [
            'id', 'changed_by', 'changed_by_name',
            'old_status', 'new_status',
            'old_date', 'new_date',
            'old_time', 'new_time',
            'notes', 'created_at'
        ]
        read_only_fields = ['created_at']


class AppointmentSerializer(serializers.ModelSerializer):
    """Complete appointment serializer with all details"""
    patient_details = PatientBasicSerializer(source='patient', read_only=True)
    doctor_details = DoctorBasicSerializer(source='doctor', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    history = AppointmentHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'doctor', 'appointment_date', 'appointment_time',
            'duration_minutes', 'status', 'status_display',
            'reason', 'symptoms', 'doctor_notes', 'prescription',
            'is_upcoming', 'can_cancel',
            'patient_details', 'doctor_details',
            'history', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'patient', 'status', 'doctor_notes', 'prescription',
            'created_at', 'updated_at'
        ]


class CreateAppointmentSerializer(serializers.ModelSerializer):
    """Serializer for creating appointments"""
    
    class Meta:
        model = Appointment
        fields = [
            'doctor', 'appointment_date', 'appointment_time',
            'duration_minutes', 'reason', 'symptoms'
        ]
    
    def validate_appointment_date(self, value):
        """Validate appointment date is not in the past"""
        if value < date.today():
            raise serializers.ValidationError("Cannot book appointments in the past")
        return value
    
    def validate(self, attrs):
        """Validate appointment booking"""
        doctor = attrs.get('doctor')
        appointment_date = attrs.get('appointment_date')
        appointment_time = attrs.get('appointment_time')
        
        # Check if doctor is available
        if not doctor.is_available:
            raise serializers.ValidationError(
                {"doctor": "This doctor is currently unavailable"}
            )
        
        # Check if appointment is in the past
        appointment_datetime = datetime.combine(appointment_date, appointment_time)
        if appointment_datetime < datetime.now():
            raise serializers.ValidationError(
                {"appointment_time": "Cannot book appointments in the past"}
            )
        
        # Check if slot is already booked
        existing = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status__in=['PENDING', 'CONFIRMED']
        ).exists()
        
        if existing:
            raise serializers.ValidationError(
                {"appointment_time": "This time slot is already booked"}
            )
        
        # Check if doctor has availability on this day
        day_of_week = appointment_date.weekday()
        has_availability = doctor.availability.filter(
            day_of_week=day_of_week,
            is_active=True,
            start_time__lte=appointment_time,
            end_time__gte=appointment_time
        ).exists()
        
        if not has_availability:
            raise serializers.ValidationError(
                {"appointment_time": "Doctor is not available at this time"}
            )
        
        return attrs


class UpdateAppointmentSerializer(serializers.ModelSerializer):
    """Serializer for updating appointment (patient can update reason/symptoms)"""
    
    class Meta:
        model = Appointment
        fields = ['reason', 'symptoms']


class RescheduleAppointmentSerializer(serializers.Serializer):
    """Serializer for rescheduling appointments"""
    new_date = serializers.DateField()
    new_time = serializers.TimeField()
    
    def validate_new_date(self, value):
        """Validate new date is not in the past"""
        if value < date.today():
            raise serializers.ValidationError("Cannot reschedule to a past date")
        return value
    
    def validate(self, attrs):
        """Validate rescheduling"""
        new_date = attrs.get('new_date')
        new_time = attrs.get('new_time')
        
        # Check if new datetime is in the past
        new_datetime = datetime.combine(new_date, new_time)
        if new_datetime < datetime.now():
            raise serializers.ValidationError(
                {"new_time": "Cannot reschedule to a past time"}
            )
        
        return attrs


class DoctorUpdateAppointmentSerializer(serializers.ModelSerializer):
    """Serializer for doctor to update appointment (notes, prescription, status)"""
    
    class Meta:
        model = Appointment
        fields = ['status', 'doctor_notes', 'prescription']
    
    def validate_status(self, value):
        """Validate status transitions"""
        if self.instance:
            current_status = self.instance.status
            
            # Can't change from COMPLETED or CANCELLED
            if current_status in ['COMPLETED', 'CANCELLED']:
                raise serializers.ValidationError(
                    f"Cannot change status from {current_status}"
                )
            
            # Valid transitions
            valid_transitions = {
                'PENDING': ['CONFIRMED', 'CANCELLED'],
                'CONFIRMED': ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
            }
            
            if current_status in valid_transitions:
                if value not in valid_transitions[current_status]:
                    raise serializers.ValidationError(
                        f"Cannot change status from {current_status} to {value}"
                    )
        
        return value


class AppointmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing appointments"""
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)
    doctor_specialization = serializers.CharField(
        source='doctor.get_specialization_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'patient_name', 'doctor_name', 'doctor_specialization',
            'appointment_date', 'appointment_time', 'duration_minutes',
            'status', 'status_display', 'is_upcoming', 'reason'
        ]