import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from './types';
import AdminDashboard from '../screens/admin/AdminDashboard';
import PendingDoctorsScreen from '../screens/admin/PendingDoctorsScreen';
const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: 'Admin Dashboard' }}
      />
      <Stack.Screen
        name="PendingDoctors"
        component={PendingDoctorsScreen}
        options={{ title: 'Pending Doctor Verifications' }}
      />
    </Stack.Navigator>
  );
}