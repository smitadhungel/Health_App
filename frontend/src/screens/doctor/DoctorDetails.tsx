// src/screens/doctor/DoctorDetails.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { doctorsAPI } from '../../services/api';

const SPECIALIZATIONS = [
  { label: 'Cardiology', value: 'CARDIOLOGY' },
  { label: 'Dermatology', value: 'DERMATOLOGY' },
  { label: 'Neurology', value: 'NEUROLOGY' },
  { label: 'Pediatrics', value: 'PEDIATRICS' },
  { label: 'Orthopedics', value: 'ORTHOPEDICS' },
  { label: 'Psychiatry', value: 'PSYCHIATRY' },
  { label: 'General Medicine', value: 'GENERAL' },
  { label: 'ENT', value: 'ENT' },
  { label: 'Gynecology', value: 'GYNECOLOGY' },
  { label: 'Oncology', value: 'ONCOLOGY' },
  { label: 'Other', value: 'OTHER' },
];

export default function DoctorDetails({ navigation }: any) {
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validation
    if (!specialization) {
      Alert.alert('Error', 'Please select your specialization');
      return;
    }
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your license number');
      return;
    }
    if (!consultationFee.trim() || isNaN(Number(consultationFee)) || Number(consultationFee) <= 0) {
      Alert.alert('Error', 'Please enter a valid consultation fee');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        specialization,
        license_number: licenseNumber,
        qualification: qualification.trim() || undefined,
        experience_years: experienceYears ? parseInt(experienceYears) : 0,
        consultation_fee: parseFloat(consultationFee),
        clinic_address: clinicAddress.trim() || undefined,
        bio: bio.trim() || undefined,
      };
      await doctorsAPI.createProfile(profileData);
      Alert.alert('Success', 'Profile completed!', [
        { text: 'OK', onPress: () => navigation.replace('DoctorsDashboard') }
      ]);
    } catch (error: any) {
      console.error('Profile creation error:', error);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>We need a few more details to set up your account</Text>

        <View style={styles.form}>
          {/* Specialization Picker */}
          <Text style={styles.label}>Specialization <Text style={styles.required}>*</Text></Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={specialization}
              onValueChange={(itemValue) => setSpecialization(itemValue)}
              style={styles.picker}
              dropdownIconColor="#007AFF"
            >
              <Picker.Item label="-- Select Specialization --" value="" />
              {SPECIALIZATIONS.map((spec) => (
                <Picker.Item key={spec.value} label={spec.label} value={spec.value} />
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
            autoCapitalize="characters"
          />

          {/* Qualification */}
          <Text style={styles.label}>Qualification</Text>
          <TextInput
            style={styles.input}
            value={qualification}
            onChangeText={setQualification}
            placeholder="e.g., MD, MBBS"
          />

          {/* Years of Experience */}
          <Text style={styles.label}>Years of Experience</Text>
          <TextInput
            style={styles.input}
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="numeric"
            placeholder="e.g., 10"
          />

          {/* Consultation Fee */}
          <Text style={styles.label}>Consultation Fee (₹) <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={consultationFee}
            onChangeText={setConsultationFee}
            keyboardType="numeric"
            placeholder="e.g., 500"
          />

          {/* Clinic Address */}
          <Text style={styles.label}>Clinic Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={clinicAddress}
            onChangeText={setClinicAddress}
            multiline
            numberOfLines={3}
            placeholder="Full clinic address"
          />

          {/* Bio */}
          <Text style={styles.label}>Bio / Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder="Tell patients about yourself"
          />

          {/* Submit Button */}
          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save & Continue</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    marginTop: 15,
  },
  required: {
    color: 'red',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});