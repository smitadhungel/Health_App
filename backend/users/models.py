from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Custom user model with role-based access
    """
    ROLE_CHOICES = [
        ('PATIENT', 'Patient'),
        ('DOCTOR', 'Doctor'),
        ('PHARMACY', 'Pharmacy'),
        ('ADMIN', 'Admin'),
    ]
    
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='PATIENT'
    )
    
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Fix the clash with default User model
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        related_name='custom_user_set',
        related_query_name='custom_user',
    )

    # here lets make the email unique identifier 
    USERNAME_FIELD ='email'
    REQUIRED_FIELDS=['username','first_name','last_name']

    class Meta:
        verbose_name="User"
        verbose_name_plural='Users'
        db_table = 'users'

    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
   
