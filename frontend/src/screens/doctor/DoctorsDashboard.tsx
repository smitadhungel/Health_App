import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { format, isToday, parseISO } from 'date-fns';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentsAPI, doctorsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DoctorStackParamList } from '../../navigation/types';

type DoctorDashboardNavigationProp = NativeStackNavigationProp<DoctorStackParamList>;

interface Appointment {
  id: number;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  status_display: string;
  reason: string;
}

interface Patient {
  id: string;
  name: string;
  last_appointment: string;
}

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
}

interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

const extractArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (data?.appointments && Array.isArray(data.appointments)) return data.appointments;
  return [];
};

export default function DoctorDashboard() {
  const navigation = useNavigation<DoctorDashboardNavigationProp>();
  const { signOut } = useAuth();

  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [doctor, setDoctor] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
  });
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'appointments' | 'patients'>('appointments');

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await appointmentsAPI.getDoctorAppointments();
      const appointmentsArray = extractArray(data) as Appointment[];
      setAppointments(appointmentsArray);

      const patientMap = new Map<string, { name: string; last_appointment: string }>();
      const marks: MarkedDates = {};
      const today = new Date().toISOString().split('T')[0];

      appointmentsArray.forEach((apt) => {
        if (!patientMap.has(apt.patient_name)) {
          patientMap.set(apt.patient_name, {
            name: apt.patient_name,
            last_appointment: apt.appointment_date,
          });
        }
        marks[apt.appointment_date] = {
          marked: true,
          dotColor: apt.status === 'CANCELLED' ? '#ef4444' : '#16a34a',
        };
      });

      setPatients(
        Array.from(patientMap.entries()).map(([id, val]) => ({ id, ...val }))
      );
      setMarkedDates(marks);
      setStats({
        totalPatients: patientMap.size,
        todayAppointments: appointmentsArray.filter(
          (a) => a.appointment_date === today && a.status !== 'CANCELLED'
        ).length,
        pendingAppointments: appointmentsArray.filter(
          (a) => a.status === 'PENDING'
        ).length,
        completedAppointments: appointmentsArray.filter(
          (a) => a.status === 'COMPLETED'
        ).length,
      });
    } catch (error) {
      console.error('Dashboard Load Error:', error);
      Alert.alert('Error', 'Failed to load dashboard. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const checkAndLoad = async () => {
        setIsCheckingProfile(true);
        setLoading(true);
        try {
          // Load user from AsyncStorage for header name
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) setDoctor(JSON.parse(userStr));

          // Check doctor profile — if 404 redirect to DoctorDetails
          try {
            await doctorsAPI.getMyProfile();
            console.log('Doctor profile found, loading dashboard...');
          } catch (profileError: any) {
            console.log('Profile check status:', profileError?.response?.status);
            if (profileError?.response?.status === 404) {
              console.log('No profile found, navigating to DoctorDetails');
              setIsCheckingProfile(false);
              setLoading(false);
              navigation.replace('DoctorDetails');
              return;
            }
            // Non-404 error (network issue etc.) — log and continue
            console.warn('Profile check non-404 error:', profileError?.message);
          }

          // Profile exists → load dashboard data
          await fetchDashboardData();
        } catch (error) {
          console.error('Dashboard init error:', error);
        } finally {
          setIsCheckingProfile(false);
        }
      };

      checkAndLoad();
    }, [fetchDashboardData])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Confirm logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await signOut();
          setLoggingOut(false);
        },
      },
    ]);
  };

  if (isCheckingProfile || (loading && !refreshing)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Syncing Clinical Data...</Text>
      </View>
    );
  }

  const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':   return { bg: '#fff7ed', text: '#c2410c' };
      case 'confirmed': return { bg: '#f0fdf4', text: '#15803d' };
      case 'completed': return { bg: '#f8fafc', text: '#475569' };
      case 'cancelled': return { bg: '#fef2f2', text: '#b91c1c' };
      default:          return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.doctorName}>Dr. {doctor?.first_name || 'Provider'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          {loggingOut
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <Icon name="log-out-outline" size={22} color="#ef4444" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchDashboardData}
            tintColor="#16a34a"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          <StatBox label="Today"    value={stats.todayAppointments}     icon="calendar"       color="#16a34a" />
          <StatBox label="Pending"  value={stats.pendingAppointments}   icon="time"           color="#f59e0b" />
          <StatBox label="Patients" value={stats.totalPatients}         icon="people"         color="#6366f1" />
          <StatBox label="Done"     value={stats.completedAppointments} icon="checkmark-done" color="#64748b" />
        </ScrollView>

        {/* Calendar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Schedule</Text>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day: any) =>
              navigation.navigate('AppointmentsCalendar', { date: day.dateString })
            }
            theme={{
              todayTextColor: '#16a34a',
              dotColor: '#16a34a',
              selectedDayBackgroundColor: '#16a34a',
              calendarBackground: 'transparent',
              textDayHeaderFontWeight: '600',
              textMonthFontWeight: '700',
            }}
            style={styles.calendar}
          />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>
              Appointments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'patients' && styles.activeTab]}
            onPress={() => setActiveTab('patients')}
          >
            <Text style={[styles.tabText, activeTab === 'patients' && styles.activeTabText]}>
              My Patients
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        <View style={styles.listSection}>
          {activeTab === 'appointments' ? (
            appointments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No appointments scheduled</Text>
              </View>
            ) : (
              appointments.map((item) => {
                const colors = getStatusColor(item.status);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.aptCard}
                    onPress={() =>
                      navigation.navigate('AppointmentDetails', { appointmentId: item.id })
                    }
                  >
                    <View style={styles.aptTimeBox}>
                      <Text style={styles.aptTime}>
                        {item.appointment_time.substring(0, 5)}
                      </Text>
                      {isToday(parseISO(item.appointment_date)) && (
                        <View style={styles.liveDot} />
                      )}
                    </View>
                    <View style={styles.aptInfo}>
                      <Text style={styles.aptPatient}>{item.patient_name}</Text>
                      <Text style={styles.aptReason} numberOfLines={1}>
                        {item.reason}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.statusTagText, { color: colors.text }]}>
                        {item.status_display}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          ) : patients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No patients yet</Text>
            </View>
          ) : (
            patients.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.aptCard}
                onPress={() =>
                  navigation.navigate('PatientDetails', { patientId: parseInt(item.id, 10) })
                }
              >
                <Icon name="person-circle" size={40} color="#cbd5e1" />
                <View style={[styles.aptInfo, { marginLeft: 12 }]}>
                  <Text style={styles.aptPatient}>{item.name}</Text>
                  <Text style={styles.aptReason}>
                    Last: {format(parseISO(item.last_appointment), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('SetAvailability')}
        >
          <Icon name="time-outline" size={22} color="#16a34a" />
          <Text style={styles.toolbarLabel}>Hours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('SharedDocuments')}
        >
          <Icon name="document-text-outline" size={22} color="#16a34a" />
          <Text style={styles.toolbarLabel}>Docs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => navigation.navigate('DoctorPrescriptions')}
        >
          <Icon name="medical-outline" size={22} color="#16a34a" />
          <Text style={styles.toolbarLabel}>Prescription</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, color: '#64748b', fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff' },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  doctorName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  logoutBtn: { padding: 8, borderRadius: 12, backgroundColor: '#fef2f2' },
  statsScroll: { paddingLeft: 20, paddingRight: 10, paddingVertical: 15 },
  statBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginRight: 12, minWidth: 120, borderWidth: 1, borderColor: '#f1f5f9' },
  statIconCircle: { padding: 8, borderRadius: 12, marginRight: 10 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  card: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  calendar: { marginTop: 5 },
  tabWrapper: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.1 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#16a34a' },
  listSection: { paddingHorizontal: 20, paddingBottom: 120 },
  aptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  aptTimeBox: { width: 50, alignItems: 'center' },
  aptTime: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 4 },
  aptInfo: { flex: 1, marginLeft: 10 },
  aptPatient: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  aptReason: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8' },
  toolbar: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', backgroundColor: '#2c3646', borderRadius: 24, padding: 12, justifyContent: 'space-around', elevation: 10, shadowOpacity: 0.3, shadowRadius: 10 },
  toolbarBtn: { alignItems: 'center' },
  toolbarLabel: { color: '#fff', fontSize: 10, marginTop: 4, fontWeight: '600' },
});