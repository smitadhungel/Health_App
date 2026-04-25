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
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Ensure this is installed
import { doctorsAPI } from '../../services/api';

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
    if (!formData.specialization.trim() || !formData.hospital.trim() || !formData.license_number.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in all fields marked with an asterisk (*)');
      return;
    }

    setLoading(true);
    try {
      const doctorProfileData = {
        ...formData,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : 0,
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : 0,
        available: true,
      };

      await doctorsAPI.createProfile(doctorProfileData);

      Alert.alert(
        'Application Sent',
        'Your professional profile is being verified by our medical board. We will notify you via email once approved.',
        [{ text: 'Great!', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Submission Failed', 'Please verify your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label: string, icon: string, key: keyof typeof formData, placeholder: string, keyboard = 'default', required = false) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label} {required && <Text style={styles.required}>*</Text>}</Text>
      <View style={styles.inputWrapper}>
        <Icon name={icon} size={20} color="#6366f1" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={formData[key]}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          keyboardType={keyboard as any}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
              <Icon name="chevron-left" size={28} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Join Our Network</Text>
              <Text style={styles.subtitle}>Partner with us to provide quality care</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.stepIndicator}>
              <View style={styles.stepActive} />
              <View style={styles.stepLine} />
              <View style={styles.stepInactive} />
            </View>

            <Text style={styles.sectionTitle}>Professional Information</Text>

            {renderInput('Medical Specialization', 'stethoscope', 'specialization', 'e.g. Cardiologist', 'default', true)}
            {renderInput('Hospital/Clinic', 'hospital-building', 'hospital', 'e.g. Mayo Clinic', 'default', true)}
            {renderInput('License Number', 'card-account-details-outline', 'license_number', 'Official Medical ID', 'default', true)}
            
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                {renderInput('Experience', 'briefcase-outline', 'experience_years', 'Years', 'numeric')}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput('Fee (₹)', 'currency-inr', 'consultation_fee', 'Price', 'numeric')}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.mainButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Submit Application</Text>
                  <Icon name="arrow-right" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            By submitting, you agree to our <Text style={styles.link}>Provider Terms of Service</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  backCircle: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowOpacity: 0.1, shadowRadius: 5 },
  headerTextContainer: { marginLeft: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },

  // Form Card
  formCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  
  // Custom Stepper Look
  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  stepActive: { width: 40, height: 6, borderRadius: 3, backgroundColor: '#6366f1' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#f1f5f9', marginHorizontal: 8 },
  stepInactive: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f1f5f9' },

  // Input Styling
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginLeft: 4 },
  required: { color: '#ef4444' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1e293b' },
  row: { flexDirection: 'row' },

  // Button
  mainButton: { backgroundColor: '#6366f1', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 14, marginTop: 20, gap: 10 },
  disabledButton: { backgroundColor: '#a5b4fc' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Footer
  footerText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 25, lineHeight: 18 },
  link: { color: '#6366f1', fontWeight: '600' },
});