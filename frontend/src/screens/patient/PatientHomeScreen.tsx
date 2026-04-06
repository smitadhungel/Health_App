import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/types';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Mail, Phone, Calendar, Pill, FileText,
  AlertCircle, ChevronRight, ArrowRight,
  LogOut, Stethoscope, Hospital, ClipboardList,
} from 'lucide-react-native';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientHome'>;

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
}

export default function PatientHomeScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              try { await authAPI.logout(refreshToken); } catch {}
            }
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const quickActions = [
    {
      title: 'Book', subtitle: 'Appointment',
      icon: <Calendar size={28} color="#0284c7" />,
      bg: '#e0f2fe', onPress: () => navigation.navigate('BookAppointment'),
    },
    {
      title: 'Hospital', subtitle: 'Nearby',
      icon: <Hospital size={28} color="#ca8a04" />,
      bg: '#fef9c3', onPress: () => navigation.navigate('PlaceDetails'),
    },
    {
      title: 'Medications', subtitle: 'Track & Reminders',
      icon: <Pill size={28} color="#16a34a" />,
      bg: '#dcfce7', onPress: () => navigation.navigate('Medications'),
    },
    {
      title: 'Documents', subtitle: 'Medical Records',
      icon: <FileText size={28} color="#334155" />,
      bg: '#f1f5f9', onPress: () => navigation.navigate('Documents'),
    },
    {
      title: 'Prescriptions', subtitle: 'From Doctors',
      icon: <ClipboardList size={28} color="#7c3aed" />,
      bg: '#ede9fe', onPress: () => navigation.navigate('Prescriptions'),
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.first_name || 'Patient'} 👋</Text>
        <Text style={styles.subtitle}>Manage your health in one place</Text>
      </View>

      {/* Info Card */}
      {user && (
        <View style={styles.infoCard}>
          <Mail size={16} color="#166534" />
          <Text style={styles.infoText}>{user.email}</Text>
          {user.phone_number && (
            <>
              <Phone size={16} color="#166534" style={{ marginLeft: 8 }} />
              <Text style={styles.infoText}>{user.phone_number}</Text>
            </>
          )}
        </View>
      )}

      {/* Quick Actions Grid */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {quickActions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.gridCard}
            onPress={item.onPress}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
              {item.icon}
            </View>
            <Text style={styles.gridTitle}>{item.title}</Text>
            <Text style={styles.gridSubtitle}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Emergency */}
      <TouchableOpacity
        style={styles.emergencyCard}
        onPress={() => Alert.alert('Emergency', 'Call emergency services: 102')}
      >
        <View style={styles.emergencyIcon}>
          <AlertCircle size={32} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emergencyTitle}>Emergency</Text>
          <Text style={styles.emergencySubtitle}>Tap to call ambulance</Text>
        </View>
        <ChevronRight size={24} color="#fff" />
      </TouchableOpacity>

      

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f0fdf4', flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  header: { marginBottom: 20 },
  greeting: { fontSize: 15, color: '#4b5563' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#14532d', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6b7280' },
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#dcfce7', paddingVertical: 10,
    paddingHorizontal: 14, borderRadius: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#bbf7d0',
  },
  infoText: { fontSize: 13, color: '#166534', marginLeft: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#14532d', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  gridCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  gridTitle: { fontSize: 15, fontWeight: '600', color: '#14532d', textAlign: 'center' },
  gridSubtitle: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  emergencyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ef4444', borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  emergencyIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  emergencyTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  emergencySubtitle: { fontSize: 12, color: '#fff', opacity: 0.9 },
  doctorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  doctorIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ecfdf5', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  doctorTitle: { fontSize: 15, fontWeight: '600', color: '#14532d' },
  doctorSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fef2f2',
    paddingVertical: 14, borderRadius: 30,
    borderWidth: 1, borderColor: '#fee2e2', marginBottom: 20,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#dc2626', marginLeft: 8 },
});