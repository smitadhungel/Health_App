import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { doctorsAPI } from '../../services/api';
import { Camera, FileText, CheckCircle } from 'lucide-react-native';

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
  const [specialization,   setSpecialization]   = useState('');
  const [licenseNumber,    setLicenseNumber]    = useState('');
  const [qualification,    setQualification]    = useState('');
  const [experienceYears,  setExperienceYears]  = useState('');
  const [consultationFee,  setConsultationFee]  = useState('');
  const [clinicAddress,    setClinicAddress]    = useState('');
  const [bio,              setBio]              = useState('');
  const [loading,          setLoading]          = useState(false);

  // Photos
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
    if (!specialization) {
      Alert.alert('Error', 'Please select your specialization'); return;
    }
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your license number'); return;
    }
    if (!consultationFee.trim() || isNaN(Number(consultationFee)) || Number(consultationFee) <= 0) {
      Alert.alert('Error', 'Please enter a valid consultation fee'); return;
    }

    setLoading(true);
    try {
      // Build FormData to support file uploads
      const formData = new FormData();
      formData.append('specialization',   specialization);
      formData.append('license_number',   licenseNumber);
      formData.append('qualification',    qualification.trim());
      formData.append('experience_years', experienceYears ? String(parseInt(experienceYears)) : '0');
      formData.append('consultation_fee', String(parseFloat(consultationFee)));
      formData.append('clinic_address',   clinicAddress.trim());
      formData.append('bio',              bio.trim());

      if (profilePhoto) {
        formData.append('profile_photo', {
          uri:  profilePhoto.uri,
          type: profilePhoto.type || 'image/jpeg',
          name: profilePhoto.fileName || 'profile.jpg',
        } as any);
      }

      if (licensePhoto) {
        formData.append('license_photo', {
          uri:  licensePhoto.uri,
          type: licensePhoto.type || 'image/jpeg',
          name: licensePhoto.fileName || 'license.jpg',
        } as any);
      }

      await doctorsAPI.createProfileFormData(formData);

      Alert.alert(
        'Profile Submitted! 🎉',
        'Your application is under admin review. You will be notified when approved.',
        [{ text: 'OK', onPress: () => navigation.replace('DoctorsDashboard') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || error.response?.data?.message || 'Failed to save profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Fill in your professional details to get started</Text>

        {/* ── Profile Photo ── */}
        <Text style={styles.sectionLabel}>Profile Photo</Text>
        <TouchableOpacity style={styles.photoBox} onPress={() => pickImage('profile')}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto.uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={32} color="#16a34a" />
              <Text style={styles.photoHint}>Tap to upload your photo</Text>
            </View>
          )}
          {profilePhoto && (
            <View style={styles.photoCheckBadge}>
              <CheckCircle size={20} color="#16a34a" />
            </View>
          )}
        </TouchableOpacity>

        {/* ── License Photo ── */}
        <Text style={styles.sectionLabel}>License Photo <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity
          style={[styles.photoBox, styles.licenseBox, licensePhoto && styles.licenseBoxDone]}
          onPress={() => pickImage('license')}
        >
          {licensePhoto ? (
            <>
              <Image source={{ uri: licensePhoto.uri }} style={styles.licensePreview} />
              <View style={styles.photoCheckBadge}>
                <CheckCircle size={20} color="#16a34a" />
              </View>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <FileText size={32} color="#0f4c81" />
              <Text style={[styles.photoHint, { color: '#0f4c81' }]}>
                Tap to upload license / certificate
              </Text>
              <Text style={styles.photoFormats}>JPG, PNG accepted</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          {/* Specialization */}
          <Text style={styles.label}>Specialization <Text style={styles.required}>*</Text></Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={specialization}
              onValueChange={setSpecialization}
              style={styles.picker}
              dropdownIconColor="#16a34a"
            >
              <Picker.Item label="-- Select Specialization --" value="" />
              {SPECIALIZATIONS.map(s => (
                <Picker.Item key={s.value} label={s.label} value={s.value} />
              ))}
            </Picker>
          </View>

          {/* License Number */}
          <Text style={styles.label}>License Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="e.g., MED-12345"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
          />

          {/* Qualification */}
          <Text style={styles.label}>Qualification</Text>
          <TextInput
            style={styles.input}
            value={qualification}
            onChangeText={setQualification}
            placeholder="e.g., MBBS, MD"
            placeholderTextColor="#9ca3af"
          />

          {/* Experience */}
          <Text style={styles.label}>Years of Experience</Text>
          <TextInput
            style={styles.input}
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="numeric"
            placeholder="e.g., 10"
            placeholderTextColor="#9ca3af"
          />

          {/* Consultation Fee */}
          <Text style={styles.label}>Consultation Fee (₹) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={consultationFee}
            onChangeText={setConsultationFee}
            keyboardType="numeric"
            placeholder="e.g., 500"
            placeholderTextColor="#9ca3af"
          />

          {/* Clinic Address */}
          <Text style={styles.label}>Clinic Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={clinicAddress}
            onChangeText={setClinicAddress}
            multiline numberOfLines={3}
            placeholder="Full clinic address"
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />

          {/* Bio */}
          <Text style={styles.label}>Bio / About You</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline numberOfLines={4}
            placeholder="Tell patients about yourself..."
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Submit for Approval</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f0fdf4' },
  scroll:       { padding: 20, paddingTop: 40, paddingBottom: 50 },
  title:        { fontSize: 26, fontWeight: 'bold', color: '#14532d', marginBottom: 6 },
  subtitle:     { fontSize: 14, color: '#4b5563', marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#064e3b', marginBottom: 8 },

  // Photo boxes
  photoBox: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 2,
    borderColor: '#bbf7d0', borderStyle: 'dashed',
    marginBottom: 20, overflow: 'hidden', position: 'relative',
    minHeight: 120, justifyContent: 'center', alignItems: 'center',
  },
  licenseBox:     { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  licenseBoxDone: { borderColor: '#bbf7d0', borderStyle: 'solid' },
  photoPlaceholder: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  photoHint:    { fontSize: 14, color: '#16a34a', marginTop: 8, fontWeight: '500' },
  photoFormats: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  photoPreview: { width: '100%', height: 160, resizeMode: 'cover' },
  licensePreview: { width: '100%', height: 180, resizeMode: 'contain' },
  photoCheckBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 2,
  },

  // Form
  form:     { width: '100%' },
  label:    { fontSize: 14, fontWeight: '600', color: '#064e3b', marginBottom: 6, marginTop: 16 },
  required: { color: '#ef4444' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#14532d',
  },
  textArea:    { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  pickerContainer: {
    backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#bbf7d0', borderRadius: 12, overflow: 'hidden',
  },
  picker:      { height: 50, color: '#14532d' },
  submitButton: {
    backgroundColor: '#16a34a', padding: 16,
    borderRadius: 30, alignItems: 'center', marginTop: 28,
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  disabledButton: { backgroundColor: '#bbf7d0' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});