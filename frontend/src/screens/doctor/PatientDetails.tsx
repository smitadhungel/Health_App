import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';


import { patientsAPI, appointmentsAPI } from '../../services/api';
import { User, Appointment } from '../../services/types';


type RootStackParamList = {
  PatientDetails: { patientId: number };
};
type PatientDetailsRouteProp      = RouteProp<RootStackParamList, 'PatientDetails'>;
type PatientDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PatientDetails'>;

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function PatientDetails() {
  const navigation = useNavigation<PatientDetailsNavigationProp>();
  const route      = useRoute<PatientDetailsRouteProp>();
  const { patientId } = route.params;

  const [patient,      setPatient]      = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

 
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // 1️⃣  patientsAPI.getMyPatients()  →  find the patient by id
      // 2️⃣  appointmentsAPI.getDoctorAppointments()  →  filter by this patient
      const [patients, allAppointments] = await Promise.all([
        patientsAPI.getMyPatients(),
        appointmentsAPI.getDoctorAppointments(),
      ]);

      const found = patients.find((p) => p.id === patientId) ?? null;
      setPatient(found);

      // `appointment.patient` can be a number OR an object depending on your serializer
      const patientAppts = allAppointments
        .filter((a) => {
          const pid = typeof a.patient === 'object'
            ? (a.patient as any)?.id
            : a.patient;
          return pid === patientId;
        })
        .sort(
          (a, b) =>
            new Date(b.appointment_date).getTime() -
            new Date(a.appointment_date).getTime()
        );

      setAppointments(patientAppts);
    } catch (err: any) {
      // Axios error → use backend detail message if available
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ─── RENDER STATES ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading patient details…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="cloud-offline-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Icon name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="person-remove-outline" size={48} color="#9ca3af" />
        <Text style={styles.errorText}>Patient not found.</Text>
      </View>
    );
  }

  // ─── MAIN UI ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#16a34a"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Details</Text>
      </View>

      {/* ── Personal Information ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>

        <InfoRow icon="person-outline" label="Name">
          {patient.first_name} {patient.last_name}
        </InfoRow>
        <InfoRow icon="mail-outline" label="Email">
          {patient.email}
        </InfoRow>
        {patient.phone_number ? (
          <InfoRow icon="call-outline" label="Phone">
            {patient.phone_number}
          </InfoRow>
        ) : null}
        {(patient as any).last_appointment ? (
          <InfoRow icon="calendar-outline" label="Last Visit">
            {formatDate((patient as any).last_appointment)}
          </InfoRow>
        ) : null}
      </View>

      {/* ── Appointment History ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Appointment History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{appointments.length}</Text>
          </View>
        </View>

        {appointments.length === 0 ? (
          <Text style={styles.placeholder}>No appointments found for this patient.</Text>
        ) : (
          appointments.map((appt) => (
            <AppointmentRow key={appt.id} appointment={appt} />
          ))
        )}
      </View>

      {/* ── Shared Documents (placeholder) ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shared Documents</Text>
        <Text style={styles.placeholder}>No documents shared yet.</Text>
      </View>
    </ScrollView>
  );
}



function InfoRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color="#16a34a" />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{children}</Text>
    </View>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const status = appointment.status ?? '';

  const statusConfig: Record<string, { color: string; icon: string }> = {
    completed: { color: '#16a34a', icon: 'checkmark-circle-outline' },
    cancelled: { color: '#ef4444', icon: 'close-circle-outline'     },
    scheduled: { color: '#2563eb', icon: 'time-outline'             },
    pending:   { color: '#f59e0b', icon: 'hourglass-outline'        },
  };

  const cfg = statusConfig[status.toLowerCase()] ?? {
    color: '#6b7280',
    icon: 'ellipse-outline',
  };

  return (
    <View style={styles.appointmentRow}>
      <View style={styles.appointmentLeft}>
        <Icon name="calendar-outline" size={18} color="#16a34a" style={{ marginTop: 2 }} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.appointmentDate}>
            {formatDate(appointment.appointment_date)}
            {appointment.appointment_time
              ? `  ·  ${formatTime(appointment.appointment_time)}`
              : ''}
          </Text>
          {appointment.reason ? (
            <Text style={styles.appointmentSub}>{appointment.reason}</Text>
          ) : null}
          {appointment.symptoms ? (
            <Text style={styles.appointmentNotes}>
              Symptoms: {appointment.symptoms}
            </Text>
          ) : null}
        </View>
      </View>

      {status ? (
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
          <Icon name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>
            {capitalize(status)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}


function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  } catch {
    return timeStr;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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
    padding: 24,
    gap: 12,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14532d',
    marginTop: 10,
    marginBottom: 10,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
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
    width: 90,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#14532d',
    flex: 1,
  },
  placeholder: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0fdf4',
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14532d',
  },
  appointmentSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  appointmentNotes: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});