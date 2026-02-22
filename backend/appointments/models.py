from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings
from doctor.models import DoctorProfile
from datetime import datetime, date, time, timedelta

class Appointment(models.Model):
    """Appointment booking model"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
        ('NO_SHOW', 'No Show'),
    ]
    
    # Relationships
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_appointments',
        limit_choices_to={'role': 'PATIENT'}
    )
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name='doctor_appointments'
    )
    
    # Appointment Details
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    
    # Status & Info
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    reason = models.TextField(help_text="Reason for appointment")
    symptoms = models.TextField(blank=True, help_text="Patient symptoms (optional)")
    
    # Doctor Notes (added after appointment)
    doctor_notes = models.TextField(blank=True)
    prescription = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['-appointment_date', '-appointment_time']
        constraints = [
            # Prevent double-booking at exact same time
            models.UniqueConstraint(
                fields=['doctor', 'appointment_date', 'appointment_time'],
                name='unique_doctor_appointment_slot'
            )
        ]
        indexes = [
            models.Index(fields=['doctor', 'appointment_date', 'status']),
            models.Index(fields=['patient', 'appointment_date']),
        ]
    
    def __str__(self):
        return f"{self.patient.get_full_name()} → Dr. {self.doctor.user.get_full_name()} ({self.appointment_date} {self.appointment_time})"
    
    def clean(self):
        """Prevent overlapping appointments for the same doctor (if durations vary)."""
        if self.status in ['CANCELLED', 'COMPLETED']:
            return  # Skip validation for non-active appointments
        
        # Calculate end time
        start_datetime = datetime.combine(self.appointment_date, self.appointment_time)
        end_datetime = start_datetime + timedelta(minutes=self.duration_minutes)
        
        # Find any overlapping confirmed/pending appointments for the same doctor
        overlapping = Appointment.objects.filter(
            doctor=self.doctor,
            appointment_date=self.appointment_date,
            status__in=['PENDING', 'CONFIRMED']
        ).exclude(pk=self.pk)
        
        for apt in overlapping:
            apt_start = datetime.combine(apt.appointment_date, apt.appointment_time)
            apt_end = apt_start + timedelta(minutes=apt.duration_minutes)
            
            if (start_datetime < apt_end and end_datetime > apt_start):
                raise ValidationError(
                    f"Appointment overlaps with existing appointment from "
                    f"{apt.appointment_time} (duration {apt.duration_minutes} mins)."
                )
    
    @property
    def is_upcoming(self):
        """Check if appointment is in the future"""
        now = datetime.now()
        appointment_datetime = datetime.combine(self.appointment_date, self.appointment_time)
        return appointment_datetime > now and self.status in ['PENDING', 'CONFIRMED']
    
    @property
    def can_cancel(self):
        """Check if appointment can be cancelled"""
        return self.status in ['PENDING', 'CONFIRMED'] and self.is_upcoming


class AppointmentHistory(models.Model):
    """Track changes to appointments"""
    
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='history'
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20, blank=True)
    old_date = models.DateField(null=True, blank=True)
    new_date = models.DateField(null=True, blank=True)
    old_time = models.TimeField(null=True, blank=True)
    new_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'appointment_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['appointment', 'created_at']),
        ]
    
    def __str__(self):
        return f"History: Appointment #{self.appointment.id} - {self.created_at}"