import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';

// Define types for form data
interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'PATIENT' | 'DOCTOR';
}

// Expected response from your backend after registration
interface RegisterResponse {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
    // ... other fields
  };
  access?: string;   // if auto-login is enabled
  refresh?: string;  // if auto-login is enabled
  message?: string;  // e.g., "Account created successfully"
}

export default function RegisterScreen({ navigation }: any) {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'PATIENT',
  });
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const { email, username, password, password2, first_name, last_name } = formData;

    if (!email || !username || !password || !first_name || !last_name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (password !== password2) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Registering with:', formData);
      const response = await authAPI.register(formData) as RegisterResponse;
      console.log('Registration response:', response);

      // CASE 1: Backend returns tokens (auto‑login)
      if (response?.access && response?.refresh) {
        await AsyncStorage.setItem('access_token', response.access);
        await AsyncStorage.setItem('refresh_token', response.refresh);

        // Get user role from response or fallback to form role
        const userRole = response.user?.role || formData.role;
        await AsyncStorage.setItem('user_role', userRole);

        // Navigate based on role
       if (userRole === 'DOCTOR') {
          navigation.replace('DoctorDetails');
      } else {
          navigation.replace('PatientHome');
}
      }
      // CASE 2: Only a success message (no tokens) – ask user to log in
      else {
        Alert.alert(
          'Success',
          response.message || 'Account created successfully! Please log in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      // Extract error message from backend
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.email) {
          errorMessage = `Email: ${Array.isArray(data.email) ? data.email.join(', ') : data.email}`;
        } else if (data.username) {
          errorMessage = `Username: ${Array.isArray(data.username) ? data.username.join(', ') : data.username}`;
        } else if (data.password) {
          errorMessage = `Password: ${Array.isArray(data.password) ? data.password.join(', ') : data.password}`;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        } else {
          // Fallback: stringify the whole object for debugging
          errorMessage = JSON.stringify(data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us to manage your health</Text>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'PATIENT' && styles.roleActive]}
              onPress={() => handleChange('role', 'PATIENT')}
            >
              <Text style={[styles.roleText, formData.role === 'PATIENT' && styles.roleTextActive]}>
                Patient
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'DOCTOR' && styles.roleActive]}
              onPress={() => handleChange('role', 'DOCTOR')}
            >
              <Text style={[styles.roleText, formData.role === 'DOCTOR' && styles.roleTextActive]}>
                Doctor
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {/* First Name */}
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={formData.first_name}
              onChangeText={(text) => handleChange('first_name', text)}
              placeholderTextColor="#999"
            />

            {/* Last Name */}
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              value={formData.last_name}
              onChangeText={(text) => handleChange('last_name', text)}
              placeholderTextColor="#999"
            />

            {/* Username */}
            <TextInput
              style={styles.input}
              placeholder="Username *"
              value={formData.username}
              onChangeText={(text) => handleChange('username', text)}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            {/* Email */}
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            {/* Phone Number */}
            <TextInput
              style={styles.input}
              placeholder="Phone Number (optional)"
              value={formData.phone_number}
              onChangeText={(text) => handleChange('phone_number', text)}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />

            {/* Password */}
            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            {/* Confirm Password */}
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={formData.password2}
              onChangeText={(text) => handleChange('password2', text)}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            {/* Register Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Link to Login */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  roleActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  roleText: {
    color: '#666',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#fff',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#666',
    fontSize: 14,
  },
  linkBold: {
    color: '#4f46e5',
    fontWeight: '600',
  },
});