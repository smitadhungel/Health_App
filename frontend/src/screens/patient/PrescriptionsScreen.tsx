import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  StatusBar, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { 
  ClipboardList, 
  ChevronRight, 
  Pill, 
  FileText, 
  CheckCircle, 
  Eye,
  Plus
} from 'lucide-react-native';

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

  // Dashboard Stats Logic
  const total = prescriptions.length;
  const issued = prescriptions.filter(p => p.status === 'ISSUED').length;
  const viewed = prescriptions.filter(p => p.status === 'VIEWED').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: Prescription }) => {
    const color = statusColors[item.status] || statusColors.VIEWED;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PrescriptionDetail', { prescriptionId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <FileText size={20} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
            <Text style={styles.specialization}>{item.doctor_specialization}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color.bg }]}>
            <Text style={[styles.statusText, { color: color.text }]}>{item.status_display}</Text>
          </View>
        </View>

        <Text style={styles.diagnosis} numberOfLines={2}>
          {item.diagnosis || "No diagnosis provided"}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.medCount}>
            <Pill size={14} color="#16a34a" />
            <Text style={styles.medCountText}>{item.medication_count} medication(s)</Text>
          </View>
          <View style={styles.footerRight}>
             <Text style={styles.date}>{formatDate(item.issued_at || item.created_at)}</Text>
             <ChevronRight size={18} color="#9ca3af" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prescriptions</Text>
      </View>

      {/* Stats Dashboard Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <ClipboardList size={22} color="#16a34a" />
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <CheckCircle size={22} color="#10b981" />
          <Text style={styles.statValue}>{issued}</Text>
          <Text style={styles.statLabel}>Issued</Text>
        </View>
        <View style={styles.statItem}>
          <Eye size={22} color="#6b7280" />
          <Text style={styles.statValue}>{viewed}</Text>
          <Text style={styles.statLabel}>Viewed</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My History</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchPrescriptions();}} tintColor="#16a34a" />}
          contentContainerStyle={prescriptions.length === 0 ? styles.emptyContainer : { paddingHorizontal: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <ClipboardList size={56} color="#bbf7d0" />
              <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
              <Text style={styles.emptySubtitle}>Prescriptions from your doctors will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 0 },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
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

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: '#16a34a', fontWeight: 'bold', fontSize: 16 },

  // Card Styling
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#f0fdf4', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  specialization: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  diagnosis: { fontSize: 14, color: '#475569', marginBottom: 14, lineHeight: 20 },
  
  cardFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  medCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medCountText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  footerRight: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 13, color: '#64748b', marginRight: 4, fontWeight: '500' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#14532d', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});