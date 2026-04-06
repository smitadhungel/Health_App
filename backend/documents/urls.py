from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    path('upload/', views.UploadDocumentView.as_view(), name='upload-document'),
    path('my-documents/', views.MyDocumentsListView.as_view(), name='my-documents'),
    path('<int:id>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('<int:id>/update/', views.UpdateDocumentView.as_view(), name='update-document'),
    path('<int:id>/delete/', views.DeleteDocumentView.as_view(), name='delete-document'),
    path('<int:document_id>/share/', views.ShareDocumentView.as_view(), name='share-document'),
    path('<int:document_id>/share-with-doctor/', views.ShareWithDoctorView.as_view(), name='share-with-doctor'),
    path('<int:document_id>/unshare-with-doctor/', views.UnshareWithDoctorView.as_view(), name='unshare-with-doctor'),
    path('<int:document_id>/access-logs/', views.DocumentAccessLogsView.as_view(), name='document-access-logs'),
    path('doctor/shared-documents/', views.DoctorSharedDocumentsView.as_view(), name='doctor-shared-documents'),
    path('shared/<str:share_token>/', views.SharedDocumentView.as_view(), name='shared-document'),

    # Prescriptions
    path('prescriptions/create/', views.CreatePrescriptionView.as_view(), name='create-prescription'),
    path('prescriptions/my/', views.PatientPrescriptionsView.as_view(), name='my-prescriptions'),
    path('prescriptions/doctor/', views.DoctorPrescriptionsView.as_view(), name='doctor-prescriptions'),
    path('prescriptions/<int:id>/', views.PrescriptionDetailView.as_view(), name='prescription-detail'),
    path('prescriptions/<int:id>/update/', views.UpdatePrescriptionView.as_view(), name='update-prescription'),
]