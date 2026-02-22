import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { authAPI } from '../../services/api';

// Define TypeScript interfaces for better type safety
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  user_type: string;
}

interface NavigationProps {
  reset: (params: { index: number; routes: Array<{ name: string }> }) => void;
  navigate: (screen: string) => void;
}

export default function PatientHomeScreen() {
  // Set up navigation with proper typing
  const navigation = useNavigation<NavigationProps>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout functionality
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get refresh token
              const refreshToken = await AsyncStorage.getItem('refresh_token');
              
              if (refreshToken) {
                // Call backend to blacklist token
                try {
                  await authAPI.logout(refreshToken);
                  console.log('Token blacklisted successfully');
                } catch (error) {
                  console.log('Logout API error (continuing anyway):', error);
                }
              }
              
              // Clear all stored data
              await AsyncStorage.multiRemove([
                'access_token',
                'refresh_token',
                'user',
              ]);
              
              console.log('Logged out successfully');
              
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Section */}
      <Text style={styles.title}>
        👋 Welcome, {user?.first_name || 'Patient'}
      </Text>
      <Text style={styles.subtitle}>
        Manage your health in one place
      </Text>

      {/* User Info Card */}
      {user && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>📧 {user.email}</Text>
          {user.phone_number && (
            <Text style={styles.infoText}>📱 {user.phone_number}</Text>
          )}
        </View>
      )}

      {/* Feature Cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🩺 Book Appointment</Text>
        <Text style={styles.cardText}>
          Schedule a visit with a doctor
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 My Appointments</Text>
        <Text style={styles.cardText}>
          View upcoming and past appointments
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MyAppointments')}
        >
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💊 My Medications</Text>
        <Text style={styles.cardText}>
          Track your medications and reminders
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Medications')}
        >
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📄 Medical Documents</Text>
        <Text style={styles.cardText}>
          Upload and view your medical records
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Documents')}
        >
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Contact Card */}
      <View style={[styles.card, styles.emergencyCard]}>
        <Text style={styles.cardTitle}>🚑 Emergency</Text>
        <Text style={styles.cardText}>
          In case of emergency, contact your doctor immediately
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.emergencyButton]}
          onPress={() => Alert.alert('Emergency', 'Call emergency services: 911')}
        >
          <Text style={styles.buttonText}>Emergency Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Doctor Registration Card - FIXED: Moved inside return and fixed condition */}
      {user && user.user_type === 'patient' && (
        <View style={styles.doctorRegistrationCard}>
          <Text style={styles.doctorRegistrationTitle}>👨‍⚕️ Are you a doctor?</Text>
          <Text style={styles.doctorRegistrationText}>
            Register as a doctor to start accepting appointments and manage your practice.
          </Text>
          <TouchableOpacity
            style={styles.doctorRegistrationButton}
            onPress={() => navigation.navigate('DoctorRegistration')}
          >
            <Text style={styles.doctorRegistrationButtonText}>
              Register as Doctor
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f7fb',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#e0e7ff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 5,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyCard: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#000',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  logoutBtn: {
    marginTop: 30,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#e11d48',
    fontSize: 16,
    fontWeight: '600',
  },
  doctorRegistrationCard: {
    backgroundColor: '#e0f2fe',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  doctorRegistrationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0369a1',
  },
  doctorRegistrationText: {
    fontSize: 14,
    color: '#0c4a6e',
    marginBottom: 15,
  },
  doctorRegistrationButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  doctorRegistrationButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});