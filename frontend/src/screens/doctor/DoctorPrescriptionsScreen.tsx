import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  StatusBar, SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DoctorStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { ClipboardList, ChevronRight, Pill, Calendar, Search } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<DoctorStackParamList, 'DoctorPrescriptions'>;

// Refined status palette for a clinical look
const statusTheme: Record<string, { bg: string; text: string; dot: string }> = {
  ISSUED: { bg: '#ecfdf5', text: '#059669', dot: '#10b981' },
  VIEWED: { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6' },
  DRAFT:  { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8' },
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
    ? new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
    : '—';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  const renderItem = ({ item }: { item: any }) => {
    const theme = statusTheme[item.status] || statusTheme.DRAFT;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.card}
        onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
      >
        <View style={styles.cardMain}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient_name}</Text>
            <View style={styles.diagnosisRow}>
               <Text style={styles.diagnosisLabel}>Dx:</Text>
               <Text style={styles.diagnosisText} numberOfLines={1}>{item.diagnosis || 'General Checkup'}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.dot }]} />
            <Text style={[styles.statusText, { color: theme.text }]}>{item.status_display}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerInfo}>
             <View style={styles.pillTag}>
                <Pill size={12} color="#16a34a" />
                <Text style={styles.medCount}>{item.medication_count} Meds</Text>
             </View>
             <View style={styles.dateTag}>
                <Calendar size={12} color="#64748b" />
                <Text style={styles.dateText}>{formatDate(item.issued_at)}</Text>
             </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Summary */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>Prescriptions</Text>
            <Text style={styles.headerSub}>{prescriptions.length} Records Found</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
            <Search size={20} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={prescriptions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchPrescriptions(); }} 
            tintColor="#16a34a"
          />
        }
        contentContainerStyle={prescriptions.length === 0 ? styles.emptyContainer : { padding: 20, paddingTop: 10 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
                <ClipboardList size={40} color="#16a34a" />
            </View>
            <Text style={styles.emptyTitle}>No Records Yet</Text>
            <Text style={styles.emptySubtitle}>When you issue prescriptions to patients, they will appear in this history.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  searchBtn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },

  // Card Design
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  diagnosisRow: { flexDirection: 'row', alignItems: 'center' },
  diagnosisLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginRight: 4 },
  diagnosisText: { fontSize: 13, color: '#475569', flex: 1 },
  
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: { flexDirection: 'row', gap: 12 },
  pillTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6,
    gap: 4 
  },
  dateTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  medCount: { fontSize: 12, color: '#166534', fontWeight: '700' },
  dateText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f0fdf4', justifyContent: 'center',
    alignItems: 'center', marginBottom: 20
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 22 },
});