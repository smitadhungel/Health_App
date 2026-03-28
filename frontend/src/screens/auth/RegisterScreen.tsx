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
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

interface RegisterResponse {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
    first_name?: string;
    last_name?: string;
  };
  access?: string;
  refresh?: string;
  message?: string;
}

export default function RegisterScreen({ navigation }: any) {
  const { signIn } = useAuth();
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

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authAPI.register(formData) as RegisterResponse;
      console.log('Registration response:', response);

      // If backend returns tokens, auto-login via auth context
      if (response?.access && response?.refresh) {
        // Build a user object from response (or use response.user if present)
        const user = response.user || {
          id: null,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
        };
        await signIn(response.access, response.refresh, user);
        // No navigation – root navigator will switch to the appropriate stack
      } else {
        // No auto-login, ask user to log in manually
        Alert.alert(
          'Success',
          response.message || 'Account created successfully! Please log in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
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
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={formData.first_name}
              onChangeText={(text) => handleChange('first_name', text)}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              value={formData.last_name}
              onChangeText={(text) => handleChange('last_name', text)}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Username *"
              value={formData.username}
              onChangeText={(text) => handleChange('username', text)}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (optional)"
              value={formData.phone_number}
              onChangeText={(text) => handleChange('phone_number', text)}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(text) => handleChange('password', text)}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={formData.password2}
              onChangeText={(text) => handleChange('password2', text)}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

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

// Styles remain the same (use your existing styles)
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
    backgroundColor: '#16a34a',
    borderColor: '#137737',
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
    backgroundColor: '#16a34a',
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
    color: '#16a34a',
    fontWeight: '600',
  },
});