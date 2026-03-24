# ============================================
# medications/views.py
# ============================================

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from datetime import date, datetime, timedelta
from .models import (
    Medication, MedicationSchedule, MedicationLog,
    MedicationReminder, MedicationRefill
)
from .serializers import (
    MedicationSerializer,
    CreateMedicationSerializer,
    UpdateMedicationSerializer,
    LogMedicationSerializer,
    MedicationScheduleSerializer,
    MedicationReminderSerializer,
    MedicationLogSerializer,
    MedicationRefillSerializer,
    RequestRefillSerializer,
    ApproveRefillSerializer,
    MedicationListSerializer,
    MedicationStatsSerializer
)
from .permissions import IsPatient, IsDoctor, IsMedicationOwner

User = get_user_model()
# ============================================
# MEDICATION MANAGEMENT VIEWS
# ============================================

class CreateMedicationView(generics.CreateAPIView):
    serializer_class = CreateMedicationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        # For patients, automatically set patient = themselves
        if user.role == 'PATIENT':
            return serializer.save(patient=user)
        # For doctors, patient must be provided in the request
        patient_id = self.request.data.get('patient')
        if not patient_id:
            raise ValidationError({'patient': 'Patient is required when a doctor creates a medication.'})
        try:
            patient = User.objects.get(id=patient_id, role='PATIENT')
        except User.DoesNotExist:
            raise ValidationError({'patient': 'Invalid patient ID.'})
        return serializer.save(patient=patient)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            medication = self.perform_create(serializer)   # now returns the instance
        except ValidationError as e:
            return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'message': 'Medication added successfully',
            'medication': MedicationSerializer(medication).data
        }, status=status.HTTP_201_CREATED)


class MyMedicationsListView(generics.ListAPIView):
    """List all medications for current patient"""
    serializer_class = MedicationListSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        queryset = Medication.objects.filter(
            patient=self.request.user
        ).select_related('prescribed_by', 'prescribed_by__user')
        
        # Filter by active status
        is_active = self.request.query_params.get('active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by expired
        show_expired = self.request.query_params.get('expired', 'false')
        if show_expired.lower() == 'false':
            queryset = queryset.filter(
                Q(end_date__isnull=True) | Q(end_date__gte=date.today())
            )
        
        # Filter by refill needed
        refill = self.request.query_params.get('refill')
        if refill and refill.lower() == 'true':
            queryset = queryset.filter(is_refill_needed=True)
        
        return queryset.order_by('-is_active', '-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'medications': serializer.data
        })


class MedicationDetailView(generics.RetrieveAPIView):
    """Get detailed medication information"""
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated, IsMedicationOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        user = self.request.user
        
        # Patients see their medications
        if user.role == 'PATIENT':
            return Medication.objects.filter(patient=user)
        
        # Doctors see medications they prescribed
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Medication.objects.filter(prescribed_by=user.doctor_profile)
        
        return Medication.objects.none()


class UpdateMedicationView(generics.UpdateAPIView):
    """Update medication details"""
    serializer_class = UpdateMedicationSerializer
    permission_classes = [IsAuthenticated, IsMedicationOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        user = self.request.user
        
        # Patients can update their own medications
        if user.role == 'PATIENT':
            return Medication.objects.filter(patient=user)
        
        # Doctors can update medications they prescribed
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Medication.objects.filter(prescribed_by=user.doctor_profile)
        
        return Medication.objects.none()
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Medication updated successfully',
            'medication': MedicationSerializer(instance).data
        })


class DeleteMedicationView(generics.DestroyAPIView):
    """Delete/deactivate medication"""
    permission_classes = [IsPatient, IsMedicationOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        return Medication.objects.filter(patient=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Don't actually delete, just deactivate
        instance.is_active = False
        instance.save()
        
        return Response({
            'message': 'Medication deactivated successfully'
        }, status=status.HTTP_200_OK)


# ============================================
# MEDICATION SCHEDULE VIEWS
# ============================================

class AddScheduleView(generics.CreateAPIView):
    """Add a schedule to medication"""
    serializer_class = MedicationScheduleSerializer
    permission_classes = [IsPatient]
    
    def create(self, request, medication_id):
        try:
            medication = Medication.objects.get(
                id=medication_id,
                patient=request.user
            )
        except Medication.DoesNotExist:
            return Response(
                {'error': 'Medication not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save(medication=medication)
        
        return Response({
            'message': 'Schedule added successfully',
            'schedule': serializer.data
        }, status=status.HTTP_201_CREATED)


class MedicationSchedulesView(generics.ListAPIView):
    """List schedules for a medication"""
    serializer_class = MedicationScheduleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        medication_id = self.kwargs.get('medication_id')
        return MedicationSchedule.objects.filter(
            medication_id=medication_id,
            medication__patient=self.request.user
        ).order_by('time')


# ============================================
# MEDICATION LOGGING VIEWS
# ============================================

class LogMedicationView(APIView):
    """Log medication intake"""
    permission_classes = [IsPatient]
    
    def post(self, request, medication_id):
        try:
            medication = Medication.objects.get(
                id=medication_id,
                patient=request.user
            )
        except Medication.DoesNotExist:
            return Response(
                {'error': 'Medication not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = LogMedicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Check if log already exists
        existing_log = MedicationLog.objects.filter(
            medication=medication,
            scheduled_date=data['scheduled_date'],
            scheduled_time=data['scheduled_time']
        ).first()
        
        if existing_log:
            # Update existing log
            for key, value in data.items():
                setattr(existing_log, key, value)
            existing_log.save()
            log = existing_log
            message = 'Medication log updated successfully'
        else:
            # Create new log
            log = MedicationLog.objects.create(
                medication=medication,
                schedule_id=data.get('schedule_id'),
                scheduled_date=data['scheduled_date'],
                scheduled_time=data['scheduled_time'],
                status=data['status'],
                actual_time=data.get('actual_time'),
                dosage_taken=data.get('dosage_taken'),
                notes=data.get('notes', '')
            )
            message = 'Medication logged successfully'
        
        return Response({
            'message': message,
            'log': MedicationLogSerializer(log).data
        }, status=status.HTTP_201_CREATED)


class MedicationLogsView(generics.ListAPIView):
    """View medication logs"""
    serializer_class = MedicationLogSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        medication_id = self.kwargs.get('medication_id')
        queryset = MedicationLog.objects.filter(
            medication_id=medication_id,
            medication__patient=self.request.user
        )
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        
        if from_date:
            queryset = queryset.filter(scheduled_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(scheduled_date__lte=to_date)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        return queryset.order_by('-scheduled_date', '-scheduled_time')


class TodaysDosesView(APIView):
    """Get today's medication schedule"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        today = date.today()
        
        # Get active medications
        medications = Medication.objects.filter(
            patient=request.user,
            is_active=True,
            start_date__lte=today
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        ).prefetch_related('schedules')
        
        doses = []
        
        for medication in medications:
            schedules = medication.schedules.filter(is_active=True)
            
            for schedule in schedules:
                # Check if already logged
                log = MedicationLog.objects.filter(
                    medication=medication,
                    schedule=schedule,
                    scheduled_date=today
                ).first()
                
                doses.append({
                    'medication_id': medication.id,
                    'medication_name': medication.name,
                    'dosage': medication.dosage,
                    'schedule_id': schedule.id,
                    'time': schedule.time.strftime('%H:%M'),
                    'dosage_count': schedule.dosage_count,
                    'instructions': medication.instructions,
                    'status': log.status if log else 'PENDING',
                    'actual_time': log.actual_time if log else None
                })
        
        # Sort by time
        doses.sort(key=lambda x: x['time'])
        
        return Response({
            'date': today,
            'total_doses': len(doses),
            'doses': doses
        })


# ============================================
# MEDICATION REFILL VIEWS
# ============================================

class RequestRefillView(generics.CreateAPIView):
    """Request medication refill"""
    serializer_class = RequestRefillSerializer
    permission_classes = [IsPatient]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refill = serializer.save(patient=request.user)
        
        return Response({
            'message': 'Refill request submitted successfully',
            'refill': MedicationRefillSerializer(refill).data
        }, status=status.HTTP_201_CREATED)


class MyRefillsListView(generics.ListAPIView):
    """List patient's refill requests"""
    serializer_class = MedicationRefillSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        queryset = MedicationRefill.objects.filter(
            patient=self.request.user
        ).select_related('medication', 'approved_by')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        return queryset.order_by('-requested_date')


class DoctorRefillsListView(generics.ListAPIView):
    """List refill requests for doctor's patients"""
    serializer_class = MedicationRefillSerializer
    permission_classes = [IsDoctor]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return MedicationRefill.objects.none()
        
        queryset = MedicationRefill.objects.filter(
            medication__prescribed_by=self.request.user.doctor_profile
        ).select_related('medication', 'patient')
        
        # Filter by status
        status_filter = self.request.query_params.get('status', 'PENDING')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        return queryset.order_by('-requested_date')


class ApproveRefillView(APIView):
    """Approve or reject refill request (doctors only)"""
    permission_classes = [IsDoctor]
    
    def post(self, request, refill_id):
        try:
            if not hasattr(request.user, 'doctor_profile'):
                return Response(
                    {'error': 'Doctor profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            refill = MedicationRefill.objects.get(
                id=refill_id,
                medication__prescribed_by=request.user.doctor_profile
            )
        except MedicationRefill.DoesNotExist:
            return Response(
                {'error': 'Refill request not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ApproveRefillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        refill.status = data['status']
        refill.notes = data.get('notes', '')
        refill.approved_by = request.user.doctor_profile
        refill.approved_date = datetime.now()
        refill.save()
        
        return Response({
            'message': f'Refill request {data["status"].lower()}',
            'refill': MedicationRefillSerializer(refill).data
        })


# ============================================
# STATISTICS & DASHBOARD VIEWS
# ============================================

class MedicationStatsView(APIView):
    """Get medication statistics for patient"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        # Get medications
        all_meds = Medication.objects.filter(patient=request.user)
        active_meds = all_meds.filter(is_active=True)
        expired_meds = all_meds.filter(end_date__lt=today)
        refill_needed = all_meds.filter(is_refill_needed=True)
        
        # Get today's logs
        today_logs = MedicationLog.objects.filter(
            medication__patient=request.user,
            scheduled_date=today
        )
        
        # Calculate adherence rate (last 7 days)
        week_logs = MedicationLog.objects.filter(
            medication__patient=request.user,
            scheduled_date__gte=week_ago
        )
        
        total_doses = week_logs.count()
        taken_doses = week_logs.filter(status='TAKEN').count()
        adherence_rate = round((taken_doses / total_doses) * 100, 2) if total_doses > 0 else 0
        
        # Get upcoming doses
        upcoming_doses = []
        for med in active_meds:
            schedules = med.schedules.filter(is_active=True)
            for schedule in schedules:
                upcoming_doses.append({
                    'medication': med.name,
                    'time': schedule.time.strftime('%H:%M'),
                    'dosage': f"{schedule.dosage_count} {med.form}"
                })
        
        stats = {
            'total_medications': all_meds.count(),
            'active_medications': active_meds.count(),
            'expired_medications': expired_meds.count(),
            'refill_needed': refill_needed.count(),
            'adherence_rate': adherence_rate,
            'doses_taken_today': today_logs.filter(status='TAKEN').count(),
            'doses_missed_today': today_logs.filter(status='MISSED').count(),
            'upcoming_doses': upcoming_doses[:5]
        }
        
        serializer = MedicationStatsSerializer(stats)
        return Response(serializer.data)
    
