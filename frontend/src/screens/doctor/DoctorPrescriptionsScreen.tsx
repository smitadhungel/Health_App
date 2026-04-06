import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DoctorStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { ClipboardList, ChevronRight, Pill } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<DoctorStackParamList, 'DoctorPrescriptions'>;

const statusColors: Record<string, { bg: string; text: string }> = {
  ISSUED: { bg: '#dcfce7', text: '#166534' },
  VIEWED: { bg: '#dbeafe', text: '#1e40af' },
  DRAFT:  { bg: '#f1f5f9', text: '#475569' },
};

export default function DoctorPrescriptionsScreen() {
  const navigation = useNavigation<Nav>();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await prescriptionsAPI.getDoctorPrescriptions();
      setPrescriptions(res.prescriptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const formatDate = (d: string) => d
    ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#0f4c81" /></View>;
  }

  const renderItem = ({ item }: { item: any }) => {
    const color = statusColors[item.status] || statusColors.DRAFT;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <ClipboardList size={20} color="#0f4c81" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patient_name}</Text>
            <Text style={styles.diagnosis} numberOfLines={1}>{item.diagnosis}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
            <Text style={[styles.statusText, { color: color.text }]}>{item.status_display}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pill size={13} color="#0f4c81" />
            <Text style={styles.medCount}>{item.medication_count} medication(s)</Text>
          </View>
          <Text style={styles.date}>{formatDate(item.issued_at)}</Text>
          <ChevronRight size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPrescriptions(); }} />}
        contentContainerStyle={prescriptions.length === 0 ? styles.emptyContainer : { padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <ClipboardList size={56} color="#93c5fd" />
            <Text style={styles.emptyTitle}>No Prescriptions Issued</Text>
            <Text style={styles.emptySubtitle}>Prescriptions you write will appear here</Text>
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
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 }, // Dark green shadow
    shadowOpacity: 0.05, shadowRadius: 4,
    borderWidth: 1, borderColor: '#bbf7d0', // Soft green border
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#dcfce7', justifyContent: 'center', // Light lime icon box
    alignItems: 'center', marginRight: 10,
  },
  patientName: { fontSize: 15, fontWeight: '700', color: '#14532d' }, // Forest Green
  diagnosis: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 20,
    backgroundColor: '#f0fdf4', // Default light green badge
  },
  statusText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  medCount: { fontSize: 12, color: '#166534', flex: 1, fontWeight: '600' }, // Emerald green
  date: { fontSize: 12, color: '#9ca3af', marginRight: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#14532d', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});