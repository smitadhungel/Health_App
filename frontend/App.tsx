// App.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Doctor Screens
import DoctorsDashboard from './src/screens/doctor/DoctorsDashboard';
import DoctorDetails from './src/screens/doctor/DoctorDetails';
import SetAvailabilityScreen from './src/screens/doctor/SetAvailabilityScreen';
import AppointmentsCalendar from './src/screens/doctor/AppointmentsCalendar';
// Patient Screens
import PatientHomeScreen from './src/screens/patient/PatientHomeScreen';
import BookAppointmentScreen from './src/screens/patient/BookAppointmentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        // Use consistent key 'user_role' (matches login/register storage)
        const [storedToken, storedRole] = await Promise.all([
          AsyncStorage.getItem('access_token'),
          AsyncStorage.getItem('user_role'), // Fixed: was 'role' – now matches
        ]);

        setToken(storedToken);
        setUserRole(storedRole);
      } catch (error) {
        console.error('Failed to load authentication data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Determine initial route based on token and role
  const getInitialRoute = () => {
    if (!token) {
      return 'Login';
    }
    
    // Normalize role (case-insensitive, handle possible "DOCTOR" or "doctor")
    const normalizedRole = userRole?.toUpperCase();
    if (normalizedRole === 'DOCTOR') {
      // Note: The doctor's profile might be incomplete.
      // We'll rely on DoctorsDashboard to redirect to DoctorDetails if needed.
      return 'DoctorsDashboard';
    } else {
      return 'PatientHome';
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={getInitialRoute()}
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Doctor Screens */}
        <Stack.Screen 
          name="DoctorsDashboard" 
          component={DoctorsDashboard}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="DoctorDetails"
          component={DoctorDetails}
          options={{ 
            headerShown: true, 
            title: 'Doctor Details',
            headerBackTitle: 'Back'
          }}
        />

        {/* Patient Screens */}
        <Stack.Screen 
          name="PatientHome" 
          component={PatientHomeScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name="BookAppointment" 
          component={BookAppointmentScreen}
          options={{
            headerShown: true,
            title: 'Book Appointment'
          }}
        />

        <Stack.Screen name="SetAvailability" component={SetAvailabilityScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AppointmentsCalendar" component={AppointmentsCalendar} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}