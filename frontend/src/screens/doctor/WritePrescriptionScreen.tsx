import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { DoctorStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { Plus, Trash2, Send, Pill, ClipboardList, Info, UserCircle } from 'lucide-react-native';

type Route = RouteProp<DoctorStackParamList, 'WritePrescription'>;

interface Medication {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const emptyMed = (): Medication => ({
  medicine_name: '', dosage: '',
  frequency: '', duration: '', instructions: '',
});

export default function WritePrescriptionScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { patientId, patientName, documentId, documentTitle } = route.params;

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([emptyMed()]);
  const [submitting, setSubmitting] = useState(false);

  const updateMed = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const addMed = () => setMedications([...medications, emptyMed()]);
  const removeMed = (index: number) => {
    if (medications.length === 1) return;
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!diagnosis.trim()) return Alert.alert('Missing Field', 'Please enter a diagnosis.');
    const invalid = medications.find(m => !m.medicine_name.trim() || !m.dosage.trim());
    if (invalid) return Alert.alert('Invalid Meds', 'Each medicine needs at least a name and dosage.');

    setSubmitting(true);
    try {
      await prescriptionsAPI.create({
        patient: patientId, related_document: documentId,
        diagnosis, notes, medications,
      });
      Alert.alert('Issued', 'The prescription has been sent to the patient.', [
        { text: 'Finish', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', 'Could not save prescription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.patientRow}>
              <UserCircle size={40} color="#065f46" />
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patientName}</Text>
                <Text style={styles.refText}>Ref: {documentTitle || 'General Consultation'}</Text>
              </View>
            </View>
          </View>

          {/* Diagnosis Block */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ClipboardList size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Diagnosis</Text>
            </View>
            <TextInput
              style={styles.diagnosisInput}
              placeholder="Enter primary condition..."
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline
            />
          </View>

          {/* Medication Block */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pill size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Medications</Text>
            </View>

            {medications.map((med, index) => (
              <View key={index} style={styles.medicationCard}>
                <View style={styles.medCardHeader}>
                  <View style={styles.medIndexBadge}>
                    <Text style={styles.medIndexText}>{index + 1}</Text>
                  </View>
                  {medications.length > 1 && (
                    <TouchableOpacity onPress={() => removeMed(index)}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.mainInput}
                  placeholder="Medicine Name (e.g. Paracetamol)"
                  value={med.medicine_name}
                  onChangeText={v => updateMed(index, 'medicine_name', v)}
                />

                <View style={styles.inputGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.miniLabel}>Dosage</Text>
                    <TextInput
                      style={styles.gridInput}
                      placeholder="500mg"
                      value={med.dosage}
                      onChangeText={v => updateMed(index, 'dosage', v)}
                    />
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.miniLabel}>Frequency</Text>
                    <TextInput
                      style={styles.gridInput}
                      placeholder="1-0-1"
                      value={med.frequency}
                      onChangeText={v => updateMed(index, 'frequency', v)}
                    />
                  </View>
                </View>

                <View style={styles.inputGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.miniLabel}>Duration</Text>
                    <TextInput
                      style={styles.gridInput}
                      placeholder="7 Days"
                      value={med.duration}
                      onChangeText={v => updateMed(index, 'duration', v)}
                    />
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.miniLabel}>Instructions</Text>
                    <TextInput
                      style={styles.gridInput}
                      placeholder="After food"
                      value={med.instructions}
                      onChangeText={v => updateMed(index, 'instructions', v)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={addMed}>
              <Plus size={20} color="#059669" />
              <Text style={styles.addBtnText}>Add Medication</Text>
            </TouchableOpacity>
          </View>

          {/* Notes Block */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Advice & Notes</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Bed rest, drink plenty of water, etc..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </ScrollView>

        {/* Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.btnDisabled]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Issue Prescription</Text>
                <Send size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollPadding: { padding: 20, paddingBottom: 100 },

  // Header Card
  headerCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  refText: { fontSize: 13, color: '#64748b', marginTop: 2 },

  // Section Styling
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  diagnosisInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0', minHeight: 80, textAlignVertical: 'top'
  },
  notesInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 15,
    borderWidth: 1, borderColor: '#e2e8f0', minHeight: 100, textAlignVertical: 'top'
  },

  // Medication Card
  medicationCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#cbd5e1', borderLeftWidth: 4, borderLeftColor: '#10b981'
  },
  medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  medIndexBadge: { backgroundColor: '#f1f5f9', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  medIndexText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  
  mainInput: { fontSize: 16, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8, marginBottom: 16 },
  
  inputGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridItem: { flex: 1 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' },
  gridInput: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#f1f5f9' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#10b981', gap: 8
  },
  addBtnText: { color: '#059669', fontWeight: '700', fontSize: 15 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9'
  },
  submitBtn: {
    backgroundColor: '#064e3b', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 }
});