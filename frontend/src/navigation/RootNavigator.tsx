// import React, { useEffect } from 'react';
// import { ActivityIndicator, View, PermissionsAndroid, Platform } from 'react-native';
// import PushNotification from 'react-native-push-notification';
// import { useAuth } from '../context/AuthContext';
// import { useReminders } from '../hooks/useReminders';
// import AuthStack from './AuthStack';
// import PatientStack from './PatientStack';
// import DoctorStack from './DoctorStack';
// import { configureNotifications } from '../services/notifications';

// async function requestNotificationPermission(): Promise<boolean> {
//   if (Platform.OS === 'android' && Platform.Version >= 33) {
//     const result = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//     );
//     console.log('Notification permission result:', result);
//     return result === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// }

// export default function RootNavigator() {
//   const { userToken, userRole, isLoading } = useAuth();

//   useEffect(() => {
//     const setupNotifications = async () => {
//       // Step 1: configure channels first
//       configureNotifications();

//       // Step 2: request runtime permission (Android 13+)
//       const granted = await requestNotificationPermission();
//       console.log('Notifications permitted:', granted);

//       // Step 3: fire a test notification after 5 seconds to verify setup
//       setTimeout(() => {
//         PushNotification.localNotification({
//           channelId: 'medication_reminders',
//           title: '✅ Notification Test',
//           message: 'If you see this, notifications are working!',
//         });
//         console.log('Test notification fired');
//       }, 5000);
//     };

//     setupNotifications();
//   }, []); // runs once on mount

//   // Schedule reminders whenever token/role/trigger changes
//   useReminders();

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" color="#16a34a" />
//       </View>
//     );
//   }

//   if (!userToken) {
//     return <AuthStack />;
//   }

//   if (userRole?.toUpperCase() === 'DOCTOR') {
//     return <DoctorStack />;
//   }

//   return <PatientStack />;
// }

// import React, { useEffect } from 'react';
// import { ActivityIndicator, View, PermissionsAndroid, Platform } from 'react-native';
// import { useAuth } from '../context/AuthContext';
// import { useReminders } from '../hooks/useReminders';
// import AuthStack from './AuthStack';
// import PatientStack from './PatientStack';
// import DoctorStack from './DoctorStack';
// import { configureNotifications } from '../services/notifications';

// async function requestNotificationPermission(): Promise<boolean> {
//   if (Platform.OS === 'android' && Platform.Version >= 33) {
//     const result = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//     );
//     console.log('Notification permission result:', result);
//     return result === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// }

// export default function RootNavigator() {
//   const { userToken, userRole, isLoading } = useAuth();

//   useEffect(() => {
//     const setupNotifications = async () => {
//       configureNotifications();
//       const granted = await requestNotificationPermission();
//       console.log('Notifications permitted:', granted);
//     };

//     setupNotifications();
//   }, []);

//   useReminders();

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" color="#16a34a" />
//       </View>
//     );
//   }

//   if (!userToken) {
//     return <AuthStack />;
//   }

//   if (userRole?.toUpperCase() === 'DOCTOR') {
//     return <DoctorStack />;
//   }

//   return <PatientStack />;
// }

// import React, { useEffect } from 'react';
// import {
//   ActivityIndicator,
//   View,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';
// import { useAuth } from '../context/AuthContext';
// import { useReminders } from '../hooks/useReminders';
// import { useRemindersContext } from '../context/RemindersContext';
// import AuthStack from './AuthStack';
// import PatientStack from './PatientStack';
// import DoctorStack from './DoctorStack';
// import { configureNotifications } from '../services/notifications';

// async function requestNotificationPermission(): Promise<boolean> {
//   if (Platform.OS === 'android' && Platform.Version >= 33) {
//     const result = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//     );
//     console.log('Notification permission result:', result);
//     return result === PermissionsAndroid.RESULTS.GRANTED;
//   }
//   return true;
// }

// export default function RootNavigator() {
//   const { userToken, userRole, isLoading } = useAuth();
//   const { trigger } = useRemindersContext();

//   useEffect(() => {
//     const setupNotifications = async () => {
//       configureNotifications();
//       const granted = await requestNotificationPermission();
//       console.log('Notifications permitted:', granted);
//     };
//     setupNotifications();
//   }, []);

//   useReminders(trigger);

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" color="#16a34a" />
//       </View>
//     );
//   }

//   if (!userToken) return <AuthStack />;
//   if (userRole?.toUpperCase() === 'DOCTOR') return <DoctorStack />;
//   return <PatientStack />;
// }


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