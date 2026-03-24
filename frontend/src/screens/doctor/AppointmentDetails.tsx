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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { appointmentsAPI } from '../../services/api';

// Define the root stack param list (should match your app's navigator)
type RootStackParamList = {
  AppointmentDetails: { appointmentId: number };
  // ... other screens as needed
};

type AppointmentDetailsRouteProp = RouteProp<RootStackParamList, 'AppointmentDetails'>;
type AppointmentDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AppointmentDetails'>;

// Match the imported Appointment type's status (based on error message)
type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface AppointmentDetail {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason: string;
  symptoms?: string;
  doctor_notes?: string;
  prescription?: string;
  created_at: string;
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
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>('pending');

  useEffect(() => {
    fetchAppointmentDetails();
  }, []);

  const fetchAppointmentDetails = async () => {
    setLoading(true);
    try {
      const response = await appointmentsAPI.getDetails(appointmentId);
      const data = response as any;
      
      // Map status to our limited union, default to 'pending' if unknown
      let mappedStatus: AppointmentStatus = 'pending';
      const rawStatus = data.status?.toLowerCase();
      if (rawStatus === 'confirmed') mappedStatus = 'confirmed';
      else if (rawStatus === 'completed') mappedStatus = 'completed';
      else if (rawStatus === 'cancelled') mappedStatus = 'cancelled';
      else mappedStatus = 'pending'; // includes 'no_show' or others

      const mapped: AppointmentDetail = {
        id: data.id,
        patient: data.patient,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        status: mappedStatus,
        reason: data.reason,
        symptoms: data.symptoms,
        doctor_notes: data.doctor_notes,
        prescription: data.prescription,
        created_at: data.created_at,
      };
      setAppointment(mapped);
      setDoctorNotes(mapped.doctor_notes || '');
      setPrescription(mapped.prescription || '');
      setSelectedStatus(mapped.status);
    } catch (error) {
      Alert.alert('Error', 'Failed to load appointment details.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!appointment) return;
    setUpdating(true);
    try {
      // Use 'as any' to bypass type check for now (API expects these fields)
      await appointmentsAPI.updateDoctorAppointment(appointmentId, {
        status: selectedStatus,
        doctor_notes: doctorNotes,
        prescription,
      } as any);
      Alert.alert('Success', 'Appointment updated.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update appointment.');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return '#16a34a';
      case 'cancelled': return '#ef4444';
      case 'completed': return '#6b7280';
      default: return '#f59e0b'; // pending
    }
  };

  const getStatusDisplay = (status: AppointmentStatus) => {
    return status.toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.centerContainer}>
        <Text>Appointment not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#16a34a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Patient Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Patient Information</Text>
        <View style={styles.infoRow}>
          <Icon name="person-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{appointment.patient.first_name} {appointment.patient.last_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="mail-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{appointment.patient.email}</Text>
        </View>
        {appointment.patient.phone_number && (
          <View style={styles.infoRow}>
            <Icon name="call-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{appointment.patient.phone_number}</Text>
          </View>
        )}
      </View>

      {/* Appointment Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appointment Details</Text>
        <View style={styles.infoRow}>
          <Icon name="calendar-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{appointment.appointment_date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="time-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Time:</Text>
          <Text style={styles.infoValue}>{appointment.appointment_time}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="chatbubble-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Reason:</Text>
          <Text style={styles.infoValue}>{appointment.reason}</Text>
        </View>
        {appointment.symptoms && (
          <View style={styles.infoRow}>
            <Icon name="medkit-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Symptoms:</Text>
            <Text style={styles.infoValue}>{appointment.symptoms}</Text>
          </View>
        )}
      </View>

      {/* Status Update */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Update Status</Text>
        <View style={styles.statusButtons}>
          {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusButton,
                selectedStatus === status && { backgroundColor: getStatusColor(status) },
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[
                styles.statusButtonText,
                selectedStatus === status && styles.statusButtonTextSelected,
              ]}>
                {getStatusDisplay(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Doctor Notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Doctor's Notes</Text>
        <TextInput
          style={styles.textArea}
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          placeholder="Add notes about the appointment..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Prescription */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prescription</Text>
        <TextInput
          style={styles.textArea}
          value={prescription}
          onChangeText={setPrescription}
          placeholder="Write prescription here..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Update Button */}
      <TouchableOpacity
        style={[styles.updateButton, updating && styles.disabledButton]}
        onPress={handleUpdate}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.updateButtonText}>Update Appointment</Text>
        )}
      </TouchableOpacity>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14532d',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    width: 70,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#14532d',
    flex: 1,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
    marginRight: 8,
    marginBottom: 8,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  statusButtonTextSelected: {
    color: '#ffffff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f0fdf4',
    color: '#14532d',
    minHeight: 100,
  },
  updateButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#86efac',
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});