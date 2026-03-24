import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { medicationsAPI } from '../../../services/api';
import { Package, FileText, MessageSquare, Send } from 'lucide-react-native';

type RootStackParamList = {
  RequestRefill: { medicationId: number; medicationName: string };
};

type RefillRequestScreenRouteProp = RouteProp<RootStackParamList, 'RequestRefill'>;
type RefillRequestScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RequestRefill'>;

export default function RefillRequestScreen() {
  const navigation = useNavigation<RefillRequestScreenNavigationProp>();
  const route = useRoute<RefillRequestScreenRouteProp>();
  const { medicationId, medicationName } = route.params;

  const [quantity, setQuantity] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    setLoading(true);
    try {
      await medicationsAPI.requestRefill({
        medication: medicationId,
        quantity: parseInt(quantity),
        pharmacy_name: pharmacyName,
        notes,
      });
      Alert.alert('Success', 'Refill request submitted.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit refill request.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Request Refill</Text>
      <Text style={styles.medName}>{medicationName}</Text>

      <Text style={styles.label}>Quantity *</Text>
      <View style={styles.inputWrapper}>
        <Package size={20} color="#16a34a" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="e.g., 30"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <Text style={styles.label}>Pharmacy Name (optional)</Text>
      <View style={styles.inputWrapper}>
        <FileText size={20} color="#16a34a" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={pharmacyName}
          onChangeText={setPharmacyName}
          placeholder="e.g., CVS Pharmacy"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
        <MessageSquare size={20} color="#16a34a" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 14 }]} />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Send size={20} color="#fff" />
            <Text style={styles.submitText}>Submit Request</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 8,
  },
  medName: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#064e3b',
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#14532d',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#86efac',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});