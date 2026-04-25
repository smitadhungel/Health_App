import React, { useState, useEffect } from 'react';
import {View, Text, StyleSheet, ScrollView,
ActivityIndicator, StatusBar, Platform, TouchableOpacity,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { PatientStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { 
  Pill, 
  FileText, 
  Calendar, 
  ArrowLeft,
  Clock,
} from 'lucide-react-native';

type Route = RouteProp<PatientStackParamList, 'PrescriptionDetail'>;

export default function PrescriptionDetailScreen() {
  // --- 1. ALL HOOKS AT THE TOP (Never call these conditionally) ---
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { prescriptionId } = route.params;
  
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await prescriptionsAPI.getDetail(prescriptionId);
        setPrescription(data);
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [prescriptionId]);

  // --- 2. HELPERS & HANDLERS ---
  const handleDownload = async () => {
    setDownloading(true);
    // Simulate PDF generation delay
    setTimeout(() => setDownloading(false), 2000);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '—';

  // --- 3. CONDITIONAL RENDERING (Must be after hooks) ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading Medical Record...</Text>
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Prescription not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 4. MAIN RENDER ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.navHeader}>
          <Text style={styles.navTitle}>Medical Prescription</Text>
          <View style={{ width: 40 }} /> 
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.paper}>
          <View style={styles.doctorHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>Dr. {prescription?.doctor_name}</Text>
              <Text style={styles.specialization}>{prescription?.doctor_specialization}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>PATIENT NAME</Text>
              <Text style={styles.metaValue}>{prescription?.patient_name}</Text>
            </View>
            <View style={[styles.metaBox, { borderLeftWidth: 1, borderColor: '#f1f5f9' }]}>
              <Text style={styles.metaLabel}>ISSUED DATE</Text>
              <Text style={styles.metaValue}>{formatDate(prescription?.issued_at)}</Text>
            </View>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.sectionTitleRow}>
              <FileText size={16} color="#16a34a" />
              <Text style={styles.sectionTitle}>Diagnosis</Text>
            </View>
            <View style={styles.diagnosisBox}>
              <Text style={styles.diagnosisText}>{prescription?.diagnosis}</Text>
              {prescription?.notes && (
                <Text style={styles.notesText}>{prescription.notes}</Text>
              )}
            </View>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.sectionTitleRow}>
              <Pill size={16} color="#16a34a" />
              <Text style={styles.sectionTitle}>Prescribed Medication</Text>
            </View>

            {prescription?.medications?.map((med: any, i: number) => (
              <View key={i} style={styles.medItem}>
                <View style={styles.medMain}>
                  <View style={styles.medNameContainer}>
                    <View style={styles.numberCircle}><Text style={styles.numberText}>{i+1}</Text></View>
                    <Text style={styles.medName}>{med.medicine_name}</Text>
                  </View>
                  <Text style={styles.medDosage}>{med.dosage}</Text>
                </View>
                
                <View style={styles.medSubRow}>
                  <View style={styles.medTag}>
                    <Clock size={12} color="#64748b" />
                    <Text style={styles.medTagText}>{med.frequency}</Text>
                  </View>
                  <View style={styles.medTag}>
                    <Calendar size={12} color="#64748b" />
                    <Text style={styles.medTagText}>{med.duration}</Text>
                  </View>
                </View>

                {med.instructions && (
                  <View style={styles.instructionBox}>
                    <Text style={styles.instructionText}>{med.instructions}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Verified Electronic Signature</Text>
            <Text style={styles.footerInfo}>Ref: PR-{prescription?.id?.toString().padStart(6, '0')}</Text>
          </View> */}
        </View>

        {/* <TouchableOpacity 
          style={[styles.downloadBtn, downloading && { backgroundColor: '#86efac' }]} 
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Download size={20} color="#fff" />
              <Text style={styles.downloadBtnText}>Export as PDF</Text>
            </>
          )}
        </TouchableOpacity> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '500' },
  errorText: { fontSize: 16, color: '#ef4444', fontWeight: '600' },
  retryBtn: { marginTop: 10, padding: 8 },
  retryText: { color: '#16a34a', fontWeight: '700' },
  
  safeHeader: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  navTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 0 },

  scrollContent: { padding: 16, paddingBottom: 40 },
  paper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  doctorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  doctorName: { fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  specialization: { fontSize: 14, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  rxContainer: { width: 54, height: 54, backgroundColor: '#f0fdf4', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rxText: { fontSize: 26, fontWeight: '900', color: '#16a34a', fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },
  metaGrid: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 25, padding: 12 },
  metaBox: { flex: 1, paddingHorizontal: 10 },
  metaLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 4 },
  contentSection: { marginBottom: 25 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
  diagnosisBox: { backgroundColor: '#fff', paddingLeft: 4 },
  diagnosisText: { fontSize: 16, color: '#334155', fontWeight: '600', lineHeight: 24 },
  notesText: { fontSize: 14, color: '#64748b', marginTop: 6, lineHeight: 20 },
  medItem: { backgroundColor: '#fff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  medMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  medNameContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  numberCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  numberText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  medName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  medDosage: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  medSubRow: { flexDirection: 'row', gap: 10, marginTop: 10, paddingLeft: 32 },
  medTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  medTagText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  instructionBox: { marginTop: 10, marginLeft: 32, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8 },
  instructionText: { fontSize: 13, color: '#166534', fontWeight: '500' },
  signatureArea: { marginTop: 30, alignItems: 'center' },
  signatureLine: { width: 180, height: 1, backgroundColor: '#e2e8f0', marginBottom: 8 },
  signatureLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  footerInfo: { fontSize: 10, color: '#cbd5e1', marginTop: 10 },
  downloadBtn: { marginTop: 20, backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  downloadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});