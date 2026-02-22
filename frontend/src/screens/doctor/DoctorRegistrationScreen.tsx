// screens/doctor/DoctorRegistrationScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doctorsAPI, authAPI } from '../../services/api';

export default function DoctorRegistrationScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    specialization: '',
    hospital: '',
    license_number: '',
    experience_years: '',
    consultation_fee: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.specialization.trim() || !formData.hospital.trim()) {
      Alert.alert('Error', 'Specialization and Hospital are required');
      return;
    }

    if (!formData.license_number.trim()) {
      Alert.alert('Error', 'Medical License Number is required');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create doctor profile
      const doctorProfileData = {
        specialization: formData.specialization,
        hospital: formData.hospital,
        license_number: formData.license_number,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : 0,
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : 0,
        available: true,
      };

      console.log('Creating doctor profile:', doctorProfileData);
      const response = await doctorsAPI.createProfile(doctorProfileData);
      console.log('Doctor profile created:', response);

      // Step 2: Update user role (if needed - depends on your backend)
      // You might need to call your backend to update the user's role

      Alert.alert(
        'Success',
        'Doctor registration submitted! Your application is under review. ' +
        'You will be notified when approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Doctor registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.data) {
        const data = error.response.data;
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.specialization) {
          errorMessage = `Specialization: ${data.specialization}`;
        } else if (data.license_number) {
          errorMessage = `License: ${data.license_number}`;
        }
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>👨‍⚕️ Doctor Registration</Text>
      <Text style={styles.subtitle}>
        Complete your professional profile to start accepting appointments
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Specialization *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Cardiologist, General Physician"
          value={formData.specialization}
          onChangeText={(text) => setFormData({ ...formData, specialization: text })}
        />

        <Text style={styles.label}>Hospital/Clinic Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., City Hospital, Health Clinic"
          value={formData.hospital}
          onChangeText={(text) => setFormData({ ...formData, hospital: text })}
        />

        <Text style={styles.label}>Medical License Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your official license number"
          value={formData.license_number}
          onChangeText={(text) => setFormData({ ...formData, license_number: text })}
        />

        <Text style={styles.label}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 5"
          value={formData.experience_years}
          onChangeText={(text) => setFormData({ ...formData, experience_years: text })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Consultation Fee (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 500"
          value={formData.consultation_fee}
          onChangeText={(text) => setFormData({ ...formData, consultation_fee: text })}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Application</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    marginTop: 15,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});