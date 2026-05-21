import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { appointmentsAPI } from '../../services/api';

type RootStackParamList = {
  AppointmentDetails: { appointmentId: number };
};

type AppointmentDetailsRouteProp = RouteProp<RootStackParamList, 'AppointmentDetails'>;
type AppointmentDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AppointmentDetails'>;
type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

interface AppointmentDetail {
  id: number;
  patient_name: string;
  patient_email: string;
  patient_phone?: string;
  doctor_name: string;
  doctor_specialization: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  status_display: string;
  reason: string;
  symptoms?: string;
  doctor_notes?: string;
  prescription?: string;
  created_at: string;
  updated_at: string;
}

export default function AppointmentDetails() {
  const navigation = useNavigation<AppointmentDetailsNavigationProp>();
  const route = useRoute<AppointmentDetailsRouteProp>();
  const { appointmentId } = route.params;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>('PENDING');

  useEffect(() => {
    fetchAppointmentDetails();
  }, []);

  const fetchAppointmentDetails = async () => {
    setLoading(true);
    try {
      const data = await appointmentsAPI.getDetails(appointmentId) as any;
      const rawStatus = (data.status ?? '').toUpperCase();
      const mappedStatus: AppointmentStatus =
        ['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(rawStatus) ? rawStatus : 'PENDING';

      const mapped: AppointmentDetail = {
        id: data.id,
        patient_name: data.patient_name ?? 'Unknown Patient',
        patient_email: data.patient_email ?? '',
        patient_phone: data.patient_phone,
        doctor_name: data.doctor_name ?? '',
        doctor_specialization: data.doctor_specialization ?? '',
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        duration_minutes: data.duration_minutes,
        status: mappedStatus,
        status_display: data.status_display ?? mappedStatus,
        reason: data.reason ?? '',
        symptoms: data.symptoms,
        doctor_notes: data.doctor_notes,
        prescription: data.prescription,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setAppointment(mapped);
      setDoctorNotes(mapped.doctor_notes || '');
      setPrescription(mapped.prescription || '');
      setSelectedStatus(mapped.status);
    } catch (error) {
      Alert.alert('Error', 'Failed to load appointment details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!appointment) return;
    setUpdating(true);
    try {
      await appointmentsAPI.updateDoctorAppointment(appointmentId, {
        status: selectedStatus,
        doctor_notes: doctorNotes,
        prescription,
      } as any);
      Alert.alert('Success', 'Record updated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Update Failed', 'Could not save changes.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusStyle = (status: AppointmentStatus) => {
    const active = selectedStatus === status;
    switch (status) {
      case 'CONFIRMED': return { color: '#16a34a', bg: active ? '#16a34a' : '#f0fdf4' };
      case 'CANCELLED': return { color: '#ef4444', bg: active ? '#ef4444' : '#fef2f2' };
      case 'COMPLETED': return { color: '#6366f1', bg: active ? '#6366f1' : '#eef2ff' };
      default: return { color: '#f59e0b', bg: active ? '#f59e0b' : '#fffbeb' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Icon name="chevron-back" size={24} color="#14532d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Review</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="ellipsis-horizontal" size={24} color="#14532d" />
          </TouchableOpacity>
        </View>

        {/* Status Picker - More Visual */}
        <View style={styles.statusContainer}>
          {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((status) => {
            const stylesConfig = getStatusStyle(status);
            const isActive = selectedStatus === status;
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setSelectedStatus(status)}
                style={[
                  styles.statusChip,
                  { backgroundColor: stylesConfig.bg, borderColor: stylesConfig.color },
                  isActive && { elevation: 4, shadowOpacity: 0.2 }
                ]}
              >
                <Text style={[styles.statusText, { color: isActive ? '#fff' : stylesConfig.color }]}>
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Patient Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="person-circle" size={22} color="#16a34a" />
            <Text style={styles.cardTitle}>Patient Info</Text>
          </View>
          <View style={styles.divider} />
          <InfoItem icon="person-outline" label="Full Name" value={appointment?.patient_name} />
          <InfoItem icon="mail-outline" label="Email" value={appointment?.patient_email} />
          {appointment?.patient_phone && (
            <InfoItem icon="call-outline" label="Phone" value={appointment.patient_phone} />
          )}
        </View>

        {/* Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="calendar" size={22} color="#16a34a" />
            <Text style={styles.cardTitle}>Schedule & Reason</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.dateTimeRow}>
             <InfoItem icon="calendar-outline" label="Date" value={appointment?.appointment_date} halfWidth />
             <InfoItem icon="time-outline" label="Time" value={appointment?.appointment_time} halfWidth />
          </View>
          <InfoItem icon="document-text-outline" label="Reason" value={appointment?.reason} />
          {appointment?.symptoms && (
            <InfoItem icon="medkit-outline" label="Symptoms" value={appointment.symptoms} />
          )}
        </View>

        {/* Input Fields */}
        {/* <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Clinical Notes</Text>
          <TextInput
            style={styles.textArea}
            value={doctorNotes}
            onChangeText={setDoctorNotes}
            placeholder="Describe clinical findings..."
            multiline
            placeholderTextColor="#9ca3af"
          />
        </View> */}

        {/* <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Prescription / Advice</Text>
          <TextInput
            style={styles.textArea}
            value={prescription}
            onChangeText={setPrescription}
            placeholder="List medications or next steps..."
            multiline
            placeholderTextColor="#9ca3af"
          />
        </View> */}

        <TouchableOpacity
          style={[styles.updateButton, updating && styles.disabledButton]}
          onPress={handleUpdate}
          disabled={updating}
        >
          {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateButtonText}>Save & Finalize</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Sub-component for clean rows
const InfoItem = ({ icon, label, value, halfWidth }: any) => (
  <View style={[styles.infoRow, halfWidth && { flex: 1 }]}>
    <View style={styles.iconBg}>
      <Icon name={icon} size={16} color="#16a34a" />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 40 : 10,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  iconButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statusChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 12 },
  dateTimeRow: { flexDirection: 'row' },
  iconBg: {
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
  },
  infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 8, marginLeft: 4 },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlignVertical: 'top',
  },
  updateButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: { backgroundColor: '#94a3b8' },
  updateButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});