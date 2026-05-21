import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { appointmentsAPI, documentsAPI } from '../../services/api';
import { Appointment } from '../../services/types';

type RootStackParamList = {
  PatientDetails: { patientName: string };
};
type PatientDetailsRouteProp      = RouteProp<RootStackParamList, 'PatientDetails'>;
type PatientDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PatientDetails'>;

interface PatientInfo {
  name:  string;
  email: string;
  phone: string;
}

interface SharedDoc {
  id: number;
  title: string;
  category?: string;
  file_url?: string;
  uploaded_at?: string;
}

// ─── Info Row ──────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Icon name={icon} size={18} color="#16a34a" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export default function PatientDetails() {
  const navigation = useNavigation<PatientDetailsNavigationProp>();
  const route      = useRoute<PatientDetailsRouteProp>();
  const { patientName } = route.params;

  const [patient,      setPatient]      = useState<PatientInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents,    setDocuments]    = useState<SharedDoc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [expandedAppt, setExpandedAppt] = useState<number | null>(null);



  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [allAppointments, sharedDocsRaw] = await Promise.all([
        appointmentsAPI.getDoctorAppointments(),
        documentsAPI.getSharedWithDoctor().catch(() => []),
      ]);

      // filter appointments for this patient
      const patientAppts = allAppointments
        .filter((a) => a.patient_name === patientName)
        .sort(
          (a, b) =>
            new Date(b.appointment_date).getTime() -
            new Date(a.appointment_date).getTime()
        );

      if (patientAppts.length > 0) {
        const first = patientAppts[0] as any;
        setPatient({
          name:  patientName,
          email: first.patient_email ?? '',
          phone: first.patient_phone ?? '',
        });
      } else {
        setPatient(null);
      }

      setAppointments(patientAppts);

      // unwrap docs response shape
      const docsArray: SharedDoc[] = Array.isArray(sharedDocsRaw)
        ? sharedDocsRaw
        : sharedDocsRaw?.documents ?? sharedDocsRaw?.results ?? [];

      // filter docs that belong to this patient
      const patientDocs = docsArray.filter((d: any) => {
        const owner = d?.patient_name ?? d?.owner_name ?? d?.uploaded_by ?? '';
        return owner === patientName;
      });

      setDocuments(patientDocs);

    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        err?.message ??
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
      }
    >
      {/* ── Avatar Banner ── */}
      <View style={styles.banner}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <Text style={styles.bannerName}>{patientName}</Text>
        <Text style={styles.bannerSub}>Patient Profile</Text>
      </View>

      {/* ── Personal Information ── */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Icon name="person-circle-outline" size={20} color="#16a34a" />
          <Text style={styles.cardTitle}>Personal Information</Text>
        </View>

        <InfoRow icon="person-outline" label="Full Name" value={patient.name}  />
        <InfoRow icon="mail-outline"   label="Email"     value={patient.email} />
        <InfoRow icon="call-outline"   label="Phone"     value={patient.phone} />

        {/* Quick action buttons */}
        <View style={styles.actionRow}>
          {patient.phone ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`tel:${patient.phone}`)}
            >
              <Icon name="call" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}
          {patient.email ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6366f1' }]}
              onPress={() => Linking.openURL(`mailto:${patient.email}`)}
            >
              <Icon name="mail" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Appointment History ── */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Icon name="calendar-outline" size={20} color="#16a34a" />
          <Text style={styles.cardTitle}>Appointment History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{appointments.length}</Text>
          </View>
        </View>

        {appointments.length === 0 ? (
          <Text style={styles.placeholder}>No appointments found.</Text>
        ) : (
          appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              expanded={expandedAppt === appt.id}
              onToggle={() =>
                setExpandedAppt(expandedAppt === appt.id ? null : appt.id)
              }
            />
          ))
        )}
      </View>

      {/* ── Shared Documents ── */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Icon name="document-text-outline" size={20} color="#16a34a" />
          <Text style={styles.cardTitle}>Shared Documents</Text>
          {documents.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{documents.length}</Text>
            </View>
          )}
        </View>

        {documents.length === 0 ? (
          <Text style={styles.placeholder}>No documents shared yet.</Text>
        ) : (
          documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Expandable Appointment Card ───────────────────────────────────────────
function AppointmentCard({
  appointment, expanded, onToggle,
}: {
  appointment: Appointment;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = appointment.status ?? '';

  const statusConfig: Record<string, { color: string; icon: string; bg: string }> = {
    completed: { color: '#16a34a', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
    cancelled: { color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline'     },
    confirmed: { color: '#2563eb', bg: '#eff6ff', icon: 'checkmark-done-outline'   },
    pending:   { color: '#f59e0b', bg: '#fffbeb', icon: 'hourglass-outline'        },
    no_show:   { color: '#9ca3af', bg: '#f3f4f6', icon: 'alert-circle-outline'     },
  };

  const cfg = statusConfig[status.toLowerCase()] ?? {
    color: '#6b7280', bg: '#f3f4f6', icon: 'ellipse-outline',
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.apptCard, { borderLeftColor: cfg.color }]}
      onPress={onToggle}
    >
      <View style={styles.apptTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.apptDate}>{formatDate(appointment.appointment_date)}</Text>
          <Text style={styles.apptTime}>
            {formatTime(appointment.appointment_time)}
            {appointment.duration_minutes ? `  ·  ${appointment.duration_minutes} min` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Icon name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{capitalize(status)}</Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16} color="#9ca3af" style={{ marginLeft: 6 }}
        />
      </View>

      {expanded && (
        <View style={styles.apptDetails}>
          {appointment.reason ? (
            <DetailRow icon="clipboard-outline"      label="Reason"       value={appointment.reason} />
          ) : null}
          {appointment.symptoms ? (
            <DetailRow icon="medkit-outline"         label="Symptoms"     value={appointment.symptoms} />
          ) : null}
          {(appointment as any).doctor_notes ? (
            <DetailRow icon="create-outline"         label="Doctor Notes" value={(appointment as any).doctor_notes} />
          ) : null}
          {(appointment as any).prescription ? (
            <DetailRow icon="document-text-outline"  label="Prescription" value={(appointment as any).prescription} />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={14} color="#16a34a" />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Document Row ───────────────────────────────────────────────────────────
function DocumentRow({ doc }: { doc: SharedDoc }) {
  const categoryIcons: Record<string, string> = {
    LAB:          'flask-outline',
    XRAY:         'scan-outline',
    SCAN:         'scan-outline',
    REPORT:       'document-text-outline',
    PRESCRIPTION: 'medical-outline',
  };
  const icon = categoryIcons[doc.category?.toUpperCase() ?? ''] ?? 'document-outline';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.docRow}
      onPress={() => doc.file_url && Linking.openURL(doc.file_url)}
    >
      <View style={styles.docIconBox}>
        <Icon name={icon} size={20} color="#16a34a" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
        {doc.category   ? <Text style={styles.docCategory}>{doc.category}</Text>           : null}
        {doc.uploaded_at ? <Text style={styles.docDate}>{formatDate(doc.uploaded_at)}</Text> : null}
      </View>
      {doc.file_url ? <Icon name="open-outline" size={18} color="#16a34a" /> : null}
    </TouchableOpacity>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  } catch { return timeStr; }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ─── styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f0fdf4', flexGrow: 1 },

  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f0fdf4', padding: 24, gap: 12,
  },
  loadingText: { marginTop: 10, fontSize: 14, color: '#6b7280' },
  errorText:   { fontSize: 14, color: '#b91c1c', textAlign: 'center', lineHeight: 20 },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, gap: 6, marginTop: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  banner:       { alignItems: 'center', marginBottom: 20, paddingTop: 10 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#16a34a',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 4,
  },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  bannerName: { fontSize: 22, fontWeight: '800', color: '#14532d' },
  bannerSub:  { fontSize: 13, color: '#6b7280', marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  cardTitleRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardTitle:      { fontSize: 16, fontWeight: '700', color: '#14532d', flex: 1 },
  countBadge:     { backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },

  infoRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel:  { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  infoValue:  { fontSize: 14, color: '#1e293b', fontWeight: '500', marginTop: 1 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a',
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10,
    flex: 1, justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  apptCard:   { borderLeftWidth: 3, borderRadius: 10, backgroundColor: '#fafafa', padding: 12, marginBottom: 10 },
  apptTop:    { flexDirection: 'row', alignItems: 'center' },
  apptDate:   { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  apptTime:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  apptDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  detailRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  detailLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { fontSize: 13, color: '#374151', marginTop: 1 },

  docRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  docIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  docTitle:   { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  docCategory:{ fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 1 },
  docDate:    { fontSize: 11, color: '#9ca3af', marginTop: 1 },

  placeholder: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
});