# ============================================
# medications/serializers.py
# ============================================

from rest_framework import serializers
from .models import (
    Medication, MedicationSchedule, MedicationLog,
    MedicationReminder, MedicationRefill
)
from datetime import date, datetime, timedelta


class MedicationScheduleSerializer(serializers.ModelSerializer):
    """Serializer for medication schedules"""
    
    class Meta:
        model = MedicationSchedule
        fields = [
            'id', 'time', 'dosage_count', 'notes', 'is_active'
        ]


class MedicationReminderSerializer(serializers.ModelSerializer):
    """Serializer for medication reminders"""
    reminder_type_display = serializers.CharField(
        source='get_reminder_type_display',
        read_only=True
    )
    
    class Meta:
        model = MedicationReminder
        fields = [
            'id', 'reminder_type', 'reminder_type_display',
            'reminder_minutes_before', 'is_enabled', 'created_at'
        ]
        read_only_fields = ['created_at']


class MedicationLogSerializer(serializers.ModelSerializer):
    """Serializer for medication logs"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_late = serializers.BooleanField(read_only=True)
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    
    class Meta:
        model = MedicationLog
        fields = [
            'id', 'medication', 'medication_name', 'schedule',
            'scheduled_date', 'scheduled_time', 'actual_time',
            'status', 'status_display', 'dosage_taken',
            'notes', 'is_late', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class MedicationSerializer(serializers.ModelSerializer):
    """Complete medication serializer"""
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    prescribed_by_name = serializers.CharField(
        source='prescribed_by.user.get_full_name',
        read_only=True
    )
    is_expired = serializers.BooleanField(read_only=True)
    schedules = MedicationScheduleSerializer(many=True, read_only=True)
    reminders = MedicationReminderSerializer(many=True, read_only=True)
    adherence_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Medication
        fields = [
            'id', 'patient', 'prescribed_by', 'prescribed_by_name', 'appointment',
            'name', 'generic_name', 'form', 'form_display',
            'dosage', 'frequency', 'frequency_display',
            'start_date', 'end_date', 'duration_days',
            'instructions', 'side_effects',
            'is_active', 'is_expired', 'is_refill_needed',
            'schedules', 'reminders', 'adherence_rate',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['patient', 'is_expired', 'created_at', 'updated_at']
    
    def get_adherence_rate(self, obj):
        """Calculate adherence rate (percentage of doses taken)"""
        # Get logs from the last 7 days
        week_ago = date.today() - timedelta(days=7)
        logs = obj.logs.filter(scheduled_date__gte=week_ago)
        
        if not logs.exists():
            return None
        
        total = logs.count()
        taken = logs.filter(status='TAKEN').count()
        
        return round((taken / total) * 100, 2) if total > 0 else 0


class CreateMedicationSerializer(serializers.ModelSerializer):
    """Serializer for creating medications"""
    schedules = MedicationScheduleSerializer(many=True, required=False)
    
    class Meta:
        model = Medication
        fields = [
            'prescribed_by', 'appointment', 'name', 'generic_name',
            'form', 'dosage', 'frequency', 'start_date', 'end_date',
            'duration_days', 'instructions', 'side_effects',
            'schedules'
        ]
    
    def validate(self, attrs):
        """Validate medication data"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        duration_days = attrs.get('duration_days')
        
        # Validate dates
        if start_date and start_date < date.today():
            raise serializers.ValidationError(
                {"start_date": "Start date cannot be in the past"}
            )
        
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date"}
            )
        
        # Calculate end_date from duration if not provided
        if not end_date and duration_days:
            attrs['end_date'] = start_date + timedelta(days=duration_days)
        
        return attrs
    
    def create(self, validated_data):
        """Create medication with schedules"""
        schedules_data = validated_data.pop('schedules', [])
        medication = Medication.objects.create(**validated_data)
        
        # Create schedules
        for schedule_data in schedules_data:
            MedicationSchedule.objects.create(
                medication=medication,
                **schedule_data
            )
        
        return medication


class UpdateMedicationSerializer(serializers.ModelSerializer):
    """Serializer for updating medication"""
    
    class Meta:
        model = Medication
        fields = [
            'name', 'generic_name', 'form', 'dosage',
            'frequency', 'end_date', 'instructions',
            'side_effects', 'is_active', 'is_refill_needed'
        ]


class LogMedicationSerializer(serializers.Serializer):
    """Serializer for logging medication intake"""
    schedule_id = serializers.IntegerField(required=False)
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()
    status = serializers.ChoiceField(
        choices=['TAKEN', 'MISSED', 'SKIPPED', 'DELAYED']
    )
    actual_time = serializers.DateTimeField(required=False, allow_null=True)
    dosage_taken = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate log data"""
        status = attrs.get('status')
        actual_time = attrs.get('actual_time')
        
        # If taken, actual_time is required
        if status == 'TAKEN' and not actual_time:
            attrs['actual_time'] = datetime.now()
        
        return attrs


class MedicationRefillSerializer(serializers.ModelSerializer):
    """Serializer for medication refills"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(
        source='approved_by.user.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = MedicationRefill
        fields = [
            'id', 'medication', 'medication_name', 'patient', 'patient_name',
            'requested_date', 'quantity', 'pharmacy_name',
            'status', 'status_display', 'notes',
            'approved_by', 'approved_by_name', 'approved_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'patient', 'requested_date', 'approved_by',
            'approved_date', 'created_at', 'updated_at'
        ]


class RequestRefillSerializer(serializers.ModelSerializer):
    """Serializer for requesting medication refills"""
    
    class Meta:
        model = MedicationRefill
        fields = ['medication', 'quantity', 'pharmacy_name', 'notes']
    
    def validate_medication(self, value):
        """Validate medication belongs to patient"""
        request = self.context.get('request')
        if request and value.patient != request.user:
            raise serializers.ValidationError(
                "You can only request refills for your own medications"
            )
        return value


class ApproveRefillSerializer(serializers.Serializer):
    """Serializer for doctor approving/rejecting refills"""
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    notes = serializers.CharField(required=False, allow_blank=True)


class MedicationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing medications"""
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    prescribed_by_name = serializers.CharField(
        source='prescribed_by.user.get_full_name',
        read_only=True
    )
    next_dose_time = serializers.SerializerMethodField()
    
    class Meta:
        model = Medication
        fields = [
            'id', 'name', 'dosage', 'form', 'form_display',
            'frequency', 'frequency_display', 'prescribed_by_name',
            'start_date', 'end_date', 'is_active',
            'is_refill_needed', 'next_dose_time'
        ]
    
    def get_next_dose_time(self, obj):
        """Get next scheduled dose time"""
        from datetime import datetime, time as dt_time
        
        # Get active schedules
        schedules = obj.schedules.filter(is_active=True).order_by('time')
        
        if not schedules.exists():
            return None
        
        now = datetime.now()
        current_time = now.time()
        
        # Find next dose today
        for schedule in schedules:
            if schedule.time > current_time:
                return {
                    'date': date.today().isoformat(),
                    'time': schedule.time.strftime('%H:%M')
                }
        
        # If no more doses today, get first dose tomorrow
        if schedules.exists():
            return {
                'date': (date.today() + timedelta(days=1)).isoformat(),
                'time': schedules.first().time.strftime('%H:%M')
            }
        
        return None


class MedicationStatsSerializer(serializers.Serializer):
    """Serializer for medication statistics"""
    total_medications = serializers.IntegerField()
    active_medications = serializers.IntegerField()
    expired_medications = serializers.IntegerField()
    refill_needed = serializers.IntegerField()
    adherence_rate = serializers.FloatField()
    doses_taken_today = serializers.IntegerField()
    doses_missed_today = serializers.IntegerField()
    upcoming_doses = serializers.ListField()


class CreateMedicationSerializer(serializers.ModelSerializer):
    """Serializer for creating medications"""
    schedules = MedicationScheduleSerializer(many=True, required=False)
    
    class Meta:
        model = Medication
        fields = [
            'prescribed_by', 'appointment', 'name', 'generic_name',
            'form', 'dosage', 'frequency', 'start_date', 'end_date',
            'duration_days', 'instructions', 'side_effects',
            'schedules'
        ]
    
    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        medication = Medication.objects.create(**validated_data)
        # ... create schedules
        return medication