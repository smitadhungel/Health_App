// src/screens/auth/RegisterScreen.tsx
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

export default function RegisterScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'PATIENT', // Default role
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
  console.log('=== REGISTRATION START ===');
  console.log('Form data:', formData);
  
  if (!formData.email || !formData.username || !formData.password || !formData.first_name || !formData.last_name) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  if (formData.password !== formData.password2) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  setLoading(true);
  try {
    console.log('Calling authAPI.register...');
    const response = await authAPI.register(formData);
    console.log('Registration SUCCESS:', response);
    
    Alert.alert('Success', 'Registration successful! Please login.', [
      { text: 'OK', onPress: () => navigation.navigate('Login') },
    ]);
  } catch (error: any) {
    console.log('=== ERROR CAUGHT ===');
    console.log('Full error object:', error);
    console.log('Error message:', error?.message);
    console.log('Error response:', error?.response);
    console.log('Error response data:', error?.response?.data);
    console.log('Error response status:', error?.response?.status);
    console.log('Error config:', error?.config);
    
    let errorMessage = 'Registration failed';
    
    if (error?.response?.data) {
      // Backend returned an error
      const data = error.response.data;
      errorMessage = data.email?.[0] || 
                    data.username?.[0] ||
                    data.password?.[0] ||
                    data.error ||
                    JSON.stringify(data);
    } else if (error?.message) {
      // Network or other error
      errorMessage = error.message;
    }
    
    console.log('Final error message:', errorMessage);
    Alert.alert('Registration Failed', errorMessage);
  } finally {
    setLoading(false);
    console.log('=== REGISTRATION END ===');
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
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>I am a:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'PATIENT' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, role: 'PATIENT' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'PATIENT' && styles.roleButtonTextActive,
                  ]}
                >
                  Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'DOCTOR' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, role: 'DOCTOR' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'DOCTOR' && styles.roleButtonTextActive,
                  ]}
                >
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Last Name *"
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Username *"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phone_number}
              onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={formData.password2}
              onChangeText={(text) => setFormData({ ...formData, password2: text })}
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
                <Text style={styles.buttonText}>
                  Register as {formData.role === 'PATIENT' ? 'Patient' : 'Doctor'}
                </Text>
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
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  roleContainer: {
    marginBottom: 25,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
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
    backgroundColor: '#007AFF',
    padding: 15,
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
    color: '#007AFF',
    fontWeight: '600',
  },
});