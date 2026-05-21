from django.urls import path
from . import views

app_name = 'medications'

urlpatterns = [
    # ============================================
    # MEDICATION MANAGEMENT
    # ============================================

    path('create/',                                 views.CreateMedicationView.as_view(),       name='create-medication'),
    path('my-medications/',                         views.MyMedicationsListView.as_view(),       name='my-medications'),
    path('<int:id>/',                               views.MedicationDetailView.as_view(),        name='medication-detail'),
    path('<int:id>/update/',                        views.UpdateMedicationView.as_view(),        name='update-medication'),
    path('<int:id>/delete/',                        views.DeleteMedicationView.as_view(),        name='delete-medication'),

    # ============================================
    # MEDICATION SCHEDULES
    # ============================================

    path('<int:medication_id>/add-schedule/',       views.AddScheduleView.as_view(),             name='add-schedule'),
    path('<int:medication_id>/schedules/',          views.MedicationSchedulesView.as_view(),     name='medication-schedules'),

    # ============================================
    # MEDICATION LOGGING
    # ============================================

    path('<int:medication_id>/log/',                views.LogMedicationView.as_view(),           name='log-medication'),
    path('<int:medication_id>/logs/',               views.MedicationLogsView.as_view(),          name='medication-logs'),

    # THIS WAS MISSING — caused the DOCTYPE/HTML error when updating log status
    path('logs/<int:log_id>/update/',               views.UpdateLogStatusView.as_view(),         name='update-log-status'),

    # ============================================
    # TODAY'S DOSES
    # ============================================

    path('todays-doses/',                           views.TodaysDosesView.as_view(),             name='todays-doses'),

    # ============================================
    # MEDICATION REFILLS
    # ============================================

    path('refill/request/',                         views.RequestRefillView.as_view(),           name='request-refill'),
    path('refill/my-requests/',                     views.MyRefillsListView.as_view(),           name='my-refills'),
    path('refill/doctor-requests/',                 views.DoctorRefillsListView.as_view(),       name='doctor-refills'),
    path('refill/<int:refill_id>/approve/',         views.ApproveRefillView.as_view(),           name='approve-refill'),

    # ============================================
    # STATISTICS
    # ============================================

    path('stats/',                                  views.MedicationStatsView.as_view(),         name='medication-stats'),
]