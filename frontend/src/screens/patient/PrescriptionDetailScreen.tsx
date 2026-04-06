import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PatientStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { ClipboardList, Pill, User, FileText, Calendar } from 'lucide-react-native';

type Route = RouteProp<PatientStackParamList, 'PrescriptionDetail'>;

export default function PrescriptionDetailScreen() {
  const route = useRoute<Route>();
  const { prescriptionId } = route.params;
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionsAPI.getDetail(prescriptionId)
      .then(data => setPrescription(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#7c3aed" /></View>;
  }

  if (!prescription) {
    return <View style={styles.centered}><Text>Prescription not found.</Text></View>;
  }

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.rxBadge}><Text style={styles.rxText}>Rx</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>Dr. {prescription.doctor_name}</Text>
          <Text style={styles.specialization}>{prescription.doctor_specialization}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{prescription.status_display}</Text>
        </View>
      </View>

      {/* Patient Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={16} color="#7c3aed" />
          <Text style={styles.sectionTitle}>Patient</Text>
        </View>
        <Text style={styles.value}>{prescription.patient_name}</Text>
        <Text style={styles.subValue}>{prescription.patient_email}</Text>
      </View>

      {/* Diagnosis */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ClipboardList size={16} color="#7c3aed" />
          <Text style={styles.sectionTitle}>Diagnosis</Text>
        </View>
        <Text style={styles.value}>{prescription.diagnosis}</Text>
      </View>

      {/* Notes */}
      {prescription.notes ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color="#7c3aed" />
            <Text style={styles.sectionTitle}>Doctor's Notes</Text>
          </View>
          <Text style={styles.value}>{prescription.notes}</Text>
        </View>
      ) : null}

      {/* Medications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Pill size={16} color="#7c3aed" />
          <Text style={styles.sectionTitle}>Medications ({prescription.medications?.length})</Text>
        </View>
        {prescription.medications?.map((med: any, i: number) => (
          <View key={i} style={styles.medCard}>
            <Text style={styles.medName}>{med.medicine_name}</Text>
            <View style={styles.medRow}>
              <Text style={styles.medLabel}>Dosage:</Text>
              <Text style={styles.medValue}>{med.dosage}</Text>
            </View>
            <View style={styles.medRow}>
              <Text style={styles.medLabel}>Frequency:</Text>
              <Text style={styles.medValue}>{med.frequency}</Text>
            </View>
            <View style={styles.medRow}>
              <Text style={styles.medLabel}>Duration:</Text>
              <Text style={styles.medValue}>{med.duration}</Text>
            </View>
            {med.instructions ? (
              <View style={styles.medRow}>
                <Text style={styles.medLabel}>Instructions:</Text>
                <Text style={styles.medValue}>{med.instructions}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Related Document */}
      {prescription.related_document_title && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color="#7c3aed" />
            <Text style={styles.sectionTitle}>Related Report</Text>
          </View>
          <Text style={styles.value}>{prescription.related_document_title}</Text>
        </View>
      )}

      {/* Dates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={16} color="#7c3aed" />
          <Text style={styles.sectionTitle}>Dates</Text>
        </View>
        <Text style={styles.subValue}>Issued: {formatDate(prescription.issued_at)}</Text>
        {prescription.viewed_at && (
          <Text style={styles.subValue}>Viewed: {formatDate(prescription.viewed_at)}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' }, // Light mint background
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#14532d', borderRadius: 16, // Dark Forest Green
    padding: 16, marginBottom: 16,
  },
  rxBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', // Glassmorphism white
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rxText: { fontSize: 18, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  specialization: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statusBadge: {
    backgroundColor: '#dcfce7', // Light green badge
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: '#166534' }, // Deep green text
  section: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
    borderWidth: 1, borderColor: '#bbf7d0', // Soft green border
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { 
    fontSize: 13, fontWeight: '700', 
    color: '#14532d', // Forest Green title
    textTransform: 'uppercase', letterSpacing: 0.5 
  },
  value: { fontSize: 15, color: '#1f2937', lineHeight: 22 },
  subValue: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  medCard: {
    backgroundColor: '#f8fafc', // Very light neutral for medicine items
    borderRadius: 10,
    padding: 12, marginTop: 8,
    borderLeftWidth: 4, borderLeftColor: '#22c55e', // Vibrant green accent
  },
  medName: { fontSize: 15, fontWeight: '700', color: '#14532d', marginBottom: 6 },
  medRow: { flexDirection: 'row', marginTop: 3 },
  medLabel: { fontSize: 13, color: '#6b7280', width: 90 },
  medValue: { fontSize: 13, color: '#374151', flex: 1 },
});