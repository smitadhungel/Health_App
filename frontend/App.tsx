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
import DoctorScreen from './src/screens/doctor/DoctorsScreen';

// Patient Screens
import PatientHomeScreen from './src/screens/patient/PatientHomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      const storedRole = await AsyncStorage.getItem('role');

      setToken(storedToken);
      setRole(storedRole);
      setIsLoading(false);
    };

    loadAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : role === 'Doctor' ? (
          <>
            <Stack.Screen name="DoctorsDashboard" component={DoctorsDashboard} />
            <Stack.Screen
              name="DoctorDetails"
              component={DoctorScreen}
              options={{ headerShown: true, title: 'Doctor Details' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="PatientHome" component={PatientHomeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
