import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { DoctorStackParamList } from '../../navigation/types';
import { prescriptionsAPI } from '../../services/api';
import { Plus, Trash2, Send, Stethoscope, Pill, ClipboardList } from 'lucide-react-native';

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
    if (!diagnosis.trim()) {
      Alert.alert('Required', 'Please enter a diagnosis.');
      return;
    }
    const invalidMed = medications.find(m => !m.medicine_name.trim() || !m.dosage.trim());
    if (invalidMed) {
      Alert.alert('Required', 'Each medication must have a name and dosage.');
      return;
    }

    setSubmitting(true);
    try {
      await prescriptionsAPI.create({
        patient: patientId,
        related_document: documentId,
        diagnosis,
        notes,
        medications,
      });
      Alert.alert('Success', 'Prescription issued successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to issue prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Patient Header Card */}
      <View style={styles.patientCard}>
        <View style={styles.patientIconBox}>
          <Stethoscope size={24} color="#14532d" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientLabel}>PATIENT</Text>
          <Text style={styles.patientName}>{patientName}</Text>
          {documentTitle && (
            <Text style={styles.documentRef}>📄 Ref: {documentTitle}</Text>
          )}
        </View>
      </View>

      {/* Diagnosis Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <ClipboardList size={16} color="#14532d" />
          <Text style={styles.label}>Diagnosis <Text style={styles.required}>*</Text></Text>
        </View>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Acute Viral Fever / Hypertension..."
          placeholderTextColor="#94a3b8"
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Medications Section */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Pill size={16} color="#14532d" />
          <Text style={styles.label}>Medications <Text style={styles.required}>*</Text></Text>
        </View>
        
        {medications.map((med, index) => (
          <View key={index} style={styles.medCard}>
            <View style={styles.medHeader}>
              <Text style={styles.medNumber}>MEDICINE #{index + 1}</Text>
              {medications.length > 1 && (
                <TouchableOpacity onPress={() => removeMed(index)} style={styles.deleteBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Medicine Name (e.g. Amoxicillin) *"
              placeholderTextColor="#94a3b8"
              value={med.medicine_name}
              onChangeText={v => updateMed(index, 'medicine_name', v)}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Dosage (500mg) *"
                placeholderTextColor="#94a3b8"
                value={med.dosage}
                onChangeText={v => updateMed(index, 'dosage', v)}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Freq (1-0-1)"
                placeholderTextColor="#94a3b8"
                value={med.frequency}
                onChangeText={v => updateMed(index, 'frequency', v)}
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Duration (5 days)"
                placeholderTextColor="#94a3b8"
                value={med.duration}
                onChangeText={v => updateMed(index, 'duration', v)}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Instructions (After food)"
                placeholderTextColor="#94a3b8"
                value={med.instructions}
                onChangeText={v => updateMed(index, 'instructions', v)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addMedButton} onPress={addMed}>
          <Plus size={18} color="#166534" />
          <Text style={styles.addMedText}>Add Another Medication</Text>
        </TouchableOpacity>
      </View>

      {/* Notes Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Additional Doctor's Notes</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Advice on diet, lifestyle, or follow-up..."
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <>
              <Send size={18} color="#fff" />
              <Text style={styles.submitText}>Issue Prescription</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  patientCard: {
    backgroundColor: '#14532d', borderRadius: 16,
    padding: 16, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  patientIconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#dcfce7', justifyContent: 'center',
    alignItems: 'center', marginRight: 14,
  },
  patientLabel: { fontSize: 10, fontWeight: '800', color: '#bbf7d0', letterSpacing: 1 },
  patientName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  documentRef: { fontSize: 12, color: '#dcfce7', marginTop: 4, fontStyle: 'italic' },
  
  section: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '700', color: '#14532d' },
  required: { color: '#ef4444' },

  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1f2937', marginBottom: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  inputRow: { flexDirection: 'row' },
  textArea: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1f2937', textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#bbf7d0', minHeight: 80,
  },

  medCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
    borderLeftWidth: 6, borderLeftColor: '#22c55e',
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  medHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  medNumber: { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.5 },
  deleteBtn: { padding: 4 },
  
  addMedButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#dcfce7',
    borderRadius: 12, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#bbf7d0', borderStyle: 'dashed',
  },
  addMedText: { fontSize: 14, fontWeight: '700', color: '#166534' },

  submitButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#14532d',
    borderRadius: 16, padding: 18, gap: 10,
    marginBottom: 40,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});