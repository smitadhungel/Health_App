import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { ClipboardList, ChevronRight, Pill } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'Prescriptions'>;

interface Prescription {
  id: number;
  doctor_name: string;
  doctor_specialization: string;
  diagnosis: string;
  status: string;
  status_display: string;
  medication_count: number;
  issued_at: string;
  created_at: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  ISSUED: { bg: '#fef9c3', text: '#854d0e' },
  VIEWED: { bg: '#dcfce7', text: '#166534' },
  DRAFT:  { bg: '#f1f5f9', text: '#475569' },
};

export default function PrescriptionsScreen() {
  const navigation = useNavigation<Nav>();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await prescriptionsAPI.getMyPrescriptions();
      setPrescriptions(res.prescriptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const onRefresh = () => { setRefreshing(true); fetchPrescriptions(); };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Prescription }) => {
    const color = statusColors[item.status] || statusColors.VIEWED;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <ClipboardList size={22} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
            <Text style={styles.specialization}>{item.doctor_specialization}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
            <Text style={[styles.statusText, { color: color.text }]}>{item.status_display}</Text>
          </View>
        </View>

        <Text style={styles.diagnosis} numberOfLines={2}>{item.diagnosis}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.medCount}>
            <Pill size={14} color="#7c3aed" />
            <Text style={styles.medCountText}>{item.medication_count} medication(s)</Text>
          </View>
          <Text style={styles.date}>{formatDate(item.issued_at || item.created_at)}</Text>
          <ChevronRight size={18} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={prescriptions.length === 0 ? styles.emptyContainer : { padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <ClipboardList size={56} color="#c4b5fd" />
            <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Prescriptions from your doctors will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' }, // Light mint background
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 }, // Dark green shadow
    shadowOpacity: 0.07, shadowRadius: 4,
    borderWidth: 1, borderColor: '#bbf7d0', // Added soft green border
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#dcfce7', justifyContent: 'center', // Light lime-green icon box
    alignItems: 'center', marginRight: 10,
  },
  doctorName: { fontSize: 15, fontWeight: '700', color: '#14532d' }, // Forest green
  specialization: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#f0fdf4', // Matching badge background
  },
  statusText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  diagnosis: { fontSize: 13, color: '#374151', marginBottom: 10, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  medCount: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 },
  medCountText: { fontSize: 12, color: '#22c55e', fontWeight: '600' }, // Vibrant green for counts
  date: { fontSize: 12, color: '#9ca3af', marginRight: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#14532d', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});