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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/types';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Phone,
  Calendar,
  List,
  Pill,
  FileText,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  LogOut,
  Stethoscope,
} from 'lucide-react-native';

type PatientHomeNavigationProp = NativeStackNavigationProp<PatientStackParamList, 'PatientHome'>;

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  user_type: string;
}

export default function PatientHomeScreen() {
  const navigation = useNavigation<PatientHomeNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const refreshToken = await AsyncStorage.getItem('refresh_token');
              if (refreshToken) {
                try {
                  await authAPI.logout(refreshToken);
                } catch (error) {
                  console.log('Logout API error (continuing anyway):', error);
                }
              }
              await signOut();
              console.log('Logged out successfully');
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
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome,</Text>
        <Text style={styles.name}>{user?.first_name || 'Patient'}</Text>
        <Text style={styles.subtitle}>Manage your health in one place</Text>
      </View>

      {/* Quick Info Card */}
      {user && (
        <View style={styles.infoCard}>
          <Mail size={16} color="#166534" />
          <Text style={styles.infoText}>{user.email}</Text>
          {user.phone_number && (
            <>
              <Phone size={16} color="#166534" style={styles.phoneIcon} />
              <Text style={styles.infoText}>{user.phone_number}</Text>
            </>
          )}
        </View>
      )}

      {/* Feature Grid */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
            <Calendar size={28} color="#0284c7" />
          </View>
          <Text style={styles.gridTitle}>Book</Text>
          <Text style={styles.gridSubtitle}>Appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate('MyAppointments')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#fef9c3' }]}>
            <List size={28} color="#ca8a04" />
          </View>
          <Text style={styles.gridTitle}>My</Text>
          <Text style={styles.gridSubtitle}>Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate('Medications')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
            <Pill size={28} color="#16a34a" />
          </View>
          <Text style={styles.gridTitle}>Medications</Text>
          <Text style={styles.gridSubtitle}>Track & Reminders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate('Documents')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#f1f5f9' }]}>
            <FileText size={28} color="#334155" />
          </View>
          <Text style={styles.gridTitle}>Medical</Text>
          <Text style={styles.gridSubtitle}>Documents</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Card */}
      <TouchableOpacity
        style={styles.emergencyCard}
        onPress={() => Alert.alert('Emergency', 'Call emergency services: 911')}
      >
        <View style={styles.emergencyIcon}>
          <AlertCircle size={32} color="#fff" />
        </View>
        <View style={styles.emergencyTextContainer}>
          <Text style={styles.emergencyTitle}>Emergency</Text>
          <Text style={styles.emergencySubtitle}>Tap to call ambulance</Text>
        </View>
        <ChevronRight size={24} color="#fff" />
      </TouchableOpacity>

      {/* Doctor Registration Card */}
      {user && user.user_type === 'patient' && (
        <TouchableOpacity
          style={styles.doctorCard}
          onPress={() => navigation.navigate('DoctorRegistration')}
        >
          <View style={styles.doctorIcon}>
            <Stethoscope size={32} color="#16a34a" />
          </View>
          <View style={styles.doctorTextContainer}>
            <Text style={styles.doctorTitle}>Are you a doctor?</Text>
            <Text style={styles.doctorSubtitle}>
              Register to start accepting appointments
            </Text>
          </View>
          <ArrowRight size={24} color="#16a34a" />
        </TouchableOpacity>
      )}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={22} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    color: '#4b5563',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 6,
    marginRight: 12,
  },
  phoneIcon: {
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14532d',
    textAlign: 'center',
  },
  gridSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  emergencyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emergencyTextContainer: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  doctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorTextContainer: {
    flex: 1,
  },
  doctorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14532d',
  },
  doctorSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
  },
});