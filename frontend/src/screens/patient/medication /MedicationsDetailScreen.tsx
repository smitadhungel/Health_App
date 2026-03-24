import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { medicationsAPI } from '../../../services/api';
import {
  ArrowLeft,
  Pill,
  Package,
  Clock,
  FileText,
  User,
  Calendar,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

type RootStackParamList = {
  MedicationDetail: { medicationId: number };
  AddMedication: { medicationId?: number };
  RequestRefill: { medicationId: number; medicationName: string };
  TodayDoses: undefined;
};

type MedicationDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MedicationDetail'>;
type MedicationDetailRouteProp = RouteProp<RootStackParamList, 'MedicationDetail'>;

interface Medication {
  id: number;
  name: string;
  dosage: string;
  form_display: string;
  frequency_display: string;
  instructions?: string;
  prescribed_by_name?: string;
  start_date: string;
  end_date?: string;
  is_refill_needed?: boolean;
}

interface Schedule {
  id: number;
  time: string;
  dosage_count: number;
  notes?: string;
}

type LogStatus = 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED';

export default function MedicationDetailScreen() {
  const navigation = useNavigation<MedicationDetailNavigationProp>();
  const route = useRoute<MedicationDetailRouteProp>();
  const { medicationId } = route.params;

  const [medication, setMedication] = useState<Medication | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [logStatus, setLogStatus] = useState<LogStatus>('TAKEN');
  const [logNotes, setLogNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [medRes, schedulesRes, logsRes] = await Promise.all([
        medicationsAPI.getDetails(medicationId),
        medicationsAPI.getSchedules(medicationId),
        medicationsAPI.getLogs(medicationId),
      ]);
      setMedication(medRes);
      setSchedules(schedulesRes);
      setLogs(logsRes);
    } catch (error) {
      Alert.alert('Error', 'Failed to load medication details.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogDose = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setLogModalVisible(true);
  };

  const submitLog = async () => {
    if (!selectedSchedule) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await medicationsAPI.log(medicationId, {
        scheduled_date: today,
        scheduled_time: selectedSchedule.time,
        status: logStatus,
        actual_time: logStatus === 'TAKEN' ? new Date().toISOString() : undefined,
        dosage_taken: selectedSchedule.dosage_count,
        notes: logNotes || undefined,
      });
      Alert.alert('Success', 'Dose logged successfully.');
      setLogModalVisible(false);
      setLogNotes('');
      setLogStatus('TAKEN');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to log dose.');
      console.error(error);
    }
  };

  const handleRequestRefill = () => {
    if (medication) {
      navigation.navigate('RequestRefill', {
        medicationId,
        medicationName: medication.name,
      });
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddMedication', { medicationId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicationsAPI.delete(medicationId);
              Alert.alert('Success', 'Medication deleted.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medication.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.centerContainer}>
        <Text>Medication not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#16a34a" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{medication.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
            <Edit3 size={22} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Trash2 size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Pill size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Dosage:</Text>
          <Text style={styles.detailValue}>{medication.dosage}</Text>
        </View>
        <View style={styles.detailRow}>
          <Package size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Form:</Text>
          <Text style={styles.detailValue}>{medication.form_display}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Frequency:</Text>
          <Text style={styles.detailValue}>{medication.frequency_display}</Text>
        </View>
        {medication.instructions ? (
          <View style={styles.detailRow}>
            <FileText size={20} color="#16a34a" />
            <Text style={styles.detailLabel}>Instructions:</Text>
            <Text style={styles.detailValue}>{medication.instructions}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <User size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Prescribed by:</Text>
          <Text style={styles.detailValue}>{medication.prescribed_by_name || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Calendar size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Start:</Text>
          <Text style={styles.detailValue}>{medication.start_date}</Text>
        </View>
        {medication.end_date && (
          <View style={styles.detailRow}>
            <Calendar size={20} color="#16a34a" />
            <Text style={styles.detailLabel}>End:</Text>
            <Text style={styles.detailValue}>{medication.end_date}</Text>
          </View>
        )}
      </View>

      {/* Schedules Section */}
      <Text style={styles.sectionTitle}>Dose Schedules</Text>
      {schedules.length === 0 ? (
        <Text style={styles.emptyText}>No schedules set.</Text>
      ) : (
        schedules.map((schedule) => (
          <View key={schedule.id} style={styles.scheduleCard}>
            <View style={styles.scheduleHeader}>
              <Clock size={18} color="#16a34a" />
              <Text style={styles.scheduleTime}>{schedule.time}</Text>
            </View>
            <Text style={styles.scheduleDosage}>Dosage: {schedule.dosage_count}</Text>
            {schedule.notes ? <Text style={styles.scheduleNotes}>Note: {schedule.notes}</Text> : null}
            <TouchableOpacity style={styles.logButton} onPress={() => handleLogDose(schedule)}>
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.logButtonText}>Log Dose</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Refill Button */}
      {medication.is_refill_needed && (
        <TouchableOpacity style={styles.refillButton} onPress={handleRequestRefill}>
          <AlertCircle size={20} color="#fff" />
          <Text style={styles.refillButtonText}>Request Refill</Text>
        </TouchableOpacity>
      )}

      {/* Log Modal */}
      <Modal visible={logModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Dose</Text>
            <Text style={styles.modalSubtitle}>{medication.name} at {selectedSchedule?.time}</Text>

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={logStatus}
                onValueChange={(value) => setLogStatus(value as LogStatus)}
                style={styles.picker}
                dropdownIconColor="#16a34a"
              >
                <Picker.Item label="Taken" value="TAKEN" />
                <Picker.Item label="Missed" value="MISSED" />
                <Picker.Item label="Skipped" value="SKIPPED" />
                <Picker.Item label="Delayed" value="DELAYED" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={logNotes}
              onChangeText={setLogNotes}
              placeholder="e.g., felt dizzy"
              multiline
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitLog}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
    flex: 1,
    marginHorizontal: 10,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 12,
    padding: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0fdf4',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    width: 90,
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#14532d',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
    marginLeft: 8,
  },
  scheduleDosage: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  scheduleNotes: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  logButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  refillButton: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  refillButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14532d',
    marginTop: 16,
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0fdf4',
  },
  picker: {
    height: 50,
    color: '#14532d',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f0fdf4',
    color: '#14532d',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#16a34a',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});