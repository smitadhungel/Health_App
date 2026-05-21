# ============================================
# documents/views.py
# ============================================

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import secrets
from .models import MedicalDocument, DocumentShare, DocumentAccessLog,Prescription, PrescriptionMedication
from doctor.models import DoctorProfile
from .serializers import (
    MedicalDocumentSerializer,
    UploadDocumentSerializer,
    UpdateDocumentSerializer,
    ShareDocumentSerializer,
    ShareWithDoctorSerializer,
    DocumentListSerializer,
    DocumentShareSerializer,
    DocumentAccessLogSerializer, PrescriptionSerializer,
    PrescriptionListSerializer,
    CreatePrescriptionSerializer,
    UpdatePrescriptionSerializer,
    DoctorSharedDocumentSerializer,
)
from .permissions import IsPatient, IsDoctor, IsDocumentOwner
from doctor.permissions import IsDoctor, IsPatient
# ============================================
# HELPER FUNCTION
# ============================================

def log_document_access(document, user, action, request):
    """Log document access for audit trail"""
    ip_address = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    DocumentAccessLog.objects.create(
        document=document,
        accessed_by=user,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent
    )


# ============================================
# DOCUMENT UPLOAD & MANAGEMENT VIEWS
# ============================================

class UploadDocumentView(generics.CreateAPIView):
    """Upload a new medical document (patients only)"""
    serializer_class = UploadDocumentSerializer
    permission_classes = [IsPatient]
    
    def perform_create(self, serializer):
        document = serializer.save(
            patient=self.request.user,
            uploaded_by=self.request.user
        )
        
        # Log the upload
        log_document_access(document, self.request.user, 'UPDATE', self.request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the created document with full details
        document = MedicalDocument.objects.get(id=serializer.instance.id)
        
        return Response({
            'message': 'Document uploaded successfully',
            'document': MedicalDocumentSerializer(document, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class MyDocumentsListView(generics.ListAPIView):
    """List all documents for current patient"""
    serializer_class = DocumentListSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        queryset = MedicalDocument.objects.filter(
            patient=self.request.user
        ).prefetch_related('shared_with_doctors', 'shares')
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category.upper())
        
        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        
        if from_date:
            queryset = queryset.filter(document_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(document_date__lte=to_date)
        
        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'documents': serializer.data
        })


class DocumentDetailView(generics.RetrieveAPIView):
    """Get detailed information about a specific document"""
    serializer_class = MedicalDocumentSerializer
    permission_classes = [IsAuthenticated, IsDocumentOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        user = self.request.user
        
        # Patients see their own documents
        if user.role == 'PATIENT':
            return MedicalDocument.objects.filter(patient=user)
        
        # Doctors see documents shared with them
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return MedicalDocument.objects.filter(
                shared_with_doctors=user.doctor_profile
            )
        
        return MedicalDocument.objects.none()
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log the view
        log_document_access(instance, request.user, 'VIEW', request)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UpdateDocumentView(generics.UpdateAPIView):
    """Update document details (not the file itself)"""
    serializer_class = UpdateDocumentSerializer
    permission_classes = [IsPatient, IsDocumentOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        return MedicalDocument.objects.filter(patient=self.request.user)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log the update
        log_document_access(instance, request.user, 'UPDATE', request)
        
        return Response({
            'message': 'Document updated successfully',
            'document': MedicalDocumentSerializer(instance, context={'request': request}).data
        })


class DeleteDocumentView(generics.DestroyAPIView):
    """Delete a document"""
    permission_classes = [IsPatient, IsDocumentOwner]
    lookup_field = 'id'
    
    def get_queryset(self):
        return MedicalDocument.objects.filter(patient=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log the deletion before deleting
        log_document_access(instance, request.user, 'DELETE', request)
        
        # Delete the document (file will be auto-deleted via model method)
        self.perform_destroy(instance)
        
        return Response({
            'message': 'Document deleted successfully'
        }, status=status.HTTP_200_OK)


# ============================================
# DOCUMENT SHARING VIEWS
# ============================================

class ShareDocumentView(APIView):
    """Share document via Email/WhatsApp/Link"""
    permission_classes = [IsPatient]
    
    def post(self, request, document_id):
        try:
            document = MedicalDocument.objects.get(
                id=document_id,
                patient=request.user
            )
        except MedicalDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ShareDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        share_method = data['share_method']
        expires_in_days = data.get('expires_in_days', 7)
        
        # Generate share token
        share_token = secrets.token_urlsafe(32)
        
        # Calculate expiration
        expires_at = timezone.now() + timedelta(days=expires_in_days)
        
        # Create share record
        share = DocumentShare.objects.create(
            document=document,
            shared_by=request.user,
            shared_with_email=data.get('email', ''),
            shared_with_phone=data.get('phone', ''),
            share_method=share_method,
            share_token=share_token,
            expires_at=expires_at
        )
        
        # Log the share
        log_document_access(document, request.user, 'SHARE', request)
        
        # Generate share link
        share_link = request.build_absolute_uri(
            f'/api/documents/shared/{share_token}/'
        )
        
        # Generate WhatsApp link if needed
        whatsapp_link = None
        if share_method == 'WHATSAPP':
            phone = data.get('phone', '').replace('+', '').replace(' ', '')
            message = f"Medical Document: {document.title}\n\nView here: {share_link}"
            whatsapp_link = f"https://wa.me/{phone}?text={message}"
        
        return Response({
            'message': 'Document shared successfully',
            'share': DocumentShareSerializer(share).data,
            'share_link': share_link,
            'whatsapp_link': whatsapp_link,
            'expires_at': expires_at
        }, status=status.HTTP_201_CREATED)


class ShareWithDoctorView(APIView):
    """Share document with specific doctors"""
    permission_classes = [IsPatient]
    
    def post(self, request, document_id):
        try:
            document = MedicalDocument.objects.get(
                id=document_id,
                patient=request.user
            )
        except MedicalDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ShareWithDoctorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        doctor_ids = serializer.validated_data['doctor_ids']
        doctors = DoctorProfile.objects.filter(id__in=doctor_ids)
        
        # Add doctors to shared list
        document.shared_with_doctors.add(*doctors)
        # document.is_shared_with_doctor = True
        # document.save()
        
        # Log the share
        log_document_access(document, request.user, 'SHARE', request)
        
        return Response({
            'message': f'Document shared with {doctors.count()} doctor(s)',
            'shared_with': [
                {
                    'id': doctor.id,
                    'name': doctor.user.get_full_name(),
                    'specialization': doctor.get_specialization_display()
                }
                for doctor in doctors
            ]
        })


class UnshareWithDoctorView(APIView):
    """Remove sharing access from specific doctors"""
    permission_classes = [IsPatient]
    
    def post(self, request, document_id):
        try:
            document = MedicalDocument.objects.get(
                id=document_id,
                patient=request.user
            )
        except MedicalDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        doctor_ids = request.data.get('doctor_ids', [])
        
        if not doctor_ids:
            return Response(
                {'error': 'doctor_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        doctors = DoctorProfile.objects.filter(id__in=doctor_ids)
        
        # Remove doctors from shared list
        document.shared_with_doctors.remove(*doctors)
        
        # Update shared status
        # if not document.shared_with_doctors.exists():
        #     document.is_shared_with_doctor = False
        #     document.save()
        
        return Response({
            'message': f'Sharing removed for {doctors.count()} doctor(s)'
        })


# ============================================
# DOCTOR VIEWS - Access Shared Documents
# ============================================

class DoctorSharedDocumentsView(generics.ListAPIView):
    """List documents shared with the current doctor"""
    serializer_class = DoctorSharedDocumentSerializer
    permission_classes = [IsDoctor]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return MedicalDocument.objects.none()
        
        queryset = MedicalDocument.objects.filter(
            shared_with_doctors=self.request.user.doctor_profile
        ).select_related('patient')
        
        # Filter by patient
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient__id=patient_id)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category.upper())
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'documents': serializer.data
        })


# ============================================
# PUBLIC SHARED LINK VIEW
# ============================================

class SharedDocumentView(APIView):
    """Access document via share token (public)"""
    permission_classes = []
    
    def get(self, request, share_token):
        try:
            share = DocumentShare.objects.get(
                share_token=share_token,
                is_active=True
            )
        except DocumentShare.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired share link'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if expired
        if share.expires_at and share.expires_at < timezone.now():
            share.is_active = False
            share.save()
            return Response(
                {'error': 'This share link has expired'},
                status=status.HTTP_410_GONE
            )
        
        # Update access count
        share.accessed_count += 1
        share.last_accessed_at = timezone.now()
        share.save()
        
        # Return document info (not the full file for security)
        document = share.document
        
        return Response({
            'title': document.title,
            'category': document.get_category_display(),
            'description': document.description,
            'document_date': document.document_date,
            'file_url': request.build_absolute_uri(document.file.url),
            'file_size': document.file_size,
            'shared_by': document.patient.get_full_name(),
            'accessed_count': share.accessed_count
        })


# ============================================
# DOCUMENT ACCESS LOGS VIEW
# ============================================

class DocumentAccessLogsView(generics.ListAPIView):
    """View access logs for a specific document (patients only)"""
    serializer_class = DocumentAccessLogSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self):
        document_id = self.kwargs.get('document_id')
        return DocumentAccessLog.objects.filter(
            document__id=document_id,
            document__patient=self.request.user
        ).select_related('accessed_by').order_by('-accessed_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        if not queryset.exists():
            # Check if document exists
            document_id = self.kwargs.get('document_id')
            if not MedicalDocument.objects.filter(
                id=document_id,
                patient=request.user
            ).exists():
                return Response(
                    {'error': 'Document not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'count': queryset.count(),
            'logs': serializer.data
        })
    


# ============================================
# PRESCRIPTION VIEWS — add to documents/views.py
# ============================================

# from .models import (
#     MedicalDocument, DocumentShare, DocumentAccessLog,
#     Prescription, PrescriptionMedication
# )
# from .serializers import (
#     # ... your existing serializer imports ...
#     PrescriptionSerializer,
#     PrescriptionListSerializer,
#     CreatePrescriptionSerializer,
#     UpdatePrescriptionSerializer,
# )


class CreatePrescriptionView(generics.CreateAPIView):
    """Doctor creates a prescription for a patient"""
    serializer_class = CreatePrescriptionSerializer
    permission_classes = [IsDoctor]

    def perform_create(self, serializer):
        serializer.save(
            doctor=self.request.user.doctor_profile,
            status='ISSUED',
            issued_at=timezone.now()
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            'message': 'Prescription issued successfully',
            'prescription': PrescriptionSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)


class PatientPrescriptionsView(generics.ListAPIView):
    """Patient views all their prescriptions"""
    serializer_class = PrescriptionListSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        return Prescription.objects.filter(
            patient=self.request.user
        ).select_related('doctor__user', 'related_document').prefetch_related('medications')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Mark ISSUED ones as VIEWED
        queryset.filter(status='ISSUED').update(
            status='VIEWED',
            viewed_at=timezone.now()
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'prescriptions': serializer.data
        })


class DoctorPrescriptionsView(generics.ListAPIView):
    """Doctor views prescriptions they have issued"""
    serializer_class = PrescriptionListSerializer
    permission_classes = [IsDoctor]

    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return Prescription.objects.none()
        return Prescription.objects.filter(
            doctor=self.request.user.doctor_profile
        ).select_related('patient').prefetch_related('medications')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'prescriptions': serializer.data
        })


class PrescriptionDetailView(generics.RetrieveAPIView):
    """Get full details of a single prescription"""
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Prescription.objects.filter(patient=user)
        elif user.role == 'DOCTOR' and hasattr(user, 'doctor_profile'):
            return Prescription.objects.filter(doctor=user.doctor_profile)
        return Prescription.objects.none()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Mark as viewed if patient is reading it
        if request.user.role == 'PATIENT' and instance.status == 'ISSUED':
            instance.status = 'VIEWED'
            instance.viewed_at = timezone.now()
            instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UpdatePrescriptionView(generics.UpdateAPIView):
    """Doctor updates a prescription (only DRAFT or ISSUED)"""
    serializer_class = UpdatePrescriptionSerializer
    permission_classes = [IsDoctor]
    lookup_field = 'id'

    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return Prescription.objects.none()
        return Prescription.objects.filter(
            doctor=self.request.user.doctor_profile,
            status__in=['DRAFT', 'ISSUED']
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'message': 'Prescription updated successfully',
            'prescription': PrescriptionSerializer(instance).data
        })