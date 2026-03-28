import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DoctorsDashboard from '../screens/doctor/DoctorsDashboard';
import DoctorDetails from '../screens/doctor/DoctorDetails';
import SetAvailabilityScreen from '../screens/doctor/SetAvailabilityScreen';
import AppointmentsCalendar from '../screens/doctor/AppointmentsCalendar';
import PatientDetails from '../screens/doctor/PatientDetails';
import { DoctorStackParamList } from './types';
import AppointmentDetails from '../screens/doctor/AppointmentDetails';

const Stack = createNativeStackNavigator<DoctorStackParamList>();

export default function DoctorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="DoctorsDashboard" 
        component={DoctorsDashboard} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DoctorDetails" 
        component={DoctorDetails} 
        options={{ 
         title: 'Professional Information',
         headerBackVisible: false, // Hide back button during onboarding
        }}
      />
      <Stack.Screen 
        name="SetAvailability" 
        component={SetAvailabilityScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AppointmentsCalendar" 
        component={AppointmentsCalendar} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PatientDetails" 
        component={PatientDetails} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AppointmentDetails" 
        component={AppointmentDetails} 
        options={{ headerShown: false}}
      />

    </Stack.Navigator>
  );
}