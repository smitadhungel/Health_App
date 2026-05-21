from django.contrib import admin
from .models import MedicalDocument, DocumentShare, Prescription, PrescriptionMedication


class PrescriptionMedicationInline(admin.TabularInline):
    model = PrescriptionMedication
    extra = 0
    fields = ['medicine_name', 'dosage', 'frequency', 'duration', 'instructions']


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_doctor_name', 'get_patient_name', 'status', 'issued_at', 'created_at']
    list_filter = ['status']
    search_fields = [
        'doctor__user__first_name', 'doctor__user__last_name',
        'patient__first_name', 'patient__last_name'
    ]
    readonly_fields = ['issued_at', 'viewed_at', 'created_at', 'updated_at']
    inlines = [PrescriptionMedicationInline]

    @admin.display(description='Doctor')
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}"

    @admin.display(description='Patient')
    def get_patient_name(self, obj):
        return obj.patient.get_full_name()


@admin.register(MedicalDocument)
class MedicalDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'patient', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['title', 'patient__first_name', 'patient__last_name']