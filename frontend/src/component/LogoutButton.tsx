import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface LogoutButtonProps {
  navigation: any;
  onLogout?: () => void;
}

export default function LogoutButton({ navigation, onLogout }: LogoutButtonProps) {
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get refresh token
              const refreshToken = await AsyncStorage.getItem('refresh_token');
              
              if (refreshToken) {
                // Call logout API to blacklist token
                await authAPI.logout(refreshToken);
              }
            } catch (error) {
              console.log('Logout API error:', error);
            } finally {
              // Clear local storage regardless of API call success
              await AsyncStorage.multiRemove([
                'access_token',
                'refresh_token',
                'user',
              ]);
              
              // Call onLogout callback if provided
              if (onLogout) {
                onLogout();
              }
              
              // Navigate to login screen
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleLogout}>
      <Text style={styles.buttonText}>Logout</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});