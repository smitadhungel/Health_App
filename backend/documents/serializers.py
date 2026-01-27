# ============================================
# documents/serializers.py
# ============================================

from rest_framework import serializers
from .models import MedicalDocument, DocumentShare, DocumentAccessLog
from doctor.models import DoctorProfile
import os


class DocumentAccessLogSerializer(serializers.ModelSerializer):
    """Serializer for document access logs"""
    accessed_by_name = serializers.CharField(
        source='accessed_by.get_full_name', 
        read_only=True
    )
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = DocumentAccessLog
        fields = [
            'id', 'accessed_by', 'accessed_by_name',
            'action', 'action_display', 'ip_address',
            'accessed_at'
        ]
        read_only_fields = ['accessed_at']


class DocumentShareSerializer(serializers.ModelSerializer):
    """Serializer for document sharing"""
    shared_by_name = serializers.CharField(
        source='shared_by.get_full_name',
        read_only=True
    )
    share_method_display = serializers.CharField(
        source='get_share_method_display',
        read_only=True
    )
    document_title = serializers.CharField(source='document.title', read_only=True)
    
    class Meta:
        model = DocumentShare
        fields = [
            'id', 'document', 'document_title', 'shared_by', 'shared_by_name',
            'shared_with_email', 'shared_with_phone',
            'share_method', 'share_method_display',
            'share_token', 'is_active', 'expires_at',
            'accessed_count', 'last_accessed_at', 'created_at'
        ]
        read_only_fields = [
            'shared_by', 'share_token', 'accessed_count',
            'last_accessed_at', 'created_at'
        ]


class MedicalDocumentSerializer(serializers.ModelSerializer):
    """Complete serializer for medical documents"""
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    file_extension = serializers.CharField(read_only=True)
    file_url = serializers.SerializerMethodField()
    shares = DocumentShareSerializer(many=True, read_only=True)
    access_logs = DocumentAccessLogSerializer(many=True, read_only=True)
    shared_doctors = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalDocument
        fields = [
            'id', 'patient', 'patient_name', 'uploaded_by', 'uploaded_by_name',
            'title', 'category', 'category_display', 'file', 'file_url',
            'file_size', 'file_type', 'file_extension',
            'description', 'document_date',
            'is_shared_with_doctor', 'shared_with_doctors', 'shared_doctors',
            'shares', 'access_logs',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'patient', 'uploaded_by', 'file_size', 'file_type',
            'created_at', 'updated_at'
        ]
    
    def get_file_url(self, obj):
        """Get full URL for file"""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None
    
    def get_shared_doctors(self, obj):
        """Get list of doctors this document is shared with"""
        doctors = obj.shared_with_doctors.all()
        return [
            {
                'id': doctor.id,
                'name': doctor.user.get_full_name(),
                'specialization': doctor.get_specialization_display()
            }
            for doctor in doctors
        ]


class UploadDocumentSerializer(serializers.ModelSerializer):
    """Serializer for uploading documents"""
    
    class Meta:
        model = MedicalDocument
        fields = [
            'title', 'category', 'file', 'description', 'document_date'
        ]
    
    def validate_file(self, value):
        """Validate uploaded file"""
        # Maximum file size: 10MB
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size cannot exceed 10MB. Current size: {value.size / (1024*1024):.2f}MB"
            )
        
        # Allowed file types
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
        allowed_content_types = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        
        # Get file extension
        ext = os.path.splitext(value.name)[1].lower()
        
        # Validate extension
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Validate content type
        if value.content_type not in allowed_content_types:
            raise serializers.ValidationError(
                f"Invalid file type. File type detected: {value.content_type}"
            )
        
        return value
    
    def create(self, validated_data):
        """Create document with metadata"""
        file = validated_data['file']
        validated_data['file_size'] = file.size
        validated_data['file_type'] = file.content_type
        return super().create(validated_data)


class UpdateDocumentSerializer(serializers.ModelSerializer):
    """Serializer for updating document details (not the file)"""
    
    class Meta:
        model = MedicalDocument
        fields = ['title', 'category', 'description', 'document_date']


class ShareDocumentSerializer(serializers.Serializer):
    """Serializer for sharing documents"""
    share_method = serializers.ChoiceField(
        choices=['EMAIL', 'WHATSAPP', 'LINK']
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=15)
    expires_in_days = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=365,
        default=7,
        help_text="Number of days until share link expires"
    )
    
    def validate(self, attrs):
        """Validate sharing data"""
        share_method = attrs.get('share_method')
        email = attrs.get('email')
        phone = attrs.get('phone')
        
        if share_method == 'EMAIL' and not email:
            raise serializers.ValidationError(
                {"email": "Email is required when sharing via email"}
            )
        
        if share_method == 'WHATSAPP' and not phone:
            raise serializers.ValidationError(
                {"phone": "Phone number is required when sharing via WhatsApp"}
            )
        
        return attrs


class ShareWithDoctorSerializer(serializers.Serializer):
    """Serializer for sharing document with specific doctors"""
    doctor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        help_text="List of doctor IDs to share with"
    )
    
    def validate_doctor_ids(self, value):
        """Validate doctor IDs exist"""
        existing_doctors = DoctorProfile.objects.filter(id__in=value).count()
        if existing_doctors != len(value):
            raise serializers.ValidationError(
                "One or more doctor IDs are invalid"
            )
        return value


class DocumentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing documents"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    file_extension = serializers.CharField(read_only=True)
    is_shared = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicalDocument
        fields = [
            'id', 'title', 'category', 'category_display',
            'file_extension', 'file_size', 'document_date',
            'is_shared', 'created_at'
        ]
    
    def get_is_shared(self, obj):
        """Check if document is shared"""
        return obj.shared_with_doctors.exists() or obj.shares.filter(is_active=True).exists()