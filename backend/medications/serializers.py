
from rest_framework import serializers
from .models import (
    Medication, MedicationSchedule, MedicationLog,
    MedicationReminder, MedicationRefill,
)
from datetime import date, datetime, timedelta


class MedicationScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MedicationSchedule
        fields = ['id', 'time', 'dosage_count', 'notes', 'is_active']


class MedicationReminderSerializer(serializers.ModelSerializer):
    reminder_type_display = serializers.CharField(source='get_reminder_type_display', read_only=True)

    class Meta:
        model  = MedicationReminder
        fields = ['id', 'reminder_type', 'reminder_type_display', 'reminder_minutes_before', 'is_enabled', 'created_at']
        read_only_fields = ['created_at']


class MedicationLogSerializer(serializers.ModelSerializer):
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    is_late         = serializers.BooleanField(read_only=True)
    medication_name = serializers.CharField(source='medication.name', read_only=True)

    class Meta:
        model  = MedicationLog
        fields = [
            'id', 'medication', 'medication_name', 'schedule',
            'scheduled_date', 'scheduled_time', 'actual_time',
            'status', 'status_display', 'dosage_taken',
            'notes', 'is_late', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class MedicationSerializer(serializers.ModelSerializer):
    form_display       = serializers.CharField(source='get_form_display', read_only=True)
    frequency_display  = serializers.CharField(source='get_frequency_display', read_only=True)
    prescribed_by_name = serializers.CharField(source='prescribed_by.user.get_full_name', read_only=True)
    is_expired         = serializers.BooleanField(read_only=True)
    schedules          = MedicationScheduleSerializer(many=True, read_only=True)
    reminders          = MedicationReminderSerializer(many=True, read_only=True)
    adherence_rate     = serializers.SerializerMethodField()

    class Meta:
        model  = Medication
        fields = [
            'id', 'patient', 'prescribed_by', 'prescribed_by_name', 'appointment',
            'name', 'generic_name', 'form', 'form_display',
            'dosage', 'frequency', 'frequency_display',
            'start_date', 'end_date', 'duration_days',
            'instructions', 'side_effects',
            'is_active', 'is_expired', 'is_refill_needed',
            'schedules', 'reminders', 'adherence_rate',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['patient', 'is_expired', 'created_at', 'updated_at']

    def get_adherence_rate(self, obj):
        week_ago = date.today() - timedelta(days=7)
        logs  = obj.logs.filter(scheduled_date__gte=week_ago)
        total = logs.count()
        if total == 0:
            return None
        taken = logs.filter(status='TAKEN').count()
        return round((taken / total) * 100, 2)


class CreateMedicationSerializer(serializers.ModelSerializer):
    schedules = MedicationScheduleSerializer(many=True, required=False)

    class Meta:
        model  = Medication
        fields = [
            'prescribed_by', 'appointment', 'name', 'generic_name',
            'form', 'dosage', 'frequency', 'start_date', 'end_date',
            'duration_days', 'instructions', 'side_effects', 'schedules',
        ]

    def validate(self, attrs):
        start_date    = attrs.get('start_date')
        end_date      = attrs.get('end_date')
        duration_days = attrs.get('duration_days')

        if start_date and start_date < date.today():
            raise serializers.ValidationError({'start_date': 'Start date cannot be in the past'})

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'End date must be after start date'})

        # duration_days=1 → single day → end_date == start_date
        # duration_days=7 → 7 days → end_date = start_date + 6 days
        if not end_date and duration_days and start_date:
            attrs['end_date'] = start_date + timedelta(days=duration_days - 1)

        return attrs

    def create(self, validated_data):
        schedules_data = validated_data.pop('schedules', [])
        medication = Medication.objects.create(**validated_data)
        for s in schedules_data:
            MedicationSchedule.objects.create(medication=medication, **s)
        return medication


class UpdateMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Medication
        fields = ['name', 'generic_name', 'form', 'dosage', 'frequency',
                  'end_date', 'instructions', 'side_effects', 'is_active', 'is_refill_needed']


