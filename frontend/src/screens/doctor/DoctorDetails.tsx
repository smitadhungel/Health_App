import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { doctorsAPI } from '../../services/api';
import { Camera, FileText, CheckCircle, ChevronRight, User, Award, Briefcase, DollarSign } from 'lucide-react-native';

const SPECIALIZATIONS = [
  { label: 'Cardiology',       value: 'CARDIOLOGY' },
  { label: 'Dermatology',      value: 'DERMATOLOGY' },
  { label: 'Neurology',        value: 'NEUROLOGY' },
  { label: 'Pediatrics',       value: 'PEDIATRICS' },
  { label: 'Orthopedics',      value: 'ORTHOPEDICS' },
  { label: 'Psychiatry',       value: 'PSYCHIATRY' },
  { label: 'General Medicine', value: 'GENERAL' },
  { label: 'ENT',              value: 'ENT' },
  { label: 'Gynecology',       value: 'GYNECOLOGY' },
  { label: 'Oncology',         value: 'ONCOLOGY' },
  { label: 'Other',            value: 'OTHER' },
];

export default function DoctorDetails({ navigation }: any) {
  // ... state logic remains the same ...
  const [specialization,   setSpecialization]   = useState('');
  const [licenseNumber,    setLicenseNumber]    = useState('');
  const [qualification,    setQualification]    = useState('');
  const [experienceYears,  setExperienceYears]  = useState('');
  const [consultationFee,  setConsultationFee]  = useState('');
  const [clinicAddress,    setClinicAddress]    = useState('');
  const [bio,              setBio]              = useState('');
  const [loading,          setLoading]          = useState(false);
  const [profilePhoto,  setProfilePhoto]  = useState<any>(null);
  const [licensePhoto,  setLicensePhoto]  = useState<any>(null);

  const pickImage = async (type: 'profile' | 'license') => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, includeBase64: false },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset) return;
        if (type === 'profile') setProfilePhoto(asset);
        else setLicensePhoto(asset);
      }
    );
  };

  const handleSubmit = async () => {
      // Logic same as original...
      if (!specialization || !licenseNumber.trim() || !consultationFee.trim()) {
          Alert.alert('Incomplete', 'Please fill all required fields marked with *');
          return;
      }
      setLoading(true);
      try {
          // ... API call logic ...
          navigation.replace('DoctorsDashboard');
      } catch (err) { /* handle */ } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
            <Text style={styles.title}>Professional Onboarding</Text>
            <Text style={styles.subtitle}>Step 2 of 2: Verify Credentials</Text>
        </View>

        {/* ── Document Upload Section ── */}
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Identity & Verification</Text>
            
            <View style={styles.photoContainerRow}>
                <TouchableOpacity style={styles.circlePhoto} onPress={() => pickImage('profile')}>
                    {profilePhoto ? (
                        <Image source={{ uri: profilePhoto.uri }} style={styles.fullPhoto} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Camera size={24} color="#16a34a" />
                            <Text style={styles.photoSmallText}>Profile</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.licenseRect, licensePhoto && styles.activeBorder]} 
                    onPress={() => pickImage('license')}
                >
                    {licensePhoto ? (
                        <Image source={{ uri: licensePhoto.uri }} style={styles.fullPhoto} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <FileText size={24} color="#0f4c81" />
                            <Text style={styles.photoSmallText}>Medical License</Text>
                        </View>
                    )}
                    {licensePhoto && <View style={styles.badge}><CheckCircle size={16} color="#fff" /></View>}
                </TouchableOpacity>
            </View>
        </View>

        {/* ── Professional Form ── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Professional Background</Text>

          {/* Specialization Picker */}
          <Label text="Medical Specialization" required />
          <View style={styles.inputWrapper}>
            <Award size={18} color="#16a34a" style={styles.inputIcon} />
            <View style={styles.pickerFix}>
                <Picker
                selectedValue={specialization}
                onValueChange={setSpecialization}
                style={styles.picker}
                >
                <Picker.Item label="Select Field..." value="" color="#9ca3af" />
                {SPECIALIZATIONS.map(s => <Picker.Item key={s.value} label={s.label} value={s.value} />)}
                </Picker>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <Label text="License ID" required />
                <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="MED-1234" />
            </View>
            <View style={{ flex: 1 }}>
                <Label text="Exp. (Years)" />
                <TextInput style={styles.input} value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" placeholder="e.g. 8" />
            </View>
          </View>

          <Label text="Consultation Fee (₹)" required />
          <View style={styles.inputWrapper}>
            <DollarSign size={18} color="#16a34a" style={styles.inputIcon} />
            <TextInput style={styles.inputWithIcon} value={consultationFee} onChangeText={setConsultationFee} keyboardType="numeric" placeholder="500" />
          </View>

          <Label text="Professional Bio" />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio} onChangeText={setBio}
            multiline placeholder="Briefly describe your expertise and approach to patient care..."
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.rowAlignCenter}>
                <Text style={styles.submitText}>Complete Registration</Text>
                <ChevronRight size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Sub-component for labels
const Label = ({ text, required }: any) => (
    <Text style={styles.label}>{text} {required && <Text style={{ color: '#ef4444' }}>*</Text>}</Text>
);

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  scroll:       { padding: 20, paddingTop: 20 },
  header:       { marginBottom: 25 },
  title:        { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle:     { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 20, elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10,
  },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#16a34a', paddingLeft: 10 },

  // Photos
  photoContainerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circlePhoto: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#f1f5f9',
    borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  licenseRect: {
    flex: 1, height: 90, marginLeft: 20, borderRadius: 15,
    backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  fullPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center' },
  photoSmallText: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600' },
  activeBorder: { borderColor: '#16a34a', borderStyle: 'solid' },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#16a34a', borderRadius: 10 },

  // Inputs
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 15 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b'
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
  },
  inputIcon: { marginLeft: 12 },
  inputWithIcon: { flex: 1, padding: 12, fontSize: 15, color: '#1e293b' },
  pickerFix: { flex: 1, height: 50, justifyContent: 'center' },
  picker: { width: '100%' },
  textArea: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowAlignCenter: { flexDirection: 'row', alignItems: 'center' },

  submitButton: {
    backgroundColor: '#16a34a', padding: 18, borderRadius: 15,
    alignItems: 'center', marginTop: 10, marginBottom: 40,
  },
  disabledButton: { backgroundColor: '#94a3b8' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
});