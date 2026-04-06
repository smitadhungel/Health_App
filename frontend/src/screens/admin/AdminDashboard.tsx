import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, Users } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AdminDashboard'>;

export default function AdminDashboard() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <ShieldCheck size={40} color="#fff" />
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Manage doctors and platform</Text>
      </View>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PendingDoctors')}
      >
        <View style={styles.cardIcon}>
          <Users size={28} color="#1e3a5f" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Doctor Verifications</Text>
          <Text style={styles.cardSubtitle}>Review and approve pending doctors</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0fdf4', padding: 20 }, // Light mint background
  header: {
    backgroundColor: '#14532d', borderRadius: 20, // Forest Green
    padding: 24, alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 18, marginBottom: 12, elevation: 2,
    shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4,
    borderWidth: 1, borderColor: '#bbf7d0', // Soft green border
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#dcfce7', justifyContent: 'center', // Light lime icon box
    alignItems: 'center', marginRight: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#14532d' }, // Forest Green
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#fef2f2', // Soft red remains for logout
    paddingVertical: 14, borderRadius: 30, marginTop: 20,
    borderWidth: 1, borderColor: '#fee2e2',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#dc2626', marginLeft: 8 },
});