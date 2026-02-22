// src/screens/doctor/DoctorDashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { format, isToday, parseISO } from 'date-fns';
import { appointmentsAPI, doctorsAPI, patientsAPI } from '../../services/api';

// Types
interface Appointment {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  appointment_date: string;
  appointment_time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  reason: string;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  profile_picture?: string;
  last_appointment?: string;
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

export default function DoctorDashboard({ navigation }: any) {
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

  // Load user data from storage
  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setDoctor(user);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  // Helper to extract array from different API response shapes
  const extractArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data?.results && Array.isArray(data.results)) return data.results;
    if (data?.data && Array.isArray(data.data)) return data.data;
    console.warn('Unexpected list response format:', data);
    return [];
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [appointmentsResult, patientsResult, profileResult] = await Promise.allSettled([
        appointmentsAPI.getDoctorAppointments(),
        patientsAPI.getMyPatients(),
        doctorsAPI.getMyProfile(),
      ]);

      // Process appointments
      if (appointmentsResult.status === 'fulfilled') {
        const appointmentsData = appointmentsResult.value;
        const appointmentsArray = extractArray(appointmentsData);
        setAppointments(appointmentsArray);

        // Build marked dates for calendar
        const marks: MarkedDates = {};
        appointmentsArray.forEach((apt: Appointment) => {
          const dateStr = apt.appointment_date;
          if (!marks[dateStr]) {
            marks[dateStr] = {
              marked: true,
              dotColor: apt.status === 'CANCELLED' ? '#F44336' : '#007AFF',
            };
          }
        });
        setMarkedDates(marks);

        // Compute stats
        const today = new Date().toISOString().split('T')[0];
        const todayApps = appointmentsArray.filter(
          (apt: Appointment) => apt.appointment_date === today && apt.status !== 'CANCELLED'
        ).length;
        const pendingApps = appointmentsArray.filter(
          (apt: Appointment) => apt.status === 'PENDING'
        ).length;
        const completedApps = appointmentsArray.filter(
          (apt: Appointment) => apt.status === 'COMPLETED'
        ).length;

        setStats(prev => ({
          ...prev,
          todayAppointments: todayApps,
          pendingAppointments: pendingApps,
          completedAppointments: completedApps,
        }));
      } else {
        console.warn('Failed to fetch appointments:', appointmentsResult.reason);
      }

      // Process patients
      if (patientsResult.status === 'fulfilled') {
        const patientsData = patientsResult.value;
        const patientsArray = extractArray(patientsData);
        setPatients(patientsArray);
        setStats(prev => ({ ...prev, totalPatients: patientsArray.length }));
      } else {
        console.warn('Failed to fetch patients:', patientsResult.reason);
      }

      // Process profile (optional)
      if (profileResult.status === 'fulfilled') {
        console.log('Profile fetched:', profileResult.value);
      }
    } catch (error) {
      console.error('Unexpected error in fetchDashboardData:', error);
      Alert.alert('Error', 'Failed to load dashboard. Please pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadUser();
      await fetchDashboardData();
    };
    init();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            // Optional: call backend logout endpoint
            // await authAPI.logout(refreshToken);
            await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user', 'user_role']);
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            setLoggingOut(false);
            navigation.replace('Login');
          }
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
          <Text style={styles.appointmentTime}>{formatAppointmentTime(item.appointment_date, item.appointment_time)}</Text>
          {isTodayApp && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>}
        </View>
        <View style={styles.appointmentInfo}>
          <Text style={styles.patientName}>
            {item.patient.first_name} {item.patient.last_name}
          </Text>
          <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientDetails', { patientId: item.id })}
    >
      <View style={styles.patientAvatar}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.avatarImage} />
        ) : (
          <Icon name="person-circle" size={50} color="#ccc" />
        )}
      </View>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>
          {item.first_name} {item.last_name}
        </Text>
        {item.last_appointment ? (
          <Text style={styles.lastAppointment}>
            Last visit: {format(parseISO(item.last_appointment), 'MMM dd, yyyy')}
          </Text>
        ) : (
          <Text style={styles.lastAppointment}>New patient</Text>
        )}
      </View>
      <Icon name="chevron-forward" size={20} color="#999" />
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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
              <Icon name="person-circle-outline" size={28} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Icon name="log-out-outline" size={28} color="#FF3B30" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {renderStats()}

        {/* Mini Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Appointment Calendar</Text>
          <Calendar
            onDayPress={(day: any) => {
              navigation.navigate('AppointmentsCalendar', { date: day.dateString });
            }}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: '#007AFF',
              todayTextColor: '#007AFF',
              arrowColor: '#007AFF',
              monthTextColor: '#333',
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

        {/* Content */}
        {activeTab === 'appointments' ? (
          <>
            {appointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="calendar-outline" size={60} color="#ccc" />
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
            )}
          </>
        ) : (
          <>
            {patients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="people-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No patients yet</Text>
                <Text style={styles.emptySubtext}>Patients you consult will appear here</Text>
              </View>
            ) : (
              <FlatList
                data={patients}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderPatientItem}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SetAvailability')}
          >
            <Icon name="time-outline" size={22} color="#007AFF" />
            <Text style={styles.actionText}>Set Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AppointmentsCalendar')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="calendar-outline" size={22} color="#007AFF" />
              <Text style={styles.actionText}>Calendar</Text>
              {stats.todayAppointments > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{stats.todayAppointments}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
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
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  calendarSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
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
    color: '#333',
  },
  calendar: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentTimeContainer: {
    width: 70,
    marginRight: 15,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  status_pending: {
    backgroundColor: '#FFD700',
  },
  status_confirmed: {
    backgroundColor: '#4CAF50',
  },
  status_completed: {
    backgroundColor: '#9E9E9E',
  },
  status_cancelled: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  patientAvatar: {
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  patientInfo: {
    flex: 1,
  },
  lastAppointment: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 5,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});