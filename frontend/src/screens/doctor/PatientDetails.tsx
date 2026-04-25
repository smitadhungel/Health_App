import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

// Define the param list (should match your root stack)
type RootStackParamList = {
  PatientDetails: { patientId: number };
  // other screens as needed
};

type PatientDetailsRouteProp = RouteProp<RootStackParamList, 'PatientDetails'>;
type PatientDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PatientDetails'>;

// This interface should match the patient data we pass from dashboard
interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  last_appointment?: string;
}

export default function PatientDetails() {
  const navigation = useNavigation<PatientDetailsNavigationProp>();
  const route = useRoute<PatientDetailsRouteProp>();
  const { patientId } = route.params;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch patient details from an API.
    // For now, we simulate loading and use mock data.
    // In the future, you could also receive the patient object as a param.
    setTimeout(() => {
      // Mock data – replace with actual fetch
      setPatient({
        id: patientId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone_number: '123-456-7890',
        last_appointment: '2026-03-14',
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.centerContainer}>
        <Text>Patient not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Patient Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <View style={styles.infoRow}>
          <Icon name="person-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{patient.first_name} {patient.last_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="mail-outline" size={20} color="#16a34a" />
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{patient.email}</Text>
        </View>
        {patient.phone_number && (
          <View style={styles.infoRow}>
            <Icon name="call-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{patient.phone_number}</Text>
          </View>
        )}
        {patient.last_appointment && (
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Last Visit:</Text>
            <Text style={styles.infoValue}>{patient.last_appointment}</Text>
          </View>
        )}
      </View>

      {/* Shared Documents (Placeholder) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shared Documents</Text>
        <Text style={styles.placeholder}>No documents shared yet.</Text>
        {/* Later we'll add a list of documents here */}
      </View>

      {/* Appointment History (Optional) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appointment History</Text>
        <Text style={styles.placeholder}>Coming soon.</Text>
      </View>
    </ScrollView>
  );
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
fontSize: 20, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 10
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 12,
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
});
