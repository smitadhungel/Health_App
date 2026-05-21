import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Stethoscope,
  FileText,
  IndianRupee,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react-native';
import { appointmentsAPI } from '../../services/api';
import { Appointment } from '../../services/types';

type RouteParamsList = {
  PatientAppointmentDetails: { appointmentId: number };
};

export default function PatientAppointmentDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParamsList, 'PatientAppointmentDetails'>>();
  const appointmentId = route.params?.appointmentId;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (appointmentId) fetchAppointmentDetails();
    else setLoading(false);
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getDetails(appointmentId!);
      setAppointment(response);
    } catch (error) {
      Alert.alert('Error', 'Failed to load details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { color: string; icon: any }> = {
      PENDING: { color: '#F59E0B', icon: AlertCircle },
      CONFIRMED: { color: '#10B981', icon: CheckCircle },
      COMPLETED: { color: '#6B7280', icon: CheckCircle },
      CANCELLED: { color: '#EF4444', icon: XCircle },
    };
    return map[status] || { color: '#6B7280', icon: AlertCircle };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!appointment) return null;

  const statusInfo = getStatusInfo(appointment.status);
  const appointmentDateTime = parseISO(`${appointment.appointment_date}T${appointment.appointment_time}`);
  const canCancel = ['PENDING', 'CONFIRMED'].includes(appointment.status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Custom App Bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Appointment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Modern Status Badge */}
        <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
          <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.color + '15' }]}>
            <statusInfo.icon size={20} color={statusInfo.color} />
          </View>
          <View>
            <Text style={styles.statusLabel}>Booking Status</Text>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{appointment.status_display}</Text>
          </View>
        </View>

        {/* Doctor Identity Section */}
        <View style={styles.mainCard}>
          <View style={styles.doctorHeader}>
            {appointment.doctor_profile_photo ? (
              <Image source={{ uri: appointment.doctor_profile_photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <User size={30} color="#fff" />
              </View>
            )}
            <View style={styles.doctorMeta}>
              <Text style={styles.doctorName}>Dr. {appointment.doctor_name}</Text>
              <Text style={styles.specialty}>{appointment.doctor_specialization}</Text>
              <View style={styles.tagRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{appointment.doctor_qualification}</Text></View>
                {appointment.doctor_experience_years && (
                   <View style={styles.tag}><Text style={styles.tagText}>{appointment.doctor_experience_years} yrs exp</Text></View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Contact Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`tel:${appointment.doctor_phone}`)}>
              <Phone size={18} color="#16a34a" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL(`mailto:${appointment.doctor_email}`)}>
              <Mail size={18} color="#16a34a" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule & Details Info */}
        <View style={styles.detailsCard}>
           <Text style={styles.sectionTitle}>Visit Information</Text>
           
           <View style={styles.infoRow}>
              <View style={styles.infoIconBox}><Calendar size={18} color="#6b7280" /></View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoValue}>{format(appointmentDateTime, 'EEE, MMM dd • h:mm a')}</Text>
              </View>
           </View>

           <View style={styles.infoRow}>
              <View style={styles.infoIconBox}><IndianRupee size={18} color="#6b7280" /></View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Consultation Fee</Text>
                <Text style={styles.infoValue}>₹{appointment.consultation_fee || '0'}</Text>
              </View>
           </View>

           <View style={styles.infoRow}>
              <View style={styles.infoIconBox}><FileText size={18} color="#6b7280" /></View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Reason</Text>
                <Text style={styles.infoValue}>{appointment.reason}</Text>
              </View>
           </View>
        </View>

        {/* Location Section */}
        {appointment.clinic_address && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Clinic Location</Text>
            <View style={styles.locationContainer}>
              <MapPin size={20} color="#16a34a" />
              <Text style={styles.addressText}>{appointment.clinic_address}</Text>
            </View>
            <TouchableOpacity 
              style={styles.directionsBtn}
              onPress={() => Linking.openURL(`http://maps.google.com/?q=${encodeURIComponent(appointment.clinic_address!)}`)}
            >
              <Navigation size={18} color="#fff" />
              <Text style={styles.directionsText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}

        {canCancel && (
          <TouchableOpacity 
            style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]} 
            disabled={cancelling}
            onPress={() => {
              Alert.alert("Cancel?", "Are you sure?", [
                { text: "No" },
                { text: "Yes", style: 'destructive', onPress: async () => {
                  setCancelling(true);
                  try {
                    await appointmentsAPI.cancel(appointmentId!);
                    navigation.goBack();
                  } catch (e) { Alert.alert("Error", "Could not cancel"); }
                  finally { setCancelling(false); }
                }}
              ])
            }}
          >
            {cancelling ? <ActivityIndicator color="#fff" /> : <Text style={styles.cancelBtnText}>Cancel Appointment</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  appBarTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 0},
  iconButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 12 },
  
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statusIconContainer: { padding: 10, borderRadius: 12, marginRight: 15 },
  statusLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  statusText: { fontSize: 16, fontWeight: '700' },

  mainCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16 },
  doctorHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  doctorMeta: { marginLeft: 16, flex: 1 },
  doctorName: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  specialty: { fontSize: 14, color: '#16a34a', fontWeight: '600', marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, color: '#4b5563', fontWeight: '600' },

  actionRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4', paddingVertical: 12, borderRadius: 14, gap: 8 },
  actionButtonText: { fontSize: 14, fontWeight: '700', color: '#16a34a' },

  detailsCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#374151' },

  locationContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addressText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 20 },
  directionsBtn: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 10 },
  directionsText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  cancelBtn: { marginHorizontal: 16, marginTop: 10, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#fee2e2' },
  cancelBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 }
});