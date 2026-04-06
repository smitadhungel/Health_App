from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Avg
from .models import DoctorProfile, DoctorAvailability, DoctorReview
from .serializers import (
    DoctorProfileSerializer,
    DoctorListSerializer,
    CreateDoctorProfileSerializer,
    DoctorAvailabilitySerializer,
    DoctorReviewSerializer
)
from .permissions import IsDoctor, IsPatient, IsDoctorOwner


# ============================================
# DOCTOR PROFILE VIEWS
# ============================================

class CreateDoctorProfileView(generics.CreateAPIView):
    """Create doctor profile (only for users with DOCTOR role)"""
    serializer_class = CreateDoctorProfileSerializer
    permission_classes = [IsDoctor]
    
    def perform_create(self, serializer):
        # Check if profile already exists
        if hasattr(self.request.user, 'doctor_profile'):
            return Response(
                {'error': 'Doctor profile already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Check if profile already exists
        if hasattr(request.user, 'doctor_profile'):
            return Response(
                {'error': 'Doctor profile already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'message': 'Doctor profile created successfully',
            'profile': DoctorProfileSerializer(request.user.doctor_profile).data
        }, status=status.HTTP_201_CREATED)


class MyDoctorProfileView(generics.RetrieveAPIView):
    """Get current doctor's profile"""
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsDoctor]
    
    def get_object(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return None
        return self.request.user.doctor_profile
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response(
                {'error': 'Doctor profile not found. Please create one.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UpdateDoctorProfileView(generics.UpdateAPIView):
    """Update doctor profile"""
    serializer_class = CreateDoctorProfileSerializer
    permission_classes = [IsDoctor]
    
    def get_object(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return None
        return self.request.user.doctor_profile
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response(
                {'error': 'Doctor profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Profile updated successfully',
            'profile': DoctorProfileSerializer(instance).data
        })


class DoctorListView(generics.ListAPIView):
    """List all doctors with optional filters"""
    serializer_class = DoctorListSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = DoctorProfile.objects.select_related('user').all()
        
        # Filter by specialization
        specialization = self.request.query_params.get('specialization')
        if specialization:
            queryset = queryset.filter(specialization=specialization)
        
        # Filter by availability
        available_only = self.request.query_params.get('available', 'false')
        if available_only.lower() == 'true':
            queryset = queryset.filter(is_available=True)
        
        # Filter by verified status
        verified_only = self.request.query_params.get('verified', 'false')
        # if verified_only.lower() == 'true':
        #     queryset = queryset.filter(is_verified=True)
        queryset = queryset.filter(verification_status='APPROVED')
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)
            )
        
        # Sort by rating or experience
        sort_by = self.request.query_params.get('sort_by', 'rating')
        if sort_by == 'experience':
            queryset = queryset.order_by('-experience_years')
        elif sort_by == 'fee_low':
            queryset = queryset.order_by('consultation_fee')
        elif sort_by == 'fee_high':
            queryset = queryset.order_by('-consultation_fee')
        else:
            queryset = queryset.order_by('-rating', '-experience_years')
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'doctors': serializer.data
        })


class DoctorDetailView(generics.RetrieveAPIView):
    """Get detailed information about a specific doctor"""
    serializer_class = DoctorProfileSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'
    
    def get_queryset(self):
        return DoctorProfile.objects.select_related('user').prefetch_related(
            'availability', 'reviews'
        )


class ToggleAvailabilityView(APIView):
    """Toggle doctor's availability status"""
    permission_classes = [IsDoctor]
    
    def put(self, request):
        if not hasattr(request.user, 'doctor_profile'):
            return Response(
                {'error': 'Doctor profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        doctor = request.user.doctor_profile
        doctor.is_available = not doctor.is_available
        doctor.save()
        
        return Response({
            'message': f'Availability set to {"Available" if doctor.is_available else "Unavailable"}',
            'is_available': doctor.is_available
        })


# ============================================
# DOCTOR AVAILABILITY VIEWS
# ============================================

class AddAvailabilityView(generics.CreateAPIView):
    """Add availability schedule for doctor"""
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [IsDoctor]
    
    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'doctor_profile'):
            return Response(
                {'error': 'Doctor profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer.save(doctor=self.request.user.doctor_profile)
    
    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'doctor_profile'):
            return Response(
                {'error': 'Doctor profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'message': 'Availability added successfully',
            'availability': serializer.data
        }, status=status.HTTP_201_CREATED)


class DoctorAvailabilityView(generics.ListAPIView):
    """Get availability schedule for a specific doctor"""
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        doctor_id = self.kwargs.get('doctor_id')
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
            return doctor.availability.filter(is_active=True)
        except DoctorProfile.DoesNotExist:
            return DoctorAvailability.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if not queryset.exists():
            doctor_id = self.kwargs.get('doctor_id')
            if not DoctorProfile.objects.filter(id=doctor_id).exists():
                return Response(
                    {'error': 'Doctor not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ============================================
# DOCTOR REVIEW VIEWS
# ============================================

class AddReviewView(generics.CreateAPIView):
    """Add a review for a doctor (patients only)"""
    serializer_class = DoctorReviewSerializer
    permission_classes = [IsPatient]
    
    def create(self, request, *args, **kwargs):
        doctor_id = self.kwargs.get('doctor_id')
        
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response(
                {'error': 'Doctor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if patient already reviewed this doctor
        if DoctorReview.objects.filter(doctor=doctor, patient=request.user).exists():
            return Response(
                {'error': 'You have already reviewed this doctor'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(doctor=doctor, patient=request.user)
        
        # Update doctor's average rating
        avg_rating = doctor.reviews.aggregate(Avg('rating'))['rating__avg']
        doctor.rating = round(avg_rating, 2) if avg_rating else 0
        doctor.save()
        
        return Response({
            'message': 'Review added successfully',
            'review': serializer.data
        }, status=status.HTTP_201_CREATED)


# Add to doctors/views.py
from rest_framework.permissions import IsAdminUser
from django.utils import timezone

class VerifyDoctorView(APIView):
    """Admin verifies or rejects a doctor"""
    permission_classes = [IsAdminUser]

    def post(self, request, doctor_id):
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')  # 'APPROVE' or 'REJECT'
        reason = request.data.get('reason', '')

        if action == 'APPROVE':
            doctor.verification_status = 'APPROVED'
            doctor.verified_at = timezone.now()
            doctor.verified_by = request.user
            doctor.rejection_reason = ''
            doctor.save()
            return Response({'message': 'Doctor approved successfully'})

        elif action == 'REJECT':
            doctor.verification_status = 'REJECTED'
            doctor.rejection_reason = reason
            doctor.save()
            return Response({'message': 'Doctor rejected'})

        return Response({'error': 'Invalid action. Use APPROVE or REJECT'}, status=status.HTTP_400_BAD_REQUEST)
    
# Add this to doctors/views.py
from rest_framework.permissions import IsAdminUser

class AdminPendingDoctorsView(generics.ListAPIView):
    """Admin gets all pending doctors"""
    serializer_class = DoctorListSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return DoctorProfile.objects.select_related('user').filter(
            verification_status='PENDING'
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'doctors': serializer.data
        })