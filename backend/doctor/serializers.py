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


# Replace your DoctorProfileSerializer with this:

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
    total_patients = serializers.IntegerField(read_only=True)
    doctor_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user', 'doctor_name',
            'specialization', 'specialization_display',
            'license_number', 'qualification', 'experience_years',
            'consultation_fee', 'bio', 'clinic_address',
            'profile_photo', 'license_photo',           # <-- was missing
            'is_available', 'is_verified',
            'verification_status', 'rejection_reason',  # <-- was missing
            'verified_at', 'verified_by',               # <-- was missing
            'average_rating', 'rating',
            'total_patients',
            'availability', 'reviews',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'user', 'is_verified', 'rating', 'total_patients',
            'verified_at', 'verified_by',
        ]


# Also replace DoctorListSerializer to include verification fields for admin:

class DoctorListSerializer(serializers.ModelSerializer):
    """Serializer for listing doctors"""
    doctor_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone_number', read_only=True)
    specialization_display = serializers.CharField(
        source='get_specialization_display',
        read_only=True
    )
    total_patients = serializers.IntegerField(read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'doctor_name', 'email', 'phone',
            'specialization', 'specialization_display',
            'qualification', 'experience_years',
            'consultation_fee', 'rating',
            'is_available', 'is_verified',
            'verification_status',   # <-- added so admin can filter
            'profile_photo',         # <-- added for avatar display
            'total_patients',
            'license_number',
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
