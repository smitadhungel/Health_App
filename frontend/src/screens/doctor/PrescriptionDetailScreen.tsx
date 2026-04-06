import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { DoctorStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { ClipboardList, Pill, User, FileText, Calendar } from 'lucide-react-native';

type Route = RouteProp<DoctorStackParamList, 'PrescriptionDetail'>;

export default function DoctorPrescriptionDetailScreen() {
  const route = useRoute<Route>();
  const { prescriptionId } = route.params;
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionsAPI.getDetail(prescriptionId)
      .then(setPrescription)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#0f4c81" /></View>;
  if (!prescription) return <View style={styles.centered}><Text>Not found.</Text></View>;

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.headerCard}>
        <View style={styles.rxBadge}><Text style={styles.rxText}>Rx</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Prescription #{prescription.id}</Text>
          <Text style={styles.headerSub}>{prescription.status_display}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={15} color="#0f4c81" />
          <Text style={styles.sectionTitle}>Patient</Text>
        </View>
        <Text style={styles.value}>{prescription.patient_name}</Text>
        <Text style={styles.subValue}>{prescription.patient_email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ClipboardList size={15} color="#0f4c81" />
          <Text style={styles.sectionTitle}>Diagnosis</Text>
        </View>
        <Text style={styles.value}>{prescription.diagnosis}</Text>
      </View>

      {prescription.notes ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={15} color="#0f4c81" />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <Text style={styles.value}>{prescription.notes}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Pill size={15} color="#0f4c81" />
          <Text style={styles.sectionTitle}>Medications ({prescription.medications?.length})</Text>
        </View>
        {prescription.medications?.map((med: any, i: number) => (
          <View key={i} style={styles.medCard}>
            <Text style={styles.medName}>{med.medicine_name}</Text>
            {[
              ['Dosage', med.dosage],
              ['Frequency', med.frequency],
              ['Duration', med.duration],
              ['Instructions', med.instructions],
            ].filter(([, v]) => v).map(([label, value]) => (
              <View key={label} style={styles.medRow}>
                <Text style={styles.medLabel}>{label}:</Text>
                <Text style={styles.medValue}>{value}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={15} color="#0f4c81" />
          <Text style={styles.sectionTitle}>Dates</Text>
        </View>
        <Text style={styles.subValue}>Issued: {formatDate(prescription.issued_at)}</Text>
        {prescription.viewed_at && (
          <Text style={styles.subValue}>Viewed by patient: {formatDate(prescription.viewed_at)}</Text>
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
    backgroundColor: '#14532d', borderRadius: 16, // Forest Green
    padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  rxBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', // Glassmorphism
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  rxText: { fontSize: 20, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1,
    borderWidth: 1, borderColor: '#bbf7d0', // Soft green border
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { 
    fontSize: 12, fontWeight: '700', 
    color: '#14532d', // Forest Green
    textTransform: 'uppercase', letterSpacing: 0.5 
  },
  value: { fontSize: 15, color: '#1f2937', lineHeight: 22 },
  subValue: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  medCard: {
    backgroundColor: '#f8fafc', // Light neutral for contrast
    borderRadius: 10, padding: 12,
    marginTop: 8, borderLeftWidth: 4, borderLeftColor: '#22c55e', // Vibrant green accent
  },
  medName: { fontSize: 14, fontWeight: '700', color: '#14532d', marginBottom: 6 },
  medRow: { flexDirection: 'row', marginTop: 3 },
  medLabel: { fontSize: 12, color: '#6b7280', width: 90 },
  medValue: { fontSize: 12, color: '#374151', flex: 1 },
});