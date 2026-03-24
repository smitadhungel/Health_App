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
} from 'react-native';
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
  PlusCircle,
  FileText,
} from 'lucide-react-native';

type MedicationsListNavigationProp = NativeStackNavigationProp<PatientStackParamList, 'Medications'>;

interface Medication {
  id: number;
  name: string;
  dosage: string;
  form_display: string;
  frequency_display: string;
  is_refill_needed?: boolean;
  next_dose_time?: {
    time: string;
    date: string;
  };
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [medsRes, statsRes, dosesRes] = await Promise.all([
        medicationsAPI.getMyMedications(),
        medicationsAPI.getStats(),
        medicationsAPI.getTodaysDoses(),
      ]);

      // Extract medications array
      let medicationsArray: Medication[] = [];
      if (Array.isArray(medsRes)) {
        medicationsArray = medsRes;
      } else if (medsRes && typeof medsRes === 'object' && 'medications' in medsRes && Array.isArray(medsRes.medications)) {
        medicationsArray = medsRes.medications;
      } else {
        console.warn('Unexpected medications response format', medsRes);
      }

      // Extract stats
      let statsData: Stats | null = null;
      if (statsRes && typeof statsRes === 'object') {
        if ('active_medications' in statsRes) {
          statsData = statsRes as Stats;
        } else if ('stats' in statsRes && statsRes.stats) {
          statsData = statsRes.stats as Stats;
        }
      }

      // Extract doses array
      let dosesArray: TodaysDose[] = [];
      if (Array.isArray(dosesRes)) {
        dosesArray = dosesRes;
      } else if (dosesRes && typeof dosesRes === 'object') {
        if ('doses' in dosesRes && Array.isArray(dosesRes.doses)) {
          dosesArray = dosesRes.doses;
        } else if ('appointments' in dosesRes && Array.isArray(dosesRes.appointments)) {
          dosesArray = dosesRes.appointments;
        }
      }

      setMedications(medicationsArray);
      setStats(statsData);
      setTodaysDoses(dosesArray);
    } catch (error) {
      Alert.alert('Error', 'Failed to load medications. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddMedication = () => {
    navigation.navigate('Medications'); // fixed: was 'Medications'
  };

  const handleMedicationPress = (medicationId: number) => {
    navigation.navigate('MedicationDetail', { medicationId });
  };

  const handleViewAllDoses = () => {
    navigation.navigate('TodayDoses');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TAKEN': return CheckCircle;
      case 'MISSED': return XCircle;
      case 'SKIPPED': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TAKEN': return '#16a34a';
      case 'MISSED': return '#ef4444';
      case 'SKIPPED': return '#f97316';
      default: return '#6b7280';
    }
  };

  const renderMedicationItem = ({ item }: { item: Medication }) => {
    return (
      <TouchableOpacity
        style={styles.medicationCard}
        onPress={() => handleMedicationPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.medNameContainer}>
            <Pill size={20} color="#16a34a" />
            <Text style={styles.medName}>{item.name}</Text>
          </View>
          {item.is_refill_needed && (
            <View style={styles.refillBadge}>
              <AlertCircle size={12} color="#854d0e" />
              <Text style={styles.refillText}>Refill</Text>
            </View>
          )}
        </View>
        <View style={styles.medDetails}>
          <Text style={styles.medDetail}>{item.dosage} • {item.form_display}</Text>
          <Text style={styles.medDetail}>Freq: {item.frequency_display}</Text>
        </View>
        {item.next_dose_time && (
          <View style={styles.nextDoseContainer}>
            <Clock size={14} color="#16a34a" />
            <Text style={styles.nextDose}>
              Next: {item.next_dose_time.time} ({item.next_dose_time.date})
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medications</Text>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Heart size={22} color="#16a34a" />
            <Text style={styles.statValue}>{stats.active_medications}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CheckCircle size={22} color="#16a34a" />
            <Text style={styles.statValue}>{stats.doses_taken_today}</Text>
            <Text style={styles.statLabel}>Taken</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <XCircle size={22} color="#ef4444" />
            <Text style={styles.statValue}>{stats.doses_missed_today}</Text>
            <Text style={styles.statLabel}>Missed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <TrendingUp size={22} color="#16a34a" />
            <Text style={styles.statValue}>{stats.adherence_rate}%</Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>
        </View>
      )}

      {todaysDoses.length > 0 && (
        <View style={styles.todaySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Doses</Text>
            <TouchableOpacity onPress={handleViewAllDoses}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {todaysDoses.slice(0, 3).map((dose, index) => {
            const StatusIcon = getStatusIcon(dose.status);
            return (
              <View key={index} style={styles.doseItem}>
                <StatusIcon size={18} color={getStatusColor(dose.status)} />
                <Text style={styles.doseTime}>{dose.scheduled_time}</Text>
                <Text style={styles.doseMed} numberOfLines={1}>{dose.medication_name}</Text>
                <View style={[styles.statusBadge, dose.status === 'TAKEN' ? styles.taken : styles.pending]}>
                  <Text style={styles.statusText}>{dose.status_display}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>My Medications</Text>
        <TouchableOpacity onPress={handleAddMedication} style={styles.addButton}>
          <PlusCircle size={24} color="#16a34a" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={medications}
        renderItem={renderMedicationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={60} color="#bbf7d0" />
            <Text style={styles.emptyText}>No medications added yet.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddMedication}>
              <Text style={styles.emptyButtonText}>Add Your First Medication</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#14532d',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#d1fae5',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14532d',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  todaySection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
  },
  seeAll: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '500',
  },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0fdf4',
  },
  doseTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#14532d',
    width: 50,
    marginLeft: 8,
  },
  doseMed: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  taken: {
    backgroundColor: '#d1fae5',
  },
  pending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  medicationCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14532d',
    marginLeft: 8,
  },
  refillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  refillText: {
    fontSize: 11,
    color: '#854d0e',
    marginLeft: 4,
  },
  medDetails: {
    marginBottom: 6,
  },
  medDetail: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 2,
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  nextDose: {
    fontSize: 13,
    color: '#16a34a',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});