from django.db import models
from django.conf import settings

class DoctorProfile(models.Model):
    """Extended profile for doctors"""
    
    SPECIALIZATION_CHOICES = [
        ('CARDIOLOGY', 'Cardiology'),
        ('DERMATOLOGY', 'Dermatology'),
        ('NEUROLOGY', 'Neurology'),
        ('PEDIATRICS', 'Pediatrics'),
        ('ORTHOPEDICS', 'Orthopedics'),
        ('PSYCHIATRY', 'Psychiatry'),
        ('GENERAL', 'General Medicine'),
        ('ENT', 'ENT Specialist'),
        ('GYNECOLOGY', 'Gynecology'),
        ('ONCOLOGY', 'Oncology'),
        ('OTHER', 'Other'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_profile',
        limit_choices_to={'role': 'DOCTOR'}
    )
    specialization = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES)
    license_number = models.CharField(max_length=50, unique=True)
    qualification = models.CharField(max_length=200, blank=True)
    experience_years = models.PositiveIntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    bio = models.TextField(blank=True, help_text="Brief description about the doctor")
    clinic_address = models.TextField(blank=True)
    is_available = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_patients = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_profiles'
        ordering = ['-rating', '-experience_years']
    
    def __str__(self):
        return f"Dr. {self.user.get_full_name()} - {self.get_specialization_display()}"


class DoctorAvailability(models.Model):
    """Doctor's weekly availability schedule"""
    
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name='availability'
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.PositiveIntegerField(
        default=30,
        help_text="Appointment slot duration in minutes"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'doctor_availability'
        unique_together = ['doctor', 'day_of_week', 'start_time']
        ordering = ['day_of_week', 'start_time']
    
    def __str__(self):
        return f"{self.doctor.user.get_full_name()} - {self.get_day_of_week_display()} ({self.start_time}-{self.end_time})"


class DoctorReview(models.Model):
    """Patient reviews for doctors"""
    
    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_reviews',
        limit_choices_to={'role': 'PATIENT'}
    )
    rating = models.PositiveIntegerField(
        choices=[(i, i) for i in range(1, 6)],
        help_text="Rating from 1 to 5"
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_reviews'
        unique_together = ['doctor', 'patient']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.patient.get_full_name()} → Dr. {self.doctor.user.get_full_name()} ({self.rating}⭐)"
