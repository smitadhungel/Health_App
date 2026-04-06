import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { adminAPI } from '../../services/api';
import { CheckCircle, XCircle, User, Award } from 'lucide-react-native';

export default function PendingDoctorsScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await adminAPI.getPendingDoctors();
      const list = res.doctors || res;
      // Filter only pending
      setDoctors(list.filter((d: any) => !d.is_verified));
    } catch (e) {
      Alert.alert('Error', 'Failed to load doctors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleApprove = (doctor: any) => {
    Alert.alert(
      'Approve Doctor',
      `Approve Dr. ${doctor.doctor_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', onPress: async () => {
            try {
              await adminAPI.approveDoctor(doctor.id);
              setDoctors(prev => prev.filter(d => d.id !== doctor.id));
              Alert.alert('Success', 'Doctor approved!');
            } catch {
              Alert.alert('Error', 'Failed to approve doctor.');
            }
          },
        },
      ]
    );
  };

  const handleReject = (doctor: any) => {
    setSelectedDoctor(doctor);
    setRejectReason('');
    setRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please enter a rejection reason.');
      return;
    }
    try {
      await adminAPI.rejectDoctor(selectedDoctor.id, rejectReason);
      setDoctors(prev => prev.filter(d => d.id !== selectedDoctor.id));
      setRejectModal(false);
      Alert.alert('Done', 'Doctor rejected.');
    } catch {
      Alert.alert('Error', 'Failed to reject doctor.');
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <User size={24} color="#1e3a5f" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.doctor_name}</Text>
          <Text style={styles.specialization}>{item.specialization_display}</Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Award size={14} color="#6b7280" />
        <Text style={styles.infoText}>License: {item.license_number || 'N/A'}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>📧 {item.email}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>🏥 {item.experience_years} years experience</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApprove(item)}
        >
          <CheckCircle size={18} color="#fff" />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item)}
        >
          <XCircle size={18} color="#dc2626" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={doctors}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDoctors(); }} />}
        contentContainerStyle={doctors.length === 0 ? styles.emptyContainer : { padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <CheckCircle size={56} color="#86efac" />
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySubtitle}>No pending doctor verifications</Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Doctor</Text>
            <Text style={styles.modalSubtitle}>
              Dr. {selectedDoctor?.doctor_name}
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setRejectModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRejectButton} onPress={confirmReject}>
                <Text style={styles.confirmRejectText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' }, // Light mint background
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4,
    borderWidth: 1, borderColor: '#bbf7d0', // Soft green border
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#dcfce7', justifyContent: 'center', // Light lime green
    alignItems: 'center', marginRight: 10,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#14532d' }, // Forest green
  specialization: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  
  // Pending state: Kept amber/yellow as it's the universal "Warning/Pending" color
  pendingBadge: { backgroundColor: '#fef9c3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingText: { fontSize: 11, fontWeight: '600', color: '#854d0e' },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: '#4b5563' },
  
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#16a34a', // Standard success green
    borderRadius: 10, padding: 12, gap: 6,
  },
  approveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  rejectButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fef2f2', // Soft red
    borderRadius: 10, padding: 12, gap: 6,
    borderWidth: 1, borderColor: '#fee2e2',
  },
  rejectText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#14532d', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#14532d', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  reasonInput: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12,
    fontSize: 14, borderWidth: 1, borderColor: '#bbf7d0', // Greenish border
    textAlignVertical: 'top', minHeight: 80, marginBottom: 16,
    color: '#1f2937',
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1, alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 10, padding: 14,
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  confirmRejectButton: {
    flex: 1, alignItems: 'center', backgroundColor: '#dc2626',
    borderRadius: 10, padding: 14,
  },
  confirmRejectText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});