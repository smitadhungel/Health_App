import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, TouchableOpacity, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { DoctorStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { ClipboardList, Pill, User, FileText, Calendar, ChevronLeft, Clock, ShieldCheck, Mail } from 'lucide-react-native';

type Route = RouteProp<DoctorStackParamList, 'PrescriptionDetail'>;

export default function DoctorPrescriptionDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { prescriptionId } = route.params;
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionsAPI.getDetail(prescriptionId)
      .then(setPrescription)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );

  if (!prescription) return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>Prescription not found.</Text>
    </View>
  );

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) : '—';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- CLEAN TOP NAV --- */}
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeft size={28} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.titleCenter}>
            <Text style={styles.navTitle}>Medical Prescription</Text>
            <Text style={styles.navSub}>Record ID: #{prescription.id}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: prescription.status === 'COMPLETED' ? '#bbf7d0' : '#fed7aa' }]}>
             <View style={[styles.statusDot, { backgroundColor: prescription.status === 'COMPLETED' ? '#22c55e' : '#f59e0b' }]} />
             <Text style={styles.statusText}>{prescription.status_display}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- PATIENT HERO SECTION (FIXED) --- */}
        <View style={styles.patientHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{prescription.patient_name?.charAt(0)}</Text>
          </View>
          
          <View style={styles.heroMain}>
            <Text style={styles.heroName} numberOfLines={1}>{prescription.patient_name}</Text>
            
            <TouchableOpacity 
              style={styles.heroContact} 
              onPress={() => Linking.openURL(`mailto:${prescription.patient_email}`)}
            >
              <Mail size={14} color="#64748b" />
              <Text style={styles.heroEmail} numberOfLines={1}>{prescription.patient_email}</Text>
            </TouchableOpacity>

            <View style={styles.badgeRow}>
              <View style={styles.infoBadge}>
                <Clock size={12} color="#10b981" />
                <Text style={styles.infoBadgeText}>Issued: {formatDate(prescription.issued_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- DIAGNOSIS CARD --- */}
        <View style={styles.diagnosisCard}>
          <View style={styles.diagHeader}>
            <ClipboardList size={18} color="#10b981" />
            <Text style={styles.diagTitle}>Clinical Diagnosis</Text>
          </View>
          <Text style={styles.diagValue}>{prescription.diagnosis || "Consultation Follow-up"}</Text>
        </View>

        {/* --- MEDICATIONS SECTION --- */}
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Prescribed Medication</Text>
          <View style={styles.pillCount}>
            <Text style={styles.pillCountText}>{prescription.medications?.length} items</Text>
          </View>
        </View>

        {prescription.medications?.map((med: any, i: number) => (
          <View key={i} style={styles.medCard}>
            <View style={styles.medMain}>
              <View style={styles.medIconContainer}>
                <Pill size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.medicine_name}</Text>
                <Text style={styles.medDosage}>{med.dosage}</Text>
              </View>
            </View>
            
            <View style={styles.timingGrid}>
              <View style={styles.timingItem}>
                <Clock size={14} color="#64748b" />
                <Text style={styles.timingText}>{med.frequency}</Text>
              </View>
              <View style={styles.timingItem}>
                <Calendar size={14} color="#64748b" />
                <Text style={styles.timingText}>{med.duration}</Text>
              </View>
            </View>

            {med.instructions ? (
              <View style={styles.instructionBox}>
                <FileText size={14} color="#10b981" />
                <Text style={styles.instructionText}>{med.instructions}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* --- CLINICAL NOTES --- */}
        {prescription.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Doctor's Instructions</Text>
            <View style={styles.notesBodyContainer}>
               <Text style={styles.notesBody}>{prescription.notes}</Text>
            </View>
          </View>
        )}

        {/* --- FOOTER AUTHENTICATION --- */}
        {/* <View style={styles.footerAudit}>
           <View style={styles.auditLine}>
              <ShieldCheck size={16} color="#94a3b8" />
              <Text style={styles.auditText}>Verified Digital Record</Text>
           </View>
           {prescription.viewed_at && (
             <Text style={styles.viewedText}>Patient accessed on {formatDate(prescription.viewed_at)}</Text>
           )}
        </View> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#64748b', fontSize: 16 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Header Styles
  headerContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  navBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { padding: 4 },
  titleCenter: { alignItems: 'center' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  navSub: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  statusPill: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '800', color: '#475569' },

  // Hero Section (Polished)
  patientHero: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 20, borderRadius: 24, marginBottom: 20,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03
  },
  avatarCircle: { 
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdf4', 
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1, borderColor: '#dcfce7'
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#10b981' },
  heroMain: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  heroContact: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  heroEmail: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  badgeRow: { flexDirection: 'row', marginTop: 10 },
  infoBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8
  },
  infoBadgeText: { fontSize: 12, fontWeight: '700', color: '#065f46' },

  // Diagnosis
  diagnosisCard: { backgroundColor: '#fff', padding: 18, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  diagHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  diagTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  diagValue: { fontSize: 17, fontWeight: '700', color: '#1e293b' },

  // Meds
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  pillCount: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  pillCountText: { color: '#64748b', fontSize: 12, fontWeight: '700' },

  medCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1
  },
  medMain: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  medIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  medName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  medDosage: { fontSize: 14, color: '#10b981', fontWeight: '700', marginTop: 2 },
  
  timingGrid: { flexDirection: 'row', gap: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  timingItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timingText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  instructionBox: { 
    flexDirection: 'row', gap: 8, marginTop: 4, backgroundColor: '#f8fafc', 
    padding: 14, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: '#10b981' 
  },
  instructionText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 20, fontWeight: '500' },

  // Notes
  notesSection: { marginTop: 10 },
  notesTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', paddingLeft: 4 },
  notesBodyContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  notesBody: { fontSize: 15, color: '#475569', lineHeight: 24 },

  // Footer
  footerAudit: { marginTop: 40, alignItems: 'center' },
  auditLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  auditText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  viewedText: { fontSize: 11, color: '#cbd5e1' },
});