# ============================================
# documents/urls.py
# ============================================

from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    # ============================================
    # PATIENT ENDPOINTS - Document Management
    # ============================================
    
    # Upload & List
    path('upload/', views.UploadDocumentView.as_view(), name='upload-document'),
    path('my-documents/', views.MyDocumentsListView.as_view(), name='my-documents'),
    
    # View, Update, Delete
    path('<int:id>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('<int:id>/update/', views.UpdateDocumentView.as_view(), name='update-document'),
    path('<int:id>/delete/', views.DeleteDocumentView.as_view(), name='delete-document'),
    
    # Sharing
    path('<int:document_id>/share/', views.ShareDocumentView.as_view(), name='share-document'),
    path('<int:document_id>/share-with-doctor/', views.ShareWithDoctorView.as_view(), name='share-with-doctor'),
    path('<int:document_id>/unshare-with-doctor/', views.UnshareWithDoctorView.as_view(), name='unshare-with-doctor'),
    
    # Access Logs
    path('<int:document_id>/access-logs/', views.DocumentAccessLogsView.as_view(), name='document-access-logs'),
    
    # ============================================
    # DOCTOR ENDPOINTS - View Shared Documents
    # ============================================
    
    path('doctor/shared-documents/', views.DoctorSharedDocumentsView.as_view(), name='doctor-shared-documents'),
    
    # ============================================
    # PUBLIC ENDPOINTS - Shared Links
    # ============================================
    
    path('shared/<str:share_token>/', views.SharedDocumentView.as_view(), name='shared-document'),
]