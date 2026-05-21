import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  ChevronRight,
  Stethoscope,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
} from 'lucide-react-native';
import { appointmentsAPI } from '../../services/api';
import { Appointment } from '../../services/types';
import { PatientStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'MyAppointments'>;

const STATUS_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;

export default function MyAppointmentsScreen() {
  const navigation = useNavigation<Nav>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const fetchAppointments = useCallback(async () => {
    try {
      const params = activeTab === 'ALL' ? {} : { status: activeTab };
      const raw = await appointmentsAPI.getMyAppointments(params);
      const data = Array.isArray(raw) ? raw : (raw as any).results ?? [];
      setAppointments(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Logic for the Stats Bar (Top Row)
  const totalCount = appointments.length;
  const confirmedCount = appointments.filter(a => a.status === 'CONFIRMED').length;
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;

  const getStatusStyles = (status: string) => {
    const map: Record<string, { color: string; icon: any }> = {
      PENDING: { color: '#F59E0B', icon: AlertCircle },
      CONFIRMED: { color: '#10B981', icon: CheckCircle },
      COMPLETED: { color: '#64748b', icon: CheckCircle },
      CANCELLED: { color: '#EF4444', icon: XCircle },
    };
    return map[status] || { color: '#64748b', icon: CheckCircle };
  };

  const renderItem = ({ item }: { item: Appointment }) => {
    const dateTime = parseISO(`${item.appointment_date}T${item.appointment_time}`);
    const status = getStatusStyles(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.doctorInfoRow}>
            <View style={styles.iconContainer}>
              <Stethoscope size={20} color="#16a34a" />
            </View>
            <View style={styles.nameSection}>
              <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
              <Text style={styles.doctorSpec}>{item.doctor_specialization}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <status.icon size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{item.status_display}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.dateTimeRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color="#64748b" />
              <Text style={styles.metaText}>{format(dateTime, 'MMM dd, yyyy')}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Clock size={14} color="#64748b" />
              <Text style={styles.metaText}>{format(dateTime, 'h:mm a')}</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. Header Section */}
      <View style={styles.header}>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Appointments</Text>
          {/* <Text style={styles.headerSubtitle}>Manage your health visits</Text> */}
        </View>
        <View style={{ width: 44 }} /> 
      </View>

      {/* 2. Stats Bar (Matching Medication Dashboard) */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Activity size={22} color="#16a34a" />
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <CheckCircle size={22} color="#10b981" />
          <Text style={styles.statValue}>{confirmedCount}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statItem}>
          <AlertCircle size={22} color="#f59e0b" />
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* 3. Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item && styles.tabActive]}
              onPress={() => setActiveTab(item)}
            >
              <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>
                {item === 'ALL' ? 'All' : item.charAt(0) + item.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* 4. Main List */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Calendar size={64} color="#d1fae5" />
              <Text style={styles.emptyTitle}>No appointments found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchAppointments();}} tintColor="#16a34a" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 60 : 20, 
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: {fontSize: 20, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 0},
  headerSubtitle: { fontSize: 14, fontWeight: '500', color: '#94a3b8', marginTop: 2 },

  // Stats Row (The Medication Style)
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    paddingVertical: 16,
    justifyContent: 'space-around',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statItem: { alignItems: 'center', flex: 1 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: '500', color: '#64748b' },

  // Tabs
  tabsWrapper: { paddingVertical: 14 },
  tabs: { paddingHorizontal: 16, gap: 10 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  tabActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },

  // List Cards
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  doctorInfoRow: { flexDirection: 'row', flex: 1 },
  iconContainer: { width: 44, height: 44, backgroundColor: '#f0fdf4', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  nameSection: { marginLeft: 12, flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  doctorSpec: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaDivider: { width: 1, height: 12, backgroundColor: '#cbd5e1', marginHorizontal: 12 },
  metaText: { fontSize: 13, color: '#475569', fontWeight: '500' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94a3b8', marginTop: 12 },
});