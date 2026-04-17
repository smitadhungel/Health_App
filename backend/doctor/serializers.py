from rest_framework import serializers
from .models import DoctorProfile, DoctorAvailability, DoctorReview
from users.serializers import UserSerializer


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for doctor availability schedule"""
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)
    
    class Meta:
        model = DoctorAvailability
        fields = [
            'id', 'day_of_week', 'day_name', 'start_time', 
            'end_time', 'slot_duration', 'is_active'
        ]


class DoctorReviewSerializer(serializers.ModelSerializer):
    """Serializer for doctor reviews"""
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    
    class Meta:
        model = DoctorReview
        fields = ['id', 'patient', 'patient_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['patient', 'created_at']


class DoctorProfileSerializer(serializers.ModelSerializer):
    """Complete doctor profile serializer"""
    user = UserSerializer(read_only=True)
    specialization_display = serializers.CharField(
        source='get_specialization_display', 
        read_only=True
    )
    availability = DoctorAvailabilitySerializer(many=True, read_only=True)
    reviews = DoctorReviewSerializer(many=True, read_only=True)
    average_rating = serializers.DecimalField(
        source='rating', 
        max_digits=3, 
        decimal_places=2, 
        read_only=True
    )
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user', 'specialization', 'specialization_display',
            'license_number', 'qualification', 'experience_years',
            'consultation_fee', 'bio', 'clinic_address', 
            'is_available', 'is_verified', 'average_rating',
            'total_patients', 'availability', 'reviews',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'is_verified', 'rating', 'total_patients']


class DoctorListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing doctors"""
    doctor_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone_number', read_only=True)
    specialization_display = serializers.CharField(
        source='get_specialization_display', 
        read_only=True
    )
    
    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'doctor_name', 'email', 'phone',
            'specialization', 'specialization_display',
            'qualification', 'experience_years',
            'consultation_fee', 'rating', 'is_available', 'is_verified'
        ]


class CreateDoctorProfileSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating doctor profile"""
    
    class Meta:
        model = DoctorProfile
        fields = [
            'specialization', 'license_number', 'qualification',
            'experience_years', 'consultation_fee', 'bio', 'clinic_address','profile_photo', 'license_photo',
        ]
    
    def validate_license_number(self, value):
        """Check if license number is unique"""
        if self.instance:
            # Updating existing profile
            if DoctorProfile.objects.exclude(id=self.instance.id).filter(license_number=value).exists():
                raise serializers.ValidationError("License number already exists")
        else:
            # Creating new profile
            if DoctorProfile.objects.filter(license_number=value).exists():
                raise serializers.ValidationError("License number already exists")
        return value
