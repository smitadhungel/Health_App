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
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { medicationsAPI } from '../../../services/api';
import {
  ArrowLeft,
  Pill,
  Clock,
  FileText,
  User,
  Calendar,
  Trash2,
  Edit3,
  AlertCircle,
  CheckCircle,
  ChevronRight,
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
      setLogModalVisible(false);
      setLogNotes('');
      loadData();
      Alert.alert('Success', 'Dose recorded.');
    } catch (error) {
      Alert.alert('Error', 'Failed to log dose.');
    }
  };

  const handleRequestRefill = () => {
    if (medication) {
      navigation.navigate('RequestRefill', { medicationId, medicationName: medication.name });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!medication) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header */}
      <View style={styles.headerNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('AddMedication', { medicationId })} style={styles.iconBtn}>
            <Edit3 size={20} color="#16a34a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main Info Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.pillIconBg}>
              <Pill size={30} color="#fff" />
            </View>
            <View style={styles.heroTextContent}>
              <Text style={styles.medNameText}>{medication.name}</Text>
              <Text style={styles.medDosageText}>{medication.dosage} • {medication.form_display}</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Clock size={16} color="#16a34a" />
              <Text style={styles.statLabel}>Frequency</Text>
              <Text style={styles.statValue}>{medication.frequency_display}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <User size={16} color="#16a34a" />
              <Text style={styles.statLabel}>Doctor</Text>
              <Text style={styles.statValue} numberOfLines={1}>{medication.prescribed_by_name || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Refill Alert */}
        {medication.is_refill_needed && (
          <TouchableOpacity style={styles.refillAlert} onPress={handleRequestRefill}>
            <AlertCircle size={20} color="#9a3412" />
            <Text style={styles.refillAlertText}>Refill needed: Running low on stock</Text>
            <ChevronRight size={18} color="#9a3412" />
          </TouchableOpacity>
        )}

        {/* Details List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Treatment Plan</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Calendar size={18} color="#64748b" />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>{medication.start_date}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <FileText size={18} color="#64748b" />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Instructions</Text>
                <Text style={styles.infoValue}>{medication.instructions || 'Take as directed by your physician.'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Schedule List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>
          {schedules.map((schedule) => (
            <TouchableOpacity 
              key={schedule.id} 
              style={styles.scheduleRow} 
              onPress={() => handleLogDose(schedule)}
              activeOpacity={0.7}
            >
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{schedule.time}</Text>
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.dosageText}>{schedule.dosage_count} Unit(s)</Text>
                {schedule.notes && <Text style={styles.noteText}>{schedule.notes}</Text>}
              </View>
              <View style={styles.logAction}>
                <CheckCircle size={22} color="#16a34a" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Danger Zone */}
        <TouchableOpacity 
            onPress={() => {
                Alert.alert("Delete", "Are you sure?", [
                    {text: "Cancel"},
                    {text: "Delete", style: 'destructive', onPress: async () => {
                        await medicationsAPI.delete(medicationId);
                        navigation.goBack();
                    }}
                ])
            }}
            style={styles.deleteBtn}
        >
          <Trash2 size={18} color="#ef4444" />
          <Text style={styles.deleteBtnText}>Remove Medication</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modern Log Modal */}
      <Modal visible={logModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Record Dose</Text>
            <Text style={styles.modalSub}>{medication.name} at {selectedSchedule?.time}</Text>

            <View style={styles.pickerWrapper}>
               <Picker
                selectedValue={logStatus}
                onValueChange={(itemValue) => setLogStatus(itemValue as LogStatus)}
              >
                <Picker.Item label="Taken" value="TAKEN" color="#000000" />
                <Picker.Item label="Missed" value="MISSED"  color="#000000"/>
                <Picker.Item label="Skipped" value="SKIPPED" color="#000000"/>
                <Picker.Item label="Delayed" value="DELAYED" color="#000000"/>
              </Picker>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Add a note (optional)..."
              placeholderTextColor="#000000"
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setLogModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={submitLog}>
                <Text style={styles.btnSubmitText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  headerRight: { flexDirection: 'row' },
  iconBtn: { padding: 8, borderRadius: 12, backgroundColor: '#f1f5f9' },
  
  scrollContent: { padding: 20 },

  // Hero Card
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
      android: { elevation: 4 }
    }),
    marginBottom: 20,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  pillIconBg: { 
    width: 60, height: 60, borderRadius: 20, backgroundColor: '#16a34a', 
    justifyContent: 'center', alignItems: 'center' 
  },
  heroTextContent: { marginLeft: 16 },
  medNameText: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  medDosageText: { fontSize: 14, color: '#64748b', fontWeight: '500', marginTop: 2 },
  
  statsGrid: { 
    flexDirection: 'row', 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    paddingTop: 15 
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#f1f5f9' },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, color: '#1e293b', fontWeight: '700' },

  // Sections
  sectionContainer: { marginTop: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 15, marginLeft: 5 },
  
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoTextWrapper: { marginLeft: 15 },
  infoLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '500', marginTop: 1 },

  // Schedule Rows
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timeBadge: { 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12 
  },
  timeText: { color: '#16a34a', fontWeight: '800', fontSize: 14 },
  scheduleInfo: { flex: 1, marginLeft: 15 },
  dosageText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  noteText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  logAction: { padding: 5 },

  // Refill
  refillAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
    marginBottom: 5,
  },
  refillAlertText: { flex: 1, marginLeft: 10, color: '#9a3412', fontWeight: '700', fontSize: 13 },

  deleteBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40,
    padding: 15
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', marginLeft: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 25, 
    paddingBottom: 40 
  },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#e2e8f0', alignSelf: 'center', borderRadius: 10, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalSub: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  pickerWrapper: { backgroundColor: '#f8fafc', borderRadius: 15, marginBottom: 15, overflow: 'hidden' },
  modalInput: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 15, 
    padding: 15, 
    height: 80, 
    textAlignVertical: 'top', 
    color: '#1e293b' 
  },
  modalButtons: { flexDirection: 'row', marginTop: 25 },
  btnCancel: { flex: 1, padding: 16, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: '700' },
  btnSubmit: { flex: 2, backgroundColor: '#16a34a', padding: 16, borderRadius: 15, alignItems: 'center' },
  btnSubmitText: { color: '#fff', fontWeight: '800' },
});