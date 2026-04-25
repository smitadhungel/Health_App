import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../../navigation/types';
import { medicationsAPI } from '../../../services/api';
import {
  Pill,
  Heart,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  ChevronRight,
} from 'lucide-react-native';

type MedicationsListNavigationProp = NativeStackNavigationProp<PatientStackParamList>;

// (Interfaces remain identical to your logic)
interface Medication {
  id: number;
  name: string;
  dosage: string;
  form_display: string;
  frequency_display: string;
  is_refill_needed?: boolean;
  next_dose_time?: { time: string; date: string; };
}

interface Stats {
  active_medications: number;
  doses_taken_today: number;
  doses_missed_today: number;
  adherence_rate: number;
}

interface TodaysDose {
  scheduled_time: string;
  medication_name: string;
  status: string;
  status_display: string;
  medication: number;
  scheduled_date: string;
}

export default function MedicationsListScreen() {
  const navigation = useNavigation<MedicationsListNavigationProp>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todaysDoses, setTodaysDoses] = useState<TodaysDose[]>([]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
      const [medsRes, statsRes, dosesRes] = await Promise.all([
        medicationsAPI.getMyMedications(),
        medicationsAPI.getStats(),
        medicationsAPI.getTodaysDoses(),
      ]);
      const anyMeds = medsRes as any;
      const anyStats = statsRes as any;
      const anyDoses = dosesRes as any;

      let medicationsArray: Medication[] = Array.isArray(anyMeds) ? anyMeds : (anyMeds?.medications || []);
      let statsData: Stats | null = anyStats?.active_medications !== undefined ? anyStats : (anyStats?.stats || null);
      let dosesArray: TodaysDose[] = Array.isArray(anyDoses) ? anyDoses : (anyDoses?.doses || []);

      setMedications(medicationsArray);
      setStats(statsData);
      setTodaysDoses(dosesArray);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };
  const handleAddMedication = () => navigation.navigate('AddMedication', {});
  const handleMedicationPress = (medicationId: number) => navigation.navigate('MedicationDetail', { medicationId });
  const handleViewAllDoses = () => navigation.navigate('TodayDoses');

  const renderMedicationItem = ({ item }: { item: Medication }) => (
    <TouchableOpacity
      style={styles.medCard}
      onPress={() => handleMedicationPress(item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.medCardBody}>
        <View style={styles.medIconWrapper}>
          <Pill size={24} color="#16a34a" />
        </View>
        <View style={styles.medMainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.medTitleText}>{item.name}</Text>
            {item.is_refill_needed && (
              <View style={styles.refillDot} />
            )}
          </View>
          <Text style={styles.medSubtitleText}>{item.dosage} • {item.form_display}</Text>
          <View style={styles.freqTag}>
            <Clock size={12} color="#16a34a" />
            <Text style={styles.freqTagText}>{item.frequency_display}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#cbd5e1" />
      </View>
      {item.next_dose_time && (
        <View style={styles.medFooter}>
          <Text style={styles.footerLabel}>Next dose due at </Text>
          <Text style={styles.footerTime}>{item.next_dose_time.time}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingText}>My Health</Text>
            <Text style={styles.largeTitle}>Medicines</Text>
          </View>
          <TouchableOpacity onPress={handleAddMedication} style={styles.fabHeader}>
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={medications}
          renderItem={renderMedicationItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          ListHeaderComponent={
            <>
              {/* Stats Section */}
              {stats && (
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: '#ffffff' }]}>
                    <Heart size={20} color="#16a34a" />
                    <Text style={styles.statNum}>{stats.active_medications}</Text>
                    <Text style={styles.statDesc}>Active</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: '#16a34a' }]}>
                    <TrendingUp size={20} color="#ffffff" />
                    <Text style={[styles.statNum, { color: '#fff' }]}>{stats.adherence_rate}%</Text>
                    <Text style={[styles.statDesc, { color: '#dcfce7' }]}>Adherence</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: '#ffffff' }]}>
                    <CheckCircle size={20} color="#16a34a" />
                    <Text style={styles.statNum}>{stats.doses_taken_today}</Text>
                    <Text style={styles.statDesc}>Taken</Text>
                  </View>
                </View>
              )}

              {/* Today's Schedule Mini-Card */}
              {todaysDoses.length > 0 && (
                <View style={styles.scheduleWidget}>
                  <View style={styles.widgetHeader}>
                    <Text style={styles.widgetTitle}>Today's Schedule</Text>
                    <TouchableOpacity onPress={handleViewAllDoses}>
                      <Text style={styles.widgetLink}>See Full Log</Text>
                    </TouchableOpacity>
                  </View>
                  {todaysDoses.slice(0, 2).map((dose, i) => (
                    <View key={i} style={styles.miniDoseRow}>
                      <View style={[styles.statusIndicator, { backgroundColor: dose.status === 'TAKEN' ? '#16a34a' : '#f59e0b' }]} />
                      <Text style={styles.miniDoseTime}>{dose.scheduled_time}</Text>
                      <Text style={styles.miniDoseName} numberOfLines={1}>{dose.medication_name}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.listHeaderTitle}>Active Medications</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <FileText size={48} color="#16a34a" />
              </View>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptySub}>Add your prescriptions to start tracking your health journey.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleAddMedication}>
                <Text style={styles.emptyBtnText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  mainContainer: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollPadding: { paddingBottom: 120 },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 15,
  },
  greetingText: { fontSize: 14, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  largeTitle: { fontSize: 32, fontWeight: '800', color: '#14532d' },
  fabHeader: { 
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#16a34a', 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10 },
  statBox: { 
    width: '31%', padding: 18, borderRadius: 24, alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } })
  },
  statNum: { fontSize: 20, fontWeight: '800', color: '#14532d', marginVertical: 4 },
  statDesc: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  // Schedule Widget
  scheduleWidget: { 
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 24, borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: '#f1f5f9' 
  },
  widgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  widgetTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  widgetLink: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  miniDoseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  miniDoseTime: { fontSize: 14, fontWeight: '700', color: '#1e293b', width: 60 },
  miniDoseName: { fontSize: 14, color: '#64748b', flex: 1 },

  // Med List
  listHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#14532d', marginHorizontal: 24, marginTop: 30, marginBottom: 15 },
  medCard: { 
    backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 24, marginBottom: 16,
    borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10 }, android: { elevation: 1 } })
  },
  medCardBody: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  medIconWrapper: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  medMainInfo: { flex: 1, marginLeft: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  medTitleText: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  refillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginLeft: 8 },
  medSubtitleText: { fontSize: 14, color: '#64748b', marginTop: 2 },
  freqTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  freqTagText: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginLeft: 5 },
  medFooter: { backgroundColor: '#f8fafc', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerLabel: { fontSize: 12, color: '#94a3b8' },
  footerTime: { fontSize: 12, color: '#16a34a', fontWeight: '700' },

  // Empty State
  emptyWrap: { alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  emptyBtn: { backgroundColor: '#16a34a', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});