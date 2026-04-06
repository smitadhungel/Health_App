import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DoctorStackParamList } from '../../navigation/types';
import { documentsAPI } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, ClipboardList, Eye, Calendar } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<DoctorStackParamList, 'SharedDocuments'>;

const categoryColors: Record<string, string> = {
  LAB_REPORT:   '#dbeafe',
  BLOOD_TEST:   '#fee2e2',
  SCAN:         '#fef9c3',
  MRI:          '#f3e8ff',
  CT_SCAN:      '#ffedd5',
  PRESCRIPTION: '#dcfce7',
  OTHER:        '#f1f5f9',
};

const categoryTextColors: Record<string, string> = {
  LAB_REPORT:   '#1e40af',
  BLOOD_TEST:   '#991b1b',
  SCAN:         '#854d0e',
  MRI:          '#5b21b6',
  CT_SCAN:      '#7c2d12',
  PRESCRIPTION: '#166534',
  OTHER:        '#374151',
};

export default function SharedDocumentsScreen() {
  const navigation = useNavigation<Nav>();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentsAPI.getSharedWithDoctor();
      // Backend returns { count, documents } or plain array
      setDocuments(Array.isArray(res) ? res : res.documents || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh every time screen is focused
  useFocusEffect(useCallback(() => { fetchDocuments(); }, [fetchDocuments]));

  const handleViewDocument = (fileUrl: string | null | undefined) => {
    if (!fileUrl) {
      Alert.alert('Unavailable', 'File URL is not available.');
      return;
    }
    Linking.openURL(fileUrl).catch(() =>
      Alert.alert('Error', 'Could not open the document.')
    );
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#0f4c81" /></View>;
  }

  const renderItem = ({ item }: { item: any }) => {
    const bgColor  = categoryColors[item.category]     || '#f1f5f9';
    const txtColor = categoryTextColors[item.category] || '#374151';

    // patient_id comes from the fixed backend serializer
    // fall back to item.patient in case old serializer is still in use
    const patientId   = item.patient_id   ?? item.patient;
    const patientName = item.patient_name ?? 'Unknown Patient';

    return (
      <View style={styles.card}>
        {/* ── Document Header ── */}
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: bgColor }]}>
            <FileText size={18} color={txtColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.docCategory, { color: txtColor }]}>{item.category_display}</Text>
          </View>
        </View>

        {/* ── Patient & Date ── */}
        <View style={styles.metaRow}>
          <Text style={styles.patientName}>👤 {patientName}</Text>
          {item.document_date && (
            <View style={styles.dateRow}>
              <Calendar size={12} color="#9ca3af" />
              <Text style={styles.dateText}>{formatDate(item.document_date)}</Text>
            </View>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actions}>
          {/* View Document */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleViewDocument(item.file_url)}
          >
            <Eye size={15} color="#0f4c81" />
            <Text style={styles.viewButtonText}>View Doc</Text>
          </TouchableOpacity>

          {/* Write Prescription */}
          <TouchableOpacity
            style={styles.prescribeButton}
            onPress={() => {
              if (!patientId) {
                Alert.alert('Error', 'Patient information is missing. Please refresh.');
                return;
              }
              navigation.navigate('WritePrescription', {
                patientId,
                patientName,
                documentId: item.id,
                documentTitle: item.title,
              });
            }}
          >
            <ClipboardList size={15} color="#fff" />
            <Text style={styles.prescribeText}>Write Prescription</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDocuments(); }}
          />
        }
        contentContainerStyle={
          documents.length === 0 ? styles.emptyContainer : { padding: 16 }
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FileText size={56} color="#93c5fd" />
            <Text style={styles.emptyTitle}>No Documents Shared</Text>
            <Text style={styles.emptySubtitle}>
              Patients haven't shared any documents with you yet.{'\n'}
              They share documents when booking an appointment.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f0fdf4' }, // Light mint background
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4,
    borderWidth: 1, borderColor: '#bbf7d0', // Soft green border
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  categoryBadge: {
    width: 42, height: 42, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
    backgroundColor: '#dcfce7', // Light lime background for the icon
  },
  docTitle:       { fontSize: 15, fontWeight: '700', color: '#14532d' }, // Deep forest green
  docCategory:    { fontSize: 12, marginTop: 2, fontWeight: '500', color: '#166534' }, // Medium green

  metaRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  patientName:    { fontSize: 13, color: '#374151', fontWeight: '500' },
  dateRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText:       { fontSize: 12, color: '#9ca3af' },

  actions:        { flexDirection: 'row', gap: 8 },
  viewButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#ecfdf5', // Very light emerald
    borderRadius: 10, padding: 10, gap: 6,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  viewButtonText: { fontSize: 13, fontWeight: '600', color: '#166534' },
  prescribeButton: {
    flex: 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#14532d', // Primary dark green
    borderRadius: 10, padding: 10, gap: 6,
  },
  prescribeText:  { fontSize: 13, fontWeight: '600', color: '#fff' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox:       { alignItems: 'center', padding: 40 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#14532d', marginTop: 16 },
  emptySubtitle:  { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});