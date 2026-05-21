import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { RemindersProvider } from './src/context/RemindersContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <RemindersProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </RemindersProvider>
    </AuthProvider>
  );
}