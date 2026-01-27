import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function PatientHomeScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <Text style={styles.title}>👋 Welcome, Patient</Text>
      <Text style={styles.subtitle}>
        Manage your health in one place
      </Text>

      {/* Cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🩺 Book Appointment</Text>
        <Text style={styles.cardText}>
          Schedule a visit with a doctor
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('BookAppointment')}
        >
          <Text style={styles.buttonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 My Appointments</Text>
        <Text style={styles.cardText}>
          View upcoming and past appointments
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MyAppointments')}
        >
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💊 My Prescriptions</Text>
        <Text style={styles.cardText}>
          Check prescribed medicines
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Prescriptions')}
        >
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f7fb',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 30,
    alignItems: 'center',
  },
  logoutText: {
    color: '#e11d48',
    fontSize: 16,
    fontWeight: '600',
  },
});
