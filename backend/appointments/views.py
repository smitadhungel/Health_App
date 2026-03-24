# ============================================
# appointments/views.py
# ============================================

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from datetime import datetime, date, timedelta
from .models import Appointment, AppointmentHistory
from doctor.models import DoctorProfile
from .serializers import (
    AppointmentSerializer,
    CreateAppointmentSerializer,
    UpdateAppointmentSerializer,
    RescheduleAppointmentSerializer,
    DoctorUpdateAppointmentSerializer,
    AppointmentListSerializer
)
from .permissions import IsPatient, IsDoctor, IsAppointmentOwner


# ============================================
# PATIENT VIEWS - Book & Manage Appointments
# ============================================

class CreateAppointmentView(generics.CreateAPIView):
    """Book a new appointment (patients only)"""
    serializer_class = CreateAppointmentSerializer
    permission_classes = [IsPatient]
    
    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save(patient=request.user)
        
        # Create history entry
        AppointmentHistory.objects.create(
            appointment=appointment,
            changed_by=request.user,
            new_status=appointment.status,
            new_date=appointment.appointment_date,
            new_time=appointment.appointment_time,
            notes="Appointment created"
        )
        
        return Response({
            'message': 'Appointment booked successfully',
            'appointment': AppointmentSerializer(appointment).data
        }, status=status.HTTP_201_CREATED)


class MyAppointmentsListView(generics.ListAPIView):
    """List all appointments for the current patient"""
    serializer_class = AppointmentListSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        queryset = Appointment.objects.filter(
            patient=self.request.user
        ).select_related('doctor', 'doctor__user')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        # Filter by upcoming/past
        filter_type = self.request.query_params.get('filter', 'all')
        today = date.today()
        
        if filter_type == 'upcoming':
            queryset = queryset.filter(
                appointment_date__gte=today,
                status__in=['PENDING', 'CONFIRMED']
            )
        elif filter_type == 'past':
            queryset = queryset.filter(
                Q(appointment_date__lt=today) |
                Q(status__in=['COMPLETED', 'CANCELLED', 'NO_SHOW'])
            )
        
        return queryset.order_by('-appointment_date', '-appointment_time')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'appointments': serializer.data
        })


class AppointmentDetailView(generics.RetrieveAPIView):
    """Get detailed appointment information"""
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsAppointmentOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        user = self.request.user
        
        # Patients see their appointments
        if user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user)
        
        # Doctors see their appointments
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Appointment.objects.filter(doctor=user.doctor_profile)
        
        return Appointment.objects.none()


class UpdateAppointmentView(generics.UpdateAPIView):
    """Update appointment details (patient can update reason/symptoms)"""
    serializer_class = UpdateAppointmentSerializer
    permission_classes = [IsPatient, IsAppointmentOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        return Appointment.objects.filter(
            patient=self.request.user,
            status__in=['PENDING', 'CONFIRMED']
        )
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check if appointment can be updated
        if not instance.is_upcoming:
            return Response(
                {'error': 'Cannot update past or cancelled appointments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Appointment updated successfully',
            'appointment': AppointmentSerializer(instance).data
        })


class CancelAppointmentView(APIView):
    """Cancel an appointment"""
    permission_classes = [IsAuthenticated, IsAppointmentOwner]
    
    def post(self, request, id):
        try:
            user = request.user
            
            # Get appointment based on role
            if user.role == 'PATIENT':
                appointment = Appointment.objects.get(id=id, patient=user)
            elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
                appointment = Appointment.objects.get(id=id, doctor=user.doctor_profile)
            else:
                return Response(
                    {'error': 'Unauthorized'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if can be cancelled
            if not appointment.can_cancel:
                return Response(
                    {'error': 'This appointment cannot be cancelled'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Cancel the appointment
            old_status = appointment.status
            appointment.status = 'CANCELLED'
            appointment.save()
            
            # Create history entry
            AppointmentHistory.objects.create(
                appointment=appointment,
                changed_by=user,
                old_status=old_status,
                new_status='CANCELLED',
                notes=f"Cancelled by {user.get_full_name()}"
            )
            
            return Response({
                'message': 'Appointment cancelled successfully',
                'appointment': AppointmentSerializer(appointment).data
            })
        
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class RescheduleAppointmentView(APIView):
    """Reschedule an appointment to a new date/time"""
    permission_classes = [IsPatient, IsAppointmentOwner]
    
    def post(self, request, id):
        try:
            appointment = Appointment.objects.get(id=id, patient=request.user)
            
            # Check if can be rescheduled
            if not appointment.can_cancel:
                return Response(
                    {'error': 'This appointment cannot be rescheduled'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer = RescheduleAppointmentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            new_date = serializer.validated_data['new_date']
            new_time = serializer.validated_data['new_time']
            
            # Check if new slot is available
            slot_taken = Appointment.objects.filter(
                doctor=appointment.doctor,
                appointment_date=new_date,
                appointment_time=new_time,
                status__in=['PENDING', 'CONFIRMED']
            ).exclude(id=appointment.id).exists()
            
            if slot_taken:
                return Response(
                    {'error': 'This time slot is already booked'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update appointment
            old_date = appointment.appointment_date
            old_time = appointment.appointment_time
            
            appointment.appointment_date = new_date
            appointment.appointment_time = new_time
            appointment.save()
            
            # Create history entry
            AppointmentHistory.objects.create(
                appointment=appointment,
                changed_by=request.user,
                old_date=old_date,
                new_date=new_date,
                old_time=old_time,
                new_time=new_time,
                notes="Appointment rescheduled"
            )
            
            return Response({
                'message': 'Appointment rescheduled successfully',
                'appointment': AppointmentSerializer(appointment).data
            })
        
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# DOCTOR VIEWS - Manage Appointments
# ============================================

class DoctorAppointmentsListView(generics.ListAPIView):
    """List all appointments for the current doctor"""
    serializer_class = AppointmentListSerializer
    permission_classes = [IsDoctor]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return Appointment.objects.none()
        
        queryset = Appointment.objects.filter(
            doctor=self.request.user.doctor_profile
        ).select_related('patient')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        
        # Filter by date
        date_filter = self.request.query_params.get('date')
        if date_filter:
            try:
                filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                queryset = queryset.filter(appointment_date=filter_date)
            except ValueError:
                pass
        
        # Today's appointments by default
        filter_type = self.request.query_params.get('filter', 'upcoming')
        if filter_type == 'today':
            queryset = queryset.filter(appointment_date=date.today())
        elif filter_type == 'upcoming':
            queryset = queryset.filter(
                appointment_date__gte=date.today(),
                status__in=['PENDING', 'CONFIRMED']
            )
        
        return queryset.order_by('appointment_date', 'appointment_time')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'appointments': serializer.data
        })


class DoctorUpdateAppointmentView(generics.UpdateAPIView):
    """Doctor updates appointment (add notes, prescription, change status)"""
    serializer_class = DoctorUpdateAppointmentSerializer
    permission_classes = [IsDoctor]
    lookup_field = 'id'
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return Appointment.objects.none()
        return Appointment.objects.filter(doctor=self.request.user.doctor_profile)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Create history if status changed
        if 'status' in request.data and old_status != instance.status:
            AppointmentHistory.objects.create(
                appointment=instance,
                changed_by=request.user,
                old_status=old_status,
                new_status=instance.status,
                notes=f"Status changed by Dr. {request.user.get_full_name()}"
            )
        
        return Response({
            'message': 'Appointment updated successfully',
            'appointment': AppointmentSerializer(instance).data
        })


class CompleteAppointmentView(APIView):
    """Mark appointment as completed (doctors only)"""
    permission_classes = [IsDoctor]
    
    def post(self, request, id):
        try:
            if not hasattr(request.user, 'doctor_profile'):
                return Response(
                    {'error': 'Doctor profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            appointment = Appointment.objects.get(
                id=id,
                doctor=request.user.doctor_profile
            )
            
            if appointment.status != 'CONFIRMED':
                return Response(
                    {'error': 'Only confirmed appointments can be marked as completed'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            old_status = appointment.status
            appointment.status = 'COMPLETED'
            appointment.save()
            
            # Create history entry
            AppointmentHistory.objects.create(
                appointment=appointment,
                changed_by=request.user,
                old_status=old_status,
                new_status='COMPLETED',
                notes="Appointment completed"
            )
            
            return Response({
                'message': 'Appointment marked as completed',
                'appointment': AppointmentSerializer(appointment).data
            })
        
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# UTILITY VIEWS
# ============================================

class AvailableTimeSlotsView(APIView):
    """Get available time slots for a doctor on a specific date"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, doctor_id):
        date_str = request.query_params.get('date')
        
        if not date_str:
            return Response(
                {'error': 'Date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if date is in the past
        if appointment_date < date.today():
            return Response(
                {'error': 'Cannot get slots for past dates'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response(
                {'error': 'Doctor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not doctor.is_available:
            return Response({
                'available_slots': [],
                'message': 'Doctor is currently unavailable'
            })
        
        # Get doctor's availability for this day
        day_of_week = appointment_date.weekday()
        availabilities = doctor.availability.filter(
            day_of_week=day_of_week,
            is_active=True
        )
        
        if not availabilities.exists():
            return Response({
                'available_slots': [],
                'message': 'Doctor is not available on this day'
            })
        
        # Generate time slots
        available_slots = []
        
        for availability in availabilities:
            current_time = availability.start_time
            end_time = availability.end_time
            slot_duration = timedelta(minutes=availability.slot_duration)
            
            while current_time < end_time:
                # Check if slot is booked
                is_booked = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=appointment_date,
                    appointment_time=current_time,
                    status__in=['PENDING', 'CONFIRMED']
                ).exists()
                
                if not is_booked:
                    available_slots.append({
                        'time': current_time.strftime('%H:%M'),
                        'available': True
                    })
                
                # Move to next slot
                current_datetime = datetime.combine(appointment_date, current_time)
                next_datetime = current_datetime + slot_duration
                current_time = next_datetime.time()
        
        return Response({
            'date': date_str,
            'doctor': doctor.user.get_full_name(),
            'available_slots': available_slots,
            'total_slots': len(available_slots)
        })