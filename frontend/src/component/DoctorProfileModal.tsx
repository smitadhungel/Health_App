import React from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Image,
} from 'react-native';
import {
  X, Star, Clock, MapPin, Award, DollarSign,
  CheckCircle, Stethoscope,
} from 'lucide-react-native';

interface DoctorProfileModalProps {
  visible: boolean;
  doctor: any;
  onClose: () => void;
  onSelect: (doctor: any) => void;
}

export default function DoctorProfileModal({
  visible, doctor, onClose, onSelect,
}: DoctorProfileModalProps) {
  if (!doctor) return null;

  const name = doctor.full_name
    || (doctor.user ? `${doctor.user.first_name} ${doctor.user.last_name}` : null)
    || doctor.first_name
    || `Doctor #${doctor.id}`;

  const specialization = doctor.specialization_display || doctor.specialization || 'General';
  const rating         = parseFloat(doctor.rating || doctor.average_rating || '0');
  const fee            = doctor.consultation_fee;
  const experience     = doctor.experience_years;
  const qualification  = doctor.qualification;
  const bio            = doctor.bio;
  const clinicAddress  = doctor.clinic_address;
  const profilePhoto   = doctor.profile_photo;
  const licensePhoto   = doctor.license_photo;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.avatarWrapper}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Stethoscope size={36} color="#fff" />
                  </View>
                )}
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={16} color="#fff" fill="#16a34a" />
                </View>
              </View>

              <Text style={styles.doctorName}>Dr. {name}</Text>
              <Text style={styles.specialization}>{specialization}</Text>

              {/* Rating row */}
              <View style={styles.ratingRow}>
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i} size={16}
                    color={i <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
                    fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
                  />
                ))}
                <Text style={styles.ratingText}>
                  {rating > 0 ? rating.toFixed(1) : 'New'} · Verified Doctor
                </Text>
              </View>
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{experience || 0}+</Text>
                <Text style={styles.statLabel}>Years Exp.</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxMid]}>
                <Text style={styles.statValue}>₹{fee || '—'}</Text>
                <Text style={styles.statLabel}>Consult Fee</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{doctor.total_patients || 0}+</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
            </View>

            {/* ── Qualification ── */}
            {qualification ? (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Award size={17} color="#0f4c81" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.infoLabel}>Qualification</Text>
                    <Text style={styles.infoValue}>{qualification}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── Clinic Address ── */}
            {clinicAddress ? (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MapPin size={17} color="#0f4c81" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.infoLabel}>Clinic Address</Text>
                    <Text style={styles.infoValue}>{clinicAddress}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── Bio ── */}
            {bio ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>About</Text>
                <Text style={[styles.infoValue, { marginTop: 4, lineHeight: 20 }]}>{bio}</Text>
              </View>
            ) : null}

            {/* ── License photo ── */}
            {licensePhoto ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>License / Certificate</Text>
                <Image
                  source={{ uri: licensePhoto }}
                  style={styles.licenseImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            {/* ── Select Button ── */}
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => { onSelect(doctor); onClose(); }}
            >
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.selectText}>Select This Doctor</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, paddingTop: 12,
    paddingHorizontal: 20, paddingBottom: 36,
    maxHeight: '92%',
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: '#f3f4f6', borderRadius: 20, padding: 6, zIndex: 10,
  },

  // Header
  header:      { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: '#bbf7d0',
  },
  avatarFallback: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#0f4c81',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#bbf7d0',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: '#fff', borderRadius: 10, padding: 1,
  },
  doctorName:    { fontSize: 22, fontWeight: '800', color: '#1f2937', textAlign: 'center' },
  specialization:{ fontSize: 14, color: '#0f4c81', fontWeight: '600', marginTop: 4 },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  ratingText:    { fontSize: 13, color: '#6b7280', marginLeft: 4 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#f0f4ff',
    borderRadius: 16, marginBottom: 16, overflow: 'hidden',
  },
  statBox:     { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMid:  { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#dbeafe' },
  statValue:   { fontSize: 18, fontWeight: '800', color: '#0f4c81' },
  statLabel:   { fontSize: 11, color: '#6b7280', marginTop: 3 },

  // Info cards
  infoCard: {
    backgroundColor: '#f8fafc', borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: '#1f2937' },

  licenseImage: {
    width: '100%', height: 180,
    borderRadius: 10, marginTop: 10,
    backgroundColor: '#f1f5f9',
  },

  // Select button
  selectButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#16a34a',
    borderRadius: 16, paddingVertical: 16, marginTop: 10,
    gap: 8,
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  selectText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});