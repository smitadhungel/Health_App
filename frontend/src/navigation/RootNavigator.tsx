import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useReminders } from '../hooks/useReminders';
import { configureNotifications } from '../services/notifications';
import AuthStack from './AuthStack';
import PatientStack from './PatientStack';
import DoctorStack from './DoctorStack';

export default function RootNavigator() {
  const { userToken, userRole, isLoading } = useAuth();

  // Configure notifications (safe to call multiple times)
  configureNotifications();

  // Schedule reminders when user is logged in
  useReminders();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!userToken) {
    return <AuthStack />;
  }

  if (userRole?.toUpperCase() === 'DOCTOR') {
    return <DoctorStack />;
  }

  return <PatientStack />;
}