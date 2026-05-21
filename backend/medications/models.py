from django.db import models
from django.conf import settings
from doctor.models import DoctorProfile
from appointments.models import Appointment
from django.utils import timezone
from datetime import datetime, timedelta

class Medication(models.Model):
    """Medication prescribed to patients"""
    
    FORM_CHOICES = [
        ('TABLET', 'Tablet'),
        ('CAPSULE', 'Capsule'),
        ('SYRUP', 'Syrup'),
        ('INJECTION', 'Injection'),
        ('DROPS', 'Drops'),
        ('INHALER', 'Inhaler'),
        ('OINTMENT', 'Ointment'),
        ('CREAM', 'Cream'),
        ('OTHER', 'Other'),
    ]
    
    FREQUENCY_CHOICES = [
        ('ONCE_DAILY', 'Once a day'),
        ('TWICE_DAILY', 'Twice a day'),
        ('THRICE_DAILY', 'Three times a day'),
        ('FOUR_TIMES_DAILY', 'Four times a day'),
        ('EVERY_4_HOURS', 'Every 4 hours'),
        ('EVERY_6_HOURS', 'Every 6 hours'),
        ('EVERY_8_HOURS', 'Every 8 hours'),
        ('EVERY_12_HOURS', 'Every 12 hours'),
        ('AS_NEEDED', 'As needed'),
        ('WEEKLY', 'Once a week'),
        ('CUSTOM', 'Custom schedule'),
    ]
    
    # Relationships
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medications',
        limit_choices_to={'role': 'PATIENT'}
    )
    prescribed_by = models.ForeignKey(
        DoctorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='prescribed_medications'
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='medications'
    )
    
    # Medication Details
    name = models.CharField(max_length=255, help_text="Medication name")
    generic_name = models.CharField(max_length=255, blank=True)
    form = models.CharField(max_length=50, choices=FORM_CHOICES)
    dosage = models.CharField(max_length=100, help_text="e.g., 500mg, 10ml")
    frequency = models.CharField(max_length=50, choices=FREQUENCY_CHOICES)
    
    # Schedule
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    duration_days = models.PositiveIntegerField(null=True, blank=True)
    
    # Instructions
    instructions = models.TextField(blank=True, help_text="Special instructions (before/after meals, etc.)")
    side_effects = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_refill_needed = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.dosage}) - {self.patient.get_full_name()}"
    
    @property
    def is_expired(self):
        """Check if medication period has ended"""
        from datetime import date
        if self.end_date:
            return self.end_date < date.today()
        return False


class MedicationSchedule(models.Model):
    """Daily schedule for taking medications"""
    
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    time = models.TimeField(help_text="Time to take medication")
    dosage_count = models.PositiveIntegerField(
        default=1,
        help_text="Number of tablets/ml to take"
    )
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'medication_schedules'
        ordering = ['time']
        unique_together = ['medication', 'time']
    
    def __str__(self):
        return f"{self.medication.name} at {self.time.strftime('%I:%M %p')}"


class MedicationLog(models.Model):
    """Track when medications are taken"""
    
    STATUS_CHOICES = [
        ('TAKEN', 'Taken'),
        ('MISSED', 'Missed'),
        ('SKIPPED', 'Skipped'),
        ('DELAYED', 'Delayed'),
    ]
    
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.CASCADE,
        related_name='logs',
        null=True,
        blank=True
    )
    
    # Log Details
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    actual_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    dosage_taken = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medication_logs'
        ordering = ['-scheduled_date', '-scheduled_time']
        indexes = [
            models.Index(fields=['medication', 'scheduled_date']),
            models.Index(fields=['status', 'scheduled_date']),
        ]
        unique_together = ['medication', 'scheduled_date', 'scheduled_time']
    
    def __str__(self):
        return f"{self.medication.name} - {self.scheduled_date} {self.scheduled_time} ({self.status})"
    
    @property
    def is_late(self):
        if self.status == 'TAKEN' and self.actual_time and self.scheduled_time:
            scheduled_datetime = datetime.combine(self.scheduled_date, self.scheduled_time)
            # Ensure both datetimes are naive for comparison
            if timezone.is_aware(self.actual_time):
                actual = timezone.make_naive(self.actual_time)
            else:
                actual = self.actual_time
            return actual > (scheduled_datetime + timedelta(minutes=30))
        return False


class MedicationReminder(models.Model):
    """Reminder settings for medications"""
    
    REMINDER_TYPE_CHOICES = [
        ('PUSH', 'Push Notification'),
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
    ]
    
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    
    # Reminder Settings
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES)
    reminder_minutes_before = models.PositiveIntegerField(
        default=15,
        help_text="Minutes before scheduled time to send reminder"
    )
    is_enabled = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_reminders'
    
    def __str__(self):
        return f"Reminder: {self.medication.name} - {self.reminder_minutes_before}min before"


class MedicationRefill(models.Model):
    """Track medication refills"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('COMPLETED', 'Completed'),
    ]
    
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name='refills'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medication_refills'
    )
    
    # Refill Details
    requested_date = models.DateField(auto_now_add=True)
    quantity = models.PositiveIntegerField()
    pharmacy_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    
    # Approval
    approved_by = models.ForeignKey(
        DoctorProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_refills'
    )
    approved_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medication_refills'
        ordering = ['-requested_date']
    
    def __str__(self):
        return f"Refill: {self.medication.name} - {self.status}"