class LogMedicationSerializer(serializers.Serializer):
    """
    Deserialises a log request from the React Native app.

    actual_time: the frontend sends a naive ISO string like "2026-05-17T10:30:00".
    We accept it as a plain CharField and parse it ourselves so Django's
    DateTimeField timezone validation doesn't reject it when USE_TZ=True.
    """
    schedule_id    = serializers.IntegerField(required=False)
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()
    status         = serializers.ChoiceField(choices=['TAKEN', 'MISSED', 'SKIPPED', 'DELAYED'])
    # Accept as raw string to avoid TZ rejection; we normalise below
    actual_time    = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    dosage_taken   = serializers.IntegerField(required=False, allow_null=True)
    notes          = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        raw_time = attrs.get('actual_time')
        parsed   = None

        if raw_time:
            # Strip trailing Z or timezone offset — store as naive datetime
            clean = raw_time.rstrip('Z')
            # Handle "+05:45" style offsets
            for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%d %H:%M:%S'):
                try:
                    parsed = datetime.strptime(clean[:19], '%Y-%m-%dT%H:%M:%S')
                    break
                except ValueError:
                    pass
            if parsed is None:
                parsed = datetime.now()

        if attrs.get('status') == 'TAKEN' and parsed is None:
            parsed = datetime.now()

        attrs['actual_time'] = parsed
        return attrs


class MedicationRefillSerializer(serializers.ModelSerializer):
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    patient_name    = serializers.CharField(source='patient.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.user.get_full_name', read_only=True)

    class Meta:
        model  = MedicationRefill
        fields = [
            'id', 'medication', 'medication_name', 'patient', 'patient_name',
            'requested_date', 'quantity', 'pharmacy_name',
            'status', 'status_display', 'notes',
            'approved_by', 'approved_by_name', 'approved_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['patient', 'requested_date', 'approved_by', 'approved_date', 'created_at', 'updated_at']


class RequestRefillSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MedicationRefill
        fields = ['medication', 'quantity', 'pharmacy_name', 'notes']

    def validate_medication(self, value):
        request = self.context.get('request')
        if request and value.patient != request.user:
            raise serializers.ValidationError('You can only request refills for your own medications')
        return value


class ApproveRefillSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    notes  = serializers.CharField(required=False, allow_blank=True)


class MedicationListSerializer(serializers.ModelSerializer):
    form_display       = serializers.CharField(source='get_form_display', read_only=True)
    frequency_display  = serializers.CharField(source='get_frequency_display', read_only=True)
    prescribed_by_name = serializers.CharField(source='prescribed_by.user.get_full_name', read_only=True)
    next_dose_time     = serializers.SerializerMethodField()

    class Meta:
        model  = Medication
        fields = [
            'id', 'name', 'dosage', 'form', 'form_display',
            'frequency', 'frequency_display', 'prescribed_by_name',
            'start_date', 'end_date', 'is_active', 'is_refill_needed', 'next_dose_time',
        ]

    def get_next_dose_time(self, obj):
        schedules    = obj.schedules.filter(is_active=True).order_by('time')
        current_time = datetime.now().time()
        for s in schedules:
            if s.time > current_time:
                return {'date': date.today().isoformat(), 'time': s.time.strftime('%H:%M')}
        first = schedules.first()
        if first:
            return {
                'date': (date.today() + timedelta(days=1)).isoformat(),
                'time': first.time.strftime('%H:%M'),
            }
        return None


class MedicationStatsSerializer(serializers.Serializer):
    total_medications   = serializers.IntegerField()
    active_medications  = serializers.IntegerField()
    expired_medications = serializers.IntegerField()
    refill_needed       = serializers.IntegerField()
    adherence_rate      = serializers.FloatField()
    doses_taken_today   = serializers.IntegerField()
    doses_missed_today  = serializers.IntegerField()
    upcoming_doses      = serializers.ListField()