// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appointmentsAPI, medicationsAPI } from '../../services/api';



export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [todaysDoses, setTodaysDoses] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }

      // Load medication stats
      const statsData = await medicationsAPI.getStats();
      setStats(statsData);

      // Load today's doses
      const dosesData = await medicationsAPI.getTodaysDoses();
      setTodaysDoses(dosesData);

      // Load upcoming appointments
      const appointmentsData = await appointmentsAPI.getMyAppointments({
        filter: 'upcoming',
      });
      setUpcomingAppointments(appointmentsData.slice(0, 3));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>
            {user?.first_name || 'User'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Doctors')}
        >
          <Icon name="medical" size={30} color="#007AFF" />
          <Text style={styles.actionText}>Find Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Icon name="calendar" size={30} color="#34C759" />
          <Text style={styles.actionText}>Appointments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Medications')}
        >
          <Icon name="medkit" size={30} color="#FF9500" />
          <Text style={styles.actionText}>Medications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Documents')}
        >
          <Icon name="document-text" size={30} color="#5856D6" />
          <Text style={styles.actionText}>Documents</Text>
        </TouchableOpacity>
      </View>

      {/* Medication Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Medications</Text>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.adherence_rate}%</Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.doses_today_taken}</Text>
              <Text style={styles.statLabel}>Taken</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.doses_today_pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>
      )}

      {/* Today's Doses */}
      {todaysDoses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Doses</Text>
          {todaysDoses.slice(0, 3).map((dose: any, index: number) => (
            <View key={index} style={styles.doseCard}>
              <View style={styles.doseInfo}>
                <Text style={styles.doseName}>{dose.medication_name}</Text>
                <Text style={styles.doseTime}>{dose.scheduled_time}</Text>
              </View>
              <View
                style={[
                  styles.doseStatus,
                  { backgroundColor: dose.taken ? '#34C759' : '#FF9500' },
                ]}
              >
                <Text style={styles.doseStatusText}>
                  {dose.taken ? 'Taken' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {upcomingAppointments.map((appointment: any) => (
            <TouchableOpacity
              key={appointment.id}
              style={styles.appointmentCard}
            >
              <View style={styles.appointmentInfo}>
                <Text style={styles.doctorName}>
                  Dr. {appointment.doctor_name}
                </Text>
                <Text style={styles.appointmentDate}>
                  {appointment.appointment_date} at {appointment.appointment_time}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    marginTop: -20,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    margin: '1.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  doseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  doseInfo: {
    flex: 1,
  },
  doseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doseTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  doseStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  doseStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});