from django.contrib import admin
from django.utils import timezone
from .models import DoctorProfile, DoctorAvailability, DoctorReview


class DoctorAvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 0
    readonly_fields = ['created_at'] if hasattr(DoctorAvailability, 'created_at') else []


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = [
        'get_doctor_name', 'specialization',
        'verification_status', 'license_number',
        'experience_years', 'is_available', 'created_at'
    ]
    list_filter = ['verification_status', 'specialization', 'is_available']
    search_fields = ['user__first_name', 'user__last_name', 'license_number']
    readonly_fields = ['created_at', 'updated_at', 'verified_at', 'verified_by', 'rating']
    actions = ['approve_doctors', 'reject_doctors', 'reset_to_pending']
    inlines = [DoctorAvailabilityInline]

    fieldsets = (
        ('Doctor Info', {
            'fields': ('user', 'specialization', 'license_number', 'qualification', 'experience_years')
        }),
        ('Verification', {
            'fields': ('verification_status', 'rejection_reason', 'verified_at', 'verified_by'),
            'classes': ('collapse',),
        }),
        ('Practice Details', {
            'fields': ('consultation_fee', 'bio', 'clinic_address', 'is_available'),
        }),
        ('Stats', {
            'fields': ('rating', 'total_patients', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Doctor Name')
    def get_doctor_name(self, obj):
        return f"Dr. {obj.user.get_full_name()}"

    @admin.action(description='✅ Approve selected doctors')
    def approve_doctors(self, request, queryset):
        updated = queryset.update(
            verification_status='APPROVED',
            verified_at=timezone.now(),
            verified_by=request.user,
            rejection_reason=''
        )
        self.message_user(request, f'✅ {updated} doctor(s) approved successfully.')

    @admin.action(description='❌ Reject selected doctors')
    def reject_doctors(self, request, queryset):
        updated = queryset.update(
            verification_status='REJECTED',
            rejection_reason='Does not meet verification requirements.'
        )
        self.message_user(request, f'❌ {updated} doctor(s) rejected.')

    @admin.action(description='🔄 Reset to Pending')
    def reset_to_pending(self, request, queryset):
        updated = queryset.update(
            verification_status='PENDING',
            rejection_reason='',
            verified_at=None,
            verified_by=None
        )
        self.message_user(request, f'🔄 {updated} doctor(s) reset to pending.')


@admin.register(DoctorReview)
class DoctorReviewAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'patient', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['doctor__user__first_name', 'patient__first_name']