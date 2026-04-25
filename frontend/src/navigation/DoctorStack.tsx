import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DoctorStackParamList } from './types';

// doctors personal platform 
import DoctorsDashboard from '../screens/doctor/DoctorsDashboard';
import DoctorDetails from '../screens/doctor/DoctorDetails';
import SetAvailabilityScreen from '../screens/doctor/SetAvailabilityScreen';
import AppointmentsCalendar from '../screens/doctor/AppointmentsCalendar';

// these are to manage the patients 
import PatientDetails from '../screens/doctor/PatientDetails';
import AppointmentDetails from '../screens/doctor/AppointmentDetails';
import SharedDocumentsScreen from '../screens/doctor/SharedDocumentsScreen';

// prescription screen for the doctor 
import WritePrescriptionScreen from '../screens/doctor/WritePrescriptionScreen';
import DoctorPrescriptionsScreen from '../screens/doctor/DoctorPrescriptionsScreen';
import PrescriptionDetailScreen from '../screens/doctor/PrescriptionDetailScreen';

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
         options={{ headerShown: false }}
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

      <Stack.Screen 
      name="SharedDocuments" 
      component={SharedDocumentsScreen} 
       options={{ headerShown: false }} />

      <Stack.Screen 
      name="WritePrescription" 
      component={WritePrescriptionScreen} 
      options={{ headerShown: false }} />

      <Stack.Screen 
      name="DoctorPrescriptions" 
      component={DoctorPrescriptionsScreen} 
       options={{ headerShown: false }} />

      <Stack.Screen name="PrescriptionDetail" 
      component={PrescriptionDetailScreen} 
       options={{ headerShown: false }} />

    </Stack.Navigator>
  );
}