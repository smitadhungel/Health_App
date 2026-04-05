import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { format, isToday, parseISO } from 'date-fns';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentsAPI, doctorsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  PatientHome: undefined;
  Medications: undefined;
  AddMedication: { medicationId?: number };
  MedicationDetail: { medicationId: number };
  TodayDoses: undefined;
  RequestRefill: { medicationId: number; medicationName: string };
  BookAppointment: undefined;
  UploadDocument: undefined;
  DoctorsDashboard: undefined;
  AppointmentDetails: { appointmentId: number };
  PatientDetails: { patientId: string };
  SetAvailability: undefined;
  AppointmentsCalendar: { date?: string };
  DoctorProfile: undefined;
  DoctorDetails: undefined;
};

type DoctorDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Appointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  doctor_specialization: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  status_display: string;
  is_upcoming: boolean;
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
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.appointments && Array.isArray(data.appointments)) return data.appointments;
  console.warn('Unexpected list response format:', data);
  return [];
};

export default function DoctorDashboard() {
  const navigation = useNavigation<DoctorDashboardNavigationProp>();
  const { signOut } = useAuth();

  // ✅ ALL useState hooks at the top
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

  // ✅ useCallback hooks after useState
  const fetchDashboardData = useCallback(async () => {
    try {
      const [appointmentsResult] = await Promise.allSettled([
        appointmentsAPI.getDoctorAppointments(),
        doctorsAPI.getMyProfile(),
      ]);

      if (appointmentsResult.status === 'fulfilled') {
        const appointmentsArray = extractArray(appointmentsResult.value) as Appointment[];
        setAppointments(appointmentsArray);

        // Build patient list from appointments
        const patientMap = new Map<string, { name: string; last_appointment: string }>();
        appointmentsArray.forEach((apt) => {
          const name = apt.patient_name;
          if (!patientMap.has(name)) {
            patientMap.set(name, { name, last_appointment: apt.appointment_date });
          } else {
            const existing = patientMap.get(name)!;
            if (apt.appointment_date > existing.last_appointment) {
              existing.last_appointment = apt.appointment_date;
            }
          }
        });
        const patientsList = Array.from(patientMap.entries()).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        setPatients(patientsList);

        // Marked dates for calendar
        const marks: MarkedDates = {};
        appointmentsArray.forEach((apt) => {
          if (!marks[apt.appointment_date]) {
            marks[apt.appointment_date] = {
              marked: true,
              dotColor: apt.status === 'CANCELLED' ? '#ef4444' : '#16a34a',
            };
          }
        });
        setMarkedDates(marks);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayApps = appointmentsArray.filter(
          (apt) => apt.appointment_date === today && apt.status !== 'CANCELLED'
        ).length;
        const pendingApps = appointmentsArray.filter((apt) => apt.status === 'PENDING').length;
        const completedApps = appointmentsArray.filter((apt) => apt.status === 'COMPLETED').length;

        setStats({
          totalPatients: patientsList.length,
          todayAppointments: todayApps,
          pendingAppointments: pendingApps,
          completedAppointments: completedApps,
        });
      } else {
        console.log('Appointments fetch failed:', appointmentsResult.reason);
      }
    } catch (error) {
      console.error('Unexpected error in fetchDashboardData:', error);
      Alert.alert('Error', 'Failed to load dashboard. Please pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ✅ useFocusEffect last — re-fetches every time screen is focused (e.g. coming back from AppointmentDetails)
  useFocusEffect(
    useCallback(() => {
      const checkAndLoad = async () => {
        try {
          await doctorsAPI.getMyProfile();
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) setDoctor(JSON.parse(userStr));
          await fetchDashboardData();
        } catch (error: any) {
          if (error.response?.status === 404) {
            navigation.replace('DoctorDetails');
          } else {
            console.error('Error checking profile:', error);
            navigation.replace('DoctorDetails');
          }
        } finally {
          setIsCheckingProfile(false);
        }
      };
      checkAndLoad();
    }, [fetchDashboardData])
  );

  // ✅ Conditional returns AFTER all hooks
  if (isCheckingProfile || (loading && !refreshing)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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

  const formatAppointmentTime = (date: string, time: string) => {
    try {
      return format(parseISO(`${date}T${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const getStatusStyle = (status: string) => {
    const statusMap: Record<string, any> = {
      pending: styles.status_pending,
      confirmed: styles.status_confirmed,
      completed: styles.status_completed,
      cancelled: styles.status_cancelled,
    };
    return statusMap[status.toLowerCase()] || styles.status_pending;
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const isTodayApp = isToday(parseISO(item.appointment_date));
    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
      >
        <View style={styles.appointmentTimeContainer}>
          <Text style={styles.appointmentTime}>
            {formatAppointmentTime(item.appointment_date, item.appointment_time)}
          </Text>
          {isTodayApp && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </View>
        <View style={styles.appointmentInfo}>
          <Text style={styles.patientName}>{item.patient_name}</Text>
          <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status_display}</Text>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientDetails', { patientId: item.id })}
    >
      <View style={styles.patientAvatar}>
        <Icon name="person-circle" size={50} color="#bbf7d0" />
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.lastAppointment}>
          Last visit: {format(parseISO(item.last_appointment), 'MMM dd, yyyy')}
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const renderStats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalPatients}</Text>
        <Text style={styles.statLabel}>Total Patients</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.todayAppointments}</Text>
        <Text style={styles.statLabel}>Today's Appointments</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.pendingAppointments}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.completedAppointments}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.doctorName}>Dr. {doctor?.first_name || 'Doctor'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('DoctorProfile')}
            >
              <Icon name="person-circle-outline" size={28} color="#16a34a" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Icon name="log-out-outline" size={28} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {renderStats()}

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Appointment Calendar</Text>
          <Calendar
            onDayPress={(day: any) => {
              navigation.navigate('AppointmentsCalendar', { date: day.dateString });
            }}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: '#16a34a',
              todayTextColor: '#16a34a',
              arrowColor: '#16a34a',
              monthTextColor: '#14532d',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '500',
            }}
            style={styles.calendar}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
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

        {/* Tab Content */}
        {activeTab === 'appointments' ? (
          appointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-outline" size={60} color="#bbf7d0" />
              <Text style={styles.emptyText}>No appointments yet</Text>
              <Text style={styles.emptySubtext}>Check back later</Text>
            </View>
          ) : (
            <FlatList
              data={appointments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderAppointmentItem}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )
        ) : patients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={60} color="#bbf7d0" />
            <Text style={styles.emptyText}>No patients yet</Text>
            <Text style={styles.emptySubtext}>Patients you consult will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            renderItem={renderPatientItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SetAvailability')}
          >
            <Icon name="time-outline" size={22} color="#16a34a" />
            <Text style={styles.actionText}>Set Availability</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row' },
  iconButton: { marginLeft: 15 },
  greeting: { fontSize: 14, color: '#4b5563' },
  doctorName: { fontSize: 24, fontWeight: 'bold', color: '#14532d', marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statCard: {
    width: '22%',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#16a34a' },
  statLabel: { fontSize: 12, color: '#4b5563', marginTop: 5, textAlign: 'center' },
  calendarSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 5,
    color: '#14532d',
  },
  calendar: { borderRadius: 10, overflow: 'hidden' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#16a34a' },
  tabText: { fontSize: 16, color: '#4b5563' },
  activeTabText: { color: '#16a34a', fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 10 },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentTimeContainer: { width: 70, marginRight: 15 },
  appointmentTime: { fontSize: 16, fontWeight: '600', color: '#14532d' },
  todayBadge: {
    backgroundColor: '#16a34a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  todayBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  appointmentInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#14532d', marginBottom: 4 },
  reason: { fontSize: 14, color: '#4b5563', marginBottom: 6 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  status_pending: { backgroundColor: '#fcd34d' },
  status_confirmed: { backgroundColor: '#34d399' },
  status_completed: { backgroundColor: '#9ca3af' },
  status_cancelled: { backgroundColor: '#f87171' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  patientAvatar: { marginRight: 15 },
  patientInfo: { flex: 1 },
  lastAppointment: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#9ca3af', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 5 },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#16a34a' },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});