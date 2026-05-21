import React, { useEffect } from 'react';
import { ActivityIndicator, View, PermissionsAndroid, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useReminders } from '../hooks/useReminders';
import { useRemindersContext } from '../context/RemindersContext';
import AuthStack from './AuthStack';
import PatientStack from './PatientStack';
import DoctorStack from './DoctorStack';
import AdminStack from './AdminStack';
import { configureNotifications } from '../services/notifications';

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export default function RootNavigator() {
  const { userToken, userRole, isLoading } = useAuth();
  const { trigger } = useRemindersContext();

  useEffect(() => {
    const setupNotifications = async () => {
      configureNotifications();
      await requestNotificationPermission();
    };
    setupNotifications();
  }, []);

  useReminders(trigger);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!userToken) return <AuthStack />;

  const role = userRole?.toUpperCase();
  if (role === 'DOCTOR') return <DoctorStack />;
  if (role === 'ADMIN') return <AdminStack />;
  return <PatientStack />;
}