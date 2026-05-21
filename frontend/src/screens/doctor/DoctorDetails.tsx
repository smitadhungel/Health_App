import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { DoctorStackParamList } from '../../navigation/types';
import {
  Camera, FileText, CheckCircle, ChevronRight,
  Award, DollarSign,
} from 'lucide-react-native';

type DoctorDetailsNavigationProp = NativeStackNavigationProp<DoctorStackParamList>;

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

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <Text style={styles.label}>
    {text} {required && <Text style={{ color: '#ef4444' }}>*</Text>}
  </Text>
);

export default function DoctorDetails() {
  // ── hooks must always be at the top, in the same order ──
  const navigation = useNavigation<DoctorDetailsNavigationProp>();

  const [specialization,  setSpecialization]  = useState('');
  const [licenseNumber,   setLicenseNumber]   = useState('');
  const [qualification,   setQualification]   = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [clinicAddress,   setClinicAddress]   = useState('');
  const [bio,             setBio]             = useState('');
  const [loading,         setLoading]         = useState(false);
  const [profilePhoto,    setProfilePhoto]    = useState<any>(null);
  const [licensePhoto,    setLicensePhoto]    = useState<any>(null);

  const pickImage = (type: 'profile' | 'license') => {
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
    if (!specialization) {
      Alert.alert('Incomplete', 'Please select a medical specialization.');
      return;
    }
    if (!licenseNumber.trim()) {
      Alert.alert('Incomplete', 'Please enter your license number.');
      return;
    }
    if (!consultationFee.trim()) {
      Alert.alert('Incomplete', 'Please enter your consultation fee.');
      return;
    }

    setLoading(true);
    try {
      // Backend expects multipart/form-data because it handles photo uploads
      const formData = new FormData();
      formData.append('specialization',   specialization);
      formData.append('license_number',   licenseNumber.trim());
      formData.append('qualification',    qualification.trim());
      formData.append('experience_years', experienceYears ? String(parseInt(experienceYears, 10)) : '0');
      formData.append('consultation_fee', String(parseFloat(consultationFee)));
      formData.append('clinic_address',   clinicAddress.trim());
      formData.append('bio',              bio.trim());
      formData.append('is_active',        'true');

      if (profilePhoto) {
        formData.append('profile_photo', {
          uri:  profilePhoto.uri,
          type: profilePhoto.type  || 'image/jpeg',
          name: profilePhoto.fileName || 'profile.jpg',
        } as any);
      }

      if (licensePhoto) {
        formData.append('license_photo', {
          uri:  licensePhoto.uri,
          type: licensePhoto.type  || 'image/jpeg',
          name: licensePhoto.fileName || 'license.jpg',
        } as any);
      }

      console.log('Creating doctor profile...');
      const response = await api.post('/doctors/profile/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Profile created:', response.data);

      Alert.alert(
        'Profile Created!',
        'Your professional profile has been set up successfully.',
        [{ text: 'Continue', onPress: () => navigation.replace('DoctorsDashboard') }]
      );
    } catch (error: any) {
      console.error('Profile creation error:', error);
      console.error('Response data:', JSON.stringify(error?.response?.data, null, 2));

      let message = 'Failed to create profile. Please try again.';
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          message = data;
        } else if (data.detail) {
          message = data.detail;
        } else {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const fieldError = data[firstKey];
            message = `${firstKey}: ${Array.isArray(fieldError) ? fieldError[0] : fieldError}`;
          }
        }
      }
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Professional Onboarding</Text>
          <Text style={styles.subtitle}>Step 2 of 2: Verify Credentials</Text>
        </View>

        {/* Identity & Verification */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Identity & Verification</Text>
          <View style={styles.photoContainerRow}>

            {/* Profile photo */}
            <TouchableOpacity
              style={styles.circlePhoto}
              onPress={() => pickImage('profile')}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto.uri }} style={styles.fullPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={24} color="#16a34a" />
                  <Text style={styles.photoSmallText}>Profile</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* License photo */}
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
              {licensePhoto && (
                <View style={styles.badge}>
                  <CheckCircle size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* Professional Background */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Professional Background</Text>

          {/* Specialization */}
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
                {SPECIALIZATIONS.map((s) => (
                  <Picker.Item key={s.value} label={s.label} value={s.value} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Qualification */}
          <Label text="Qualification" />
          <TextInput
            style={styles.input}
            value={qualification}
            onChangeText={setQualification}
            placeholder="e.g. MBBS, MD"
            placeholderTextColor="#9ca3af"
          />

          {/* License + Experience row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Label text="License ID" required />
              <TextInput
                style={styles.input}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="MED-1234"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="Exp. (Years)" />
              <TextInput
                style={styles.input}
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="numeric"
                placeholder="e.g. 8"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Consultation Fee */}
          <Label text="Consultation Fee" required />
          <View style={styles.inputWrapper}>
            <DollarSign size={18} color="#16a34a" style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              value={consultationFee}
              onChangeText={setConsultationFee}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Clinic Address */}
          <Label text="Clinic Address" />
          <TextInput
            style={styles.input}
            value={clinicAddress}
            onChangeText={setClinicAddress}
            placeholder="e.g. 123 Medical St, City"
            placeholderTextColor="#9ca3af"
          />

          {/* Bio */}
          <Label text="Professional Bio" />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Briefly describe your expertise and approach to patient care..."
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
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

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  scroll:       { padding: 20, paddingTop: 40 },
  header:       { marginBottom: 25 },
  title:        { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle:     { fontSize: 14, color: '#64748b', fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 20, elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10,
  },
  sectionHeader: {
    fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 15,
    borderLeftWidth: 4, borderLeftColor: '#16a34a', paddingLeft: 10,
  },
  photoContainerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  circlePhoto: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#f1f5f9',
    borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  licenseRect: {
    flex: 1, height: 90, marginLeft: 20, borderRadius: 15,
    backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  fullPhoto:        { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center' },
  photoSmallText:   { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '600' },
  activeBorder:     { borderColor: '#16a34a', borderStyle: 'solid' },
  badge: {
    position: 'absolute', top: 5, right: 5,
    backgroundColor: '#16a34a', borderRadius: 10,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 15 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 12, fontSize: 15, color: '#1e293b',
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
  },
  inputIcon:     { marginLeft: 12 },
  inputWithIcon: { flex: 1, padding: 12, fontSize: 15, color: '#1e293b' },
  pickerFix:     { flex: 1, height: 50, justifyContent: 'center' },
  picker:        { width: '100%' },
  textArea:      { minHeight: 100, paddingTop: 12 },
  row:           { flexDirection: 'row', justifyContent: 'space-between' },
  rowAlignCenter:{ flexDirection: 'row', alignItems: 'center' },
  submitButton: {
    backgroundColor: '#16a34a', padding: 18, borderRadius: 15,
    alignItems: 'center', marginTop: 10, marginBottom: 40,
  },
  disabledButton: { backgroundColor: '#94a3b8' },
  submitText:     { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
});