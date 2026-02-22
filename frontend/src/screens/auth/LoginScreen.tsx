// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI,doctorsAPI } from '../../services/api';

interface LoginResponse {
  access?: string;
  refresh?: string;
  tokens?: {
    access: string;
    refresh: string;
  };
  user?: any;
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response: LoginResponse = await authAPI.login(email, password);
      console.log('🔍 RAW RESPONSE:', JSON.stringify(response, null, 2));

      // Try to extract tokens and user – handle various structures
      let accessToken, refreshToken, user;

      // Case 1: tokens at top level (most common with DRF + SimpleJWT)
      if (response?.access && response?.refresh) {
        accessToken = response.access;
        refreshToken = response.refresh;
        user = response.user;
      }
      // Case 2: tokens inside a 'tokens' object
      else if (response?.tokens?.access && response?.tokens?.refresh) {
        accessToken = response.tokens.access;
        refreshToken = response.tokens.refresh;
        user = response.user;
      }
      else {
        console.error(' Unrecognized response structure:', response);
        throw new Error('Invalid response from server');
      }

      if (!user) {
        throw new Error('User data missing in response');
      }

      // Save tokens
      try {
        await AsyncStorage.setItem('access_token', accessToken);
        await AsyncStorage.setItem('refresh_token', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(user));
      } catch (storageError) {
        console.error('AsyncStorage error:', storageError);
        Alert.alert('Error', 'Failed to save login information');
        return;
      }

      // Determine role – adjust field name based on your backend (role, role_display, user_type, etc.)
      const userRole = (user.role || user.role_display || user.user_type || '').toUpperCase();
      await AsyncStorage.setItem('user_role', userRole || 'PATIENT');
      console.log('User role:', userRole);

      // Navigate based on role
      if (userRole === 'DOCTOR') {
  try {
    await doctorsAPI.getMyProfile();
    // profile exists
    navigation.replace('DoctorsDashboard');
  } catch (error: any) {
    if (error.response?.status === 404) {
      navigation.replace('DoctorDetails');
    } else {
      // other error, maybe still go to dashboard and show error
      navigation.replace('DoctorDashboard');
    }
  }
} else {
  navigation.replace('PatientHome');
}
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.data) {
        const data = error.response.data;
        errorMessage = data.detail || data.error || data.message || JSON.stringify(data);
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#999"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#999"
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#000' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  form: { width: '100%' },
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
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 14 },
  linkBold: { color: '#007AFF', fontWeight: '600' },
});