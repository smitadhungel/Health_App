from  rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password



class UserRegistrationSerializer(serializers.ModelSerializer):
    """ Serializers for the user registration """
    password = serializers.CharField(write_only=True)
    password2=serializers.CharField(write_only=True,required=True)

    class Meta:
        model=User
        fields=['email', 'username', 'first_name', 'last_name', 'phone_number', 'password', 'password2','role']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password']!=attrs['password2']:
            raise serializers.ValidationError({"password":"Password fileds Dont match"})
        
        return attrs
    
    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value.lower()  # Store emails in lowercase


    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user
    
    

class UserSerializer(serializers.ModelSerializer):

    role_display = serializers.CharField(source='get_role_display', read_only=True)
      
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'phone_number', 'created_at','role_display']
        read_only_fields = ['id', 'email','role','created_at','role_display']

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 
            'phone_number', 'date_of_birth', 'profile_picture'
        ]

