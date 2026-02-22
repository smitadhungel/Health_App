from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.crypto import get_random_string
from doctor.models import DoctorProfile
import os

def medical_document_upload_path(instance, filename):
    """Generate upload path for medical documents"""
    return f'medical_documents/{instance.patient.id}/{instance.category}/{filename}'


class MedicalDocument(models.Model):
    """Medical documents uploaded by patients"""
    
    CATEGORY_CHOICES = [
        ('LAB_REPORT', 'Lab Report'),
        ('PRESCRIPTION', 'Prescription'),
        ('SCAN', 'Scan/X-ray'),
        ('MRI', 'MRI'),
        ('CT_SCAN', 'CT Scan'),
        ('BLOOD_TEST', 'Blood Test'),
        ('VACCINATION', 'Vaccination Record'),
        ('DISCHARGE_SUMMARY', 'Discharge Summary'),
        ('MEDICAL_CERTIFICATE', 'Medical Certificate'),
        ('OTHER', 'Other'),
    ]
    
    # Relationships
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medical_documents',
        limit_choices_to={'role': 'PATIENT'}
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    
    # Document Details
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    file = models.FileField(upload_to=medical_document_upload_path)
    file_size = models.PositiveIntegerField(help_text="File size in bytes", editable=False)
    file_type = models.CharField(max_length=50, blank=True, editable=False)
    
    # Optional Details
    description = models.TextField(blank=True)
    document_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Date when the document was created/issued"
    )
    
    # Sharing & Access
    shared_with_doctors = models.ManyToManyField(
        DoctorProfile,
        related_name='accessible_documents',
        blank=True
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medical_documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', 'category']),
            models.Index(fields=['created_at']),
            # models.Index(fields=['patient', 'shared_with_doctors']),  # for doctor queries
        ]
    
    def __str__(self):
        return f"{self.title} - {self.patient.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Auto-populate file_size and file_type from the file
        if self.file and not self.file_size:
            self.file_size = self.file.size
            # Get file extension as simple file_type
            self.file_type = os.path.splitext(self.file.name)[1].lower()
        super().save(*args, **kwargs)
    
    @property
    def file_extension(self):
        return os.path.splitext(self.file.name)[1]
    
    def delete(self, *args, **kwargs):
        # Use Django's storage to delete the file (works with cloud storages)
        if self.file:
            storage = self.file.storage
            if storage.exists(self.file.name):
                storage.delete(self.file.name)
        super().delete(*args, **kwargs)


class DocumentShare(models.Model):
    """Track document sharing with family/doctors"""
    
    SHARE_METHOD_CHOICES = [
        ('EMAIL', 'Email'),
        ('WHATSAPP', 'WhatsApp'),
        ('LINK', 'Shareable Link'),
    ]
    
    document = models.ForeignKey(
        MedicalDocument,
        on_delete=models.CASCADE,
        related_name='shares'
    )
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='document_shares'
    )
    shared_with_email = models.EmailField(blank=True)
    shared_with_phone = models.CharField(max_length=15, blank=True)
    share_method = models.CharField(max_length=20, choices=SHARE_METHOD_CHOICES)
    share_token = models.CharField(max_length=100, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    accessed_count = models.PositiveIntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_shares'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['share_token']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Share: {self.document.title} via {self.share_method}"
    
    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = self.generate_unique_token()
        # Validate that at least one contact method is provided based on share_method
        if self.share_method == 'EMAIL' and not self.shared_with_email:
            raise ValidationError("Email is required for email sharing.")
        if self.share_method == 'WHATSAPP' and not self.shared_with_phone:
            raise ValidationError("Phone number is required for WhatsApp sharing.")
        super().save(*args, **kwargs)
    
    def generate_unique_token(self):
        """Generate a unique token for the share link."""
        while True:
            token = get_random_string(64)
            if not DocumentShare.objects.filter(share_token=token).exists():
                return token


class DocumentAccessLog(models.Model):
    """Audit log for document access (HIPAA compliance)"""
    
    ACTION_CHOICES = [
        ('VIEW', 'Viewed'),
        ('DOWNLOAD', 'Downloaded'),
        ('SHARE', 'Shared'),
        ('DELETE', 'Deleted'),
        ('UPDATE', 'Updated'),
    ]
    
    document = models.ForeignKey(
        MedicalDocument,
        on_delete=models.CASCADE,
        related_name='access_logs'
    )
    accessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='document_accesses'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_access_logs'
        ordering = ['-accessed_at']
        indexes = [
            models.Index(fields=['document', 'accessed_at']),
            models.Index(fields=['accessed_by', 'accessed_at']),
        ]
    
    def __str__(self):
        user = self.accessed_by.get_full_name() if self.accessed_by else 'Unknown'
        return f"{user} {self.action} {self.document.title}"