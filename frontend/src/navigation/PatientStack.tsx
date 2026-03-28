import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import MedicationsListScreen from '../screens/patient/medication /MedicationsListScreen';
import AddMedicationScreen from '../screens/patient/medication /AddMedicationScreen';
import MedicationDetailScreen from '../screens/patient/medication /MedicationsDetailScreen';
import TodayDosesScreen from '../screens/patient/medication /TodayDosesScreen';
import RefillRequestScreen from '../screens/patient/medication /RefillRequestScreen';
import BookAppointmentScreen from '../screens/patient/BookAppointmentScreen';
import UploadDocumentScreen from '../screens/patient/UploadDocumentScreen';
import { PatientStackParamList } from './types';
import DocumentsScreen from '../screens/patient/documentScreen';
import DocumentDetailsScreen from '../screens/patient/DocumentDetailsScreen';

import DoctorRegistrationScreen from '../screens/doctor/DoctorRegistrationScreen';

import TestScreen from '../screens/test';
import NearbyPlacesScreen from '../screens/patient/NearbyPlacesScreen';
const Stack = createNativeStackNavigator<PatientStackParamList>();

export default function PatientStack() {
  return (
    <Stack.Navigator
    screenOptions={{
    headerStyle: {
      backgroundColor: '#f0fdf4',
    },
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#ffff',
    },
    headerTintColor: '#16a34a',
  }}>
       <Stack.Screen 
        name="PatientHome" 
        component={PatientHomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Medications" 
        component={MedicationsListScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddMedication" 
        component={AddMedicationScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MedicationDetail" 
        component={MedicationDetailScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TodayDoses" 
        component={TodayDosesScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RequestRefill" 
        component={RefillRequestScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="BookAppointment" 
        component={BookAppointmentScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UploadDocument" 
        component={UploadDocumentScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Documents" 
        component={DocumentsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DocumentDetails" 
        component={DocumentDetailsScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DoctorRegistration" 
        component={DoctorRegistrationScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PlaceDetails" 
        component={NearbyPlacesScreen} 
        options={{ headerShown: false }}
      />

      {/* <Stack.Screen name="PatientHome" component={TestScreen} />  */}
      {/* <Stack.Screen name="Medications" component={TestScreen} /> */}
    </Stack.Navigator>
  );
}