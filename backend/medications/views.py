from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
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
    MedicationStatsSerializer,
)
from .permissions import IsPatient, IsDoctor, IsMedicationOwner

User = get_user_model()


# ============================================================
# SHARED HELPER
# ============================================================

def _auto_complete_if_done(medication) -> bool:
    """
    On the medication's end_date (last day of the course), check whether
    ALL active schedules for today have a TAKEN log.  If so, soft-delete
    the medication and return True.

    Works for:
      - duration_days=1  (end_date == start_date == today)
      - Any multi-day course whose last day is today
      - Medications with multiple daily schedules (all must be TAKEN)
    """
    today = date.today()

    # Only fire on the very last day
    if not medication.end_date or medication.end_date != today:
        return False

    active_schedules = medication.schedules.filter(is_active=True)
    total = active_schedules.count()
    if total == 0:
        return False

    taken_count = MedicationLog.objects.filter(
        medication=medication,
        scheduled_date=today,
        status='TAKEN',
    ).count()

    if taken_count >= total:
        medication.is_active = False
        medication.save(update_fields=['is_active'])
        return True

    return False


# ============================================================
# MEDICATION CRUD
# ============================================================

class CreateMedicationView(generics.CreateAPIView):
    serializer_class = CreateMedicationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'PATIENT':
            return serializer.save(patient=user)
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
            medication = self.perform_create(serializer)
        except ValidationError as e:
            return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
        return Response({
            'message': 'Medication added successfully',
            'medication': MedicationSerializer(medication).data,
        }, status=status.HTTP_201_CREATED)


class MyMedicationsListView(generics.ListAPIView):
    serializer_class = MedicationListSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        qs = Medication.objects.filter(
            patient=self.request.user,
            is_active=True,
        ).select_related('prescribed_by', 'prescribed_by__user')

        if self.request.query_params.get('expired', 'false').lower() == 'false':
            qs = qs.filter(Q(end_date__isnull=True) | Q(end_date__gte=date.today()))

        if self.request.query_params.get('refill', '').lower() == 'true':
            qs = qs.filter(is_refill_needed=True)

        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({
            'count': qs.count(),
            'medications': self.get_serializer(qs, many=True).data,
        })


class MedicationDetailView(generics.RetrieveAPIView):
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated, IsMedicationOwner]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Medication.objects.filter(patient=user)
        if user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Medication.objects.filter(prescribed_by=user.doctor_profile)
        return Medication.objects.none()


class UpdateMedicationView(generics.UpdateAPIView):
    serializer_class = UpdateMedicationSerializer
    permission_classes = [IsAuthenticated, IsMedicationOwner]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Medication.objects.filter(patient=user)
        if user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Medication.objects.filter(prescribed_by=user.doctor_profile)
        return Medication.objects.none()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'message': 'Medication updated successfully',
            'medication': MedicationSerializer(instance).data,
        })


class DeleteMedicationView(generics.DestroyAPIView):
    permission_classes = [IsPatient, IsMedicationOwner]
    lookup_field = 'id'

    def get_queryset(self):
        return Medication.objects.filter(patient=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'message': 'Medication deactivated successfully'}, status=status.HTTP_200_OK)


# ============================================================
# SCHEDULES
# ============================================================

class AddScheduleView(generics.CreateAPIView):
    serializer_class = MedicationScheduleSerializer
    permission_classes = [IsPatient]

    def create(self, request, medication_id):
        try:
            medication = Medication.objects.get(id=medication_id, patient=request.user)
        except Medication.DoesNotExist:
            return Response({'error': 'Medication not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(medication=medication)
        return Response({'message': 'Schedule added successfully', 'schedule': serializer.data},
                        status=status.HTTP_201_CREATED)


class MedicationSchedulesView(generics.ListAPIView):
    serializer_class = MedicationScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MedicationSchedule.objects.filter(
            medication_id=self.kwargs['medication_id'],
            medication__patient=self.request.user,
        ).order_by('time')


# ============================================================
# LOGGING
# ============================================================

class LogMedicationView(APIView):
    """
    POST /medications/<id>/log/
    Creates or updates a log entry for a specific scheduled slot.

    Key fix: when an existing log is being updated (e.g. auto-MISSED → TAKEN),
    we only update the safe model fields explicitly instead of blindly iterating
    validated_data (which contains schedule_id, not a model field).
    """
    permission_classes = [IsPatient]

    def post(self, request, medication_id):
        try:
            medication = Medication.objects.get(id=medication_id, patient=request.user)
        except Medication.DoesNotExist:
            return Response({'error': 'Medication not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = LogMedicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Try to find an existing log for this exact slot (handles auto-MISSED case)
        existing = MedicationLog.objects.filter(
            medication=medication,
            scheduled_date=data['scheduled_date'],
            scheduled_time=data['scheduled_time'],
        ).first()

        if existing:
            # Update only the model-safe fields
            existing.status       = data['status']
            existing.actual_time  = data.get('actual_time')
            existing.dosage_taken = data.get('dosage_taken')
            existing.notes        = data.get('notes', existing.notes)
            existing.save()
            log     = existing
            message = 'Medication log updated successfully'
        else:
            log = MedicationLog.objects.create(
                medication=medication,
                schedule_id=data.get('schedule_id'),
                scheduled_date=data['scheduled_date'],
                scheduled_time=data['scheduled_time'],
                status=data['status'],
                actual_time=data.get('actual_time'),
                dosage_taken=data.get('dosage_taken'),
                notes=data.get('notes', ''),
            )
            message = 'Medication logged successfully'

        auto_completed = _auto_complete_if_done(medication) if log.status == 'TAKEN' else False

        return Response({
            'message':        message,
            'log':            MedicationLogSerializer(log).data,
            'auto_completed': auto_completed,
        }, status=status.HTTP_201_CREATED)


class UpdateLogStatusView(APIView):
    """
    PATCH /medications/logs/<log_id>/update/
    Updates the status of an existing log entry.
    Used when a dose was auto-marked MISSED but the patient took it late,
    or any other status correction.
    """
    permission_classes = [IsPatient]

    def patch(self, request, log_id):
        try:
            log = MedicationLog.objects.select_related('medication').get(
                id=log_id,
                medication__patient=request.user,
            )
        except MedicationLog.DoesNotExist:
            return Response({'error': 'Log entry not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ('TAKEN', 'MISSED', 'SKIPPED', 'DELAYED'):
            return Response(
                {'error': 'status must be one of TAKEN, MISSED, SKIPPED, DELAYED'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        log.status = new_status

        # Notes — only overwrite if explicitly provided
        if 'notes' in request.data:
            log.notes = request.data['notes']

        # actual_time management
        if new_status == 'TAKEN':
            raw = request.data.get('actual_time')
            if raw:
                try:
                    log.actual_time = datetime.fromisoformat(raw)
                except (ValueError, TypeError):
                    log.actual_time = datetime.now()
            else:
                log.actual_time = datetime.now()
        else:
            # Clearing a previously TAKEN mark — remove actual_time
            log.actual_time = None

        log.save()

        auto_completed = _auto_complete_if_done(log.medication) if new_status == 'TAKEN' else False

        return Response({
            'message':        f'Dose updated to {new_status.lower()}',
            'log':            MedicationLogSerializer(log).data,
            'auto_completed': auto_completed,
        })


class MedicationLogsView(generics.ListAPIView):
    serializer_class = MedicationLogSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        qs = MedicationLog.objects.filter(
            medication_id=self.kwargs['medication_id'],
            medication__patient=self.request.user,
        )
        if self.request.query_params.get('from_date'):
            qs = qs.filter(scheduled_date__gte=self.request.query_params['from_date'])
        if self.request.query_params.get('to_date'):
            qs = qs.filter(scheduled_date__lte=self.request.query_params['to_date'])
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'].upper())
        return qs.order_by('-scheduled_date', '-scheduled_time')


# ============================================================
# TODAY'S DOSES
# ============================================================

class TodaysDosesView(APIView):
    """
    GET /medications/todays-doses/

    Returns every scheduled dose for today with its current status.

    Rules:
    - If no log exists and now > scheduled_time + 20 min → auto-create MISSED log.
    - Response always includes log_id (None if still PENDING with no log created yet).
    - Sorted: MISSED first, then PENDING, DELAYED, SKIPPED, TAKEN last.
    """
    permission_classes = [IsPatient]

    def get(self, request):
        today = date.today()
        now   = datetime.now()

        medications = Medication.objects.filter(
            patient=request.user,
            is_active=True,
            start_date__lte=today,
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        ).prefetch_related('schedules')

        status_labels = dict(MedicationLog.STATUS_CHOICES)
        doses = []

        for med in medications:
            for schedule in med.schedules.filter(is_active=True):
                scheduled_dt = datetime.combine(today, schedule.time)
                cutoff_dt    = scheduled_dt + timedelta(minutes=20)

                log = MedicationLog.objects.filter(
                    medication=med,
                    scheduled_date=today,
                    scheduled_time=schedule.time,
                ).first()

                # Auto-create MISSED if grace period passed with no log
                if log is None and now > cutoff_dt:
                    log = MedicationLog.objects.create(
                        medication=med,
                        schedule=schedule,
                        scheduled_date=today,
                        scheduled_time=schedule.time,
                        status='MISSED',
                        notes='Auto-marked missed — 20 min grace period exceeded',
                    )

                current_status = log.status if log else 'PENDING'

                doses.append({
                    'medication_id':   med.id,
                    'medication_name': med.name,
                    'dosage':          med.dosage,
                    'schedule_id':     schedule.id,
                    'time':            schedule.time.strftime('%H:%M'),
                    'dosage_count':    schedule.dosage_count,
                    'instructions':    med.instructions,
                    'status':          current_status,
                    'status_display':  status_labels.get(current_status, current_status.title()),
                    'actual_time':     log.actual_time.isoformat() if (log and log.actual_time) else None,
                    'log_id':          log.id if log else None,
                    'can_update':      log is not None,
                })

        priority = {'MISSED': 0, 'PENDING': 1, 'DELAYED': 2, 'SKIPPED': 3, 'TAKEN': 4}
        doses.sort(key=lambda d: (priority.get(d['status'], 9), d['time']))

        return Response({
            'date':        today.isoformat(),
            'total_doses': len(doses),
            'doses':       doses,
        })


# ============================================================
# REFILLS
# ============================================================

class RequestRefillView(generics.CreateAPIView):
    serializer_class = RequestRefillSerializer
    permission_classes = [IsPatient]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refill = serializer.save(patient=request.user)
        return Response({
            'message': 'Refill request submitted successfully',
            'refill':  MedicationRefillSerializer(refill).data,
        }, status=status.HTTP_201_CREATED)


class MyRefillsListView(generics.ListAPIView):
    serializer_class = MedicationRefillSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        qs = MedicationRefill.objects.filter(
            patient=self.request.user
        ).select_related('medication', 'approved_by')
        if self.request.query_params.get('status'):
            qs = qs.filter(status=self.request.query_params['status'].upper())
        return qs.order_by('-requested_date')


class DoctorRefillsListView(generics.ListAPIView):
    serializer_class = MedicationRefillSerializer
    permission_classes = [IsDoctor]

    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return MedicationRefill.objects.none()
        qs = MedicationRefill.objects.filter(
            medication__prescribed_by=self.request.user.doctor_profile
        ).select_related('medication', 'patient')
        status_filter = self.request.query_params.get('status', 'PENDING')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        return qs.order_by('-requested_date')


class ApproveRefillView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, refill_id):
        if not hasattr(request.user, 'doctor_profile'):
            return Response({'error': 'Doctor profile not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            refill = MedicationRefill.objects.get(
                id=refill_id,
                medication__prescribed_by=request.user.doctor_profile,
            )
        except MedicationRefill.DoesNotExist:
            return Response({'error': 'Refill request not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApproveRefillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        refill.status        = data['status']
        refill.notes         = data.get('notes', '')
        refill.approved_by   = request.user.doctor_profile
        refill.approved_date = datetime.now()
        refill.save()

        return Response({
            'message': f'Refill request {data["status"].lower()}',
            'refill':  MedicationRefillSerializer(refill).data,
        })


# ============================================================
# STATS
# ============================================================

class MedicationStatsView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        today    = date.today()
        week_ago = today - timedelta(days=7)

        all_meds      = Medication.objects.filter(patient=request.user)
        active_meds   = all_meds.filter(is_active=True)
        expired_meds  = all_meds.filter(end_date__lt=today)
        refill_needed = all_meds.filter(is_refill_needed=True)

        today_logs = MedicationLog.objects.filter(medication__patient=request.user, scheduled_date=today)
        week_logs  = MedicationLog.objects.filter(medication__patient=request.user, scheduled_date__gte=week_ago)

        total_doses = week_logs.count()
        taken_doses = week_logs.filter(status='TAKEN').count()
        adherence   = round((taken_doses / total_doses) * 100, 2) if total_doses > 0 else 0

        upcoming = []
        for med in active_meds.prefetch_related('schedules'):
            for s in med.schedules.filter(is_active=True):
                upcoming.append({
                    'medication': med.name,
                    'time':       s.time.strftime('%H:%M'),
                    'dosage':     f"{s.dosage_count} {med.form}",
                })

        stats = {
            'total_medications':   all_meds.count(),
            'active_medications':  active_meds.count(),
            'expired_medications': expired_meds.count(),
            'refill_needed':       refill_needed.count(),
            'adherence_rate':      adherence,
            'doses_taken_today':   today_logs.filter(status='TAKEN').count(),
            'doses_missed_today':  today_logs.filter(status='MISSED').count(),
            'upcoming_doses':      upcoming[:5],
        }

        return Response(MedicationStatsSerializer(stats).data)