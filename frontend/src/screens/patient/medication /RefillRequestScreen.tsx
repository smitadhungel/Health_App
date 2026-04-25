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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import{  SafeAreaView} from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { medicationsAPI } from '../../../services/api';
import { Package, FileText, MessageSquare, Send, ArrowLeft } from 'lucide-react-native';

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#14532d" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Refill Request</Text>
            <View style={{ width: 40 }} /> 
          </View>

          {/* Med Info Card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Refilling for</Text>
            <Text style={styles.medTitle}>{medicationName}</Text>
          </View>

          <View style={styles.formCard}>
            {/* Quantity Input */}
            <Text style={styles.label}>Quantity <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconCircle}>
                <Package size={18} color="#16a34a" />
              </View>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="e.g., 30"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Pharmacy Input */}
            <Text style={styles.label}>Pharmacy Name</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconCircle}>
                <FileText size={18} color="#16a34a" />
              </View>
              <TextInput
                style={styles.input}
                value={pharmacyName}
                onChangeText={setPharmacyName}
                placeholder="e.g., CVS Pharmacy"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Notes Input */}
            <Text style={styles.label}>Special Instructions</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <View style={[styles.iconCircle, { marginTop: 12 }]}>
                <MessageSquare size={18} color="#16a34a" />
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes for your doctor or pharmacist..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>Submit Request</Text>
                  <Send size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#14532d',
  },
  heroCard: {
    backgroundColor: '#16a34a',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  heroLabel: {
    color: '#dcfce7',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  medTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});