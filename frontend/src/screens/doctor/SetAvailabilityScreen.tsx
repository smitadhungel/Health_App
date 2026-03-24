import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { doctorsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AvailabilitySlot {
  id: number;
  day_of_week: number; // 0-6
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function SetAvailabilityScreen({ navigation }: any) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doctorId, setDoctorId] = useState<number | null>(null);

  // New slot form state
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('30');

  // Time picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadDoctorProfile();
  }, []);

  const loadDoctorProfile = async () => {
    try {
      const profile = await doctorsAPI.getMyProfile();
      setDoctorId(profile.id);
      loadAvailability(profile.id);
    } catch (error) {
      Alert.alert('Error', 'Doctor profile not found. Please complete your profile first.');
      navigation.goBack();
    }
  };

  const loadAvailability = async (id: number) => {
    try {
      const data = await doctorsAPI.getAvailability(id);
      setAvailability(data);
    } catch (error) {
      console.error('Error loading availability:', error);
      Alert.alert('Error', 'Failed to load availability schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!startTime || !endTime || !slotDuration) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      const newSlot = {
        day_of_week: selectedDay,                 // integer 0-6
        start_time: startTime,
        end_time: endTime,
        slot_duration: parseInt(slotDuration, 10), // integer
        is_active: true,                           // matches backend field
      };
      console.log('Sending slot data:', newSlot);
      await doctorsAPI.addAvailability(newSlot);
      Alert.alert('Success', 'Availability slot added');
      setModalVisible(false);
      // Reset form
      setSelectedDay(0);
      setStartTime('09:00');
      setEndTime('17:00');
      setSlotDuration('30');
      if (doctorId) loadAvailability(doctorId);
    } catch (error: any) {
      console.error('Error adding slot:', error);
      if (error.response) {
        const errorData = error.response.data;
        let errorMsg = 'Failed to add slot.';
        if (typeof errorData === 'string') errorMsg = errorData;
        else if (errorData.detail) errorMsg = errorData.detail;
        else if (errorData.message) errorMsg = errorData.message;
        else if (errorData.error) errorMsg = errorData.error;
        else if (errorData.non_field_errors) errorMsg = errorData.non_field_errors.join(', ');
        else {
          const firstKey = Object.keys(errorData)[0];
          if (firstKey && errorData[firstKey]) {
            errorMsg = `${firstKey}: ${Array.isArray(errorData[firstKey]) ? errorData[firstKey][0] : errorData[firstKey]}`;
          } else {
            errorMsg = JSON.stringify(errorData);
          }
        }
        Alert.alert('Error', errorMsg);
      } else if (error.request) {
        Alert.alert('Network Error', 'No response from server. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to add slot. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = (slotId: number) => {
    Alert.alert('Delete Slot', 'Are you sure you want to delete this slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // If you have a delete endpoint:
            // await doctorsAPI.deleteAvailability(slotId);
            // For now, optimistically remove from UI
            setAvailability(prev => prev.filter(s => s.id !== slotId));
            Alert.alert('Success', 'Slot deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete slot');
          }
        },
      },
    ]);
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const groupedAvailability = DAYS_OF_WEEK.map((day, index) => ({
    day,
    slots: availability.filter(s => s.day_of_week === index),
  }));

  const renderDaySection = ({ item }: { item: { day: string; slots: AvailabilitySlot[] } }) => (
    <View style={styles.daySection}>
      <Text style={styles.dayHeader}>{item.day}</Text>
      {item.slots.length === 0 ? (
        <Text style={styles.noSlotsText}>No slots set</Text>
      ) : (
        item.slots.map(slot => (
          <View key={slot.id} style={styles.slotRow}>
            <View style={styles.slotInfo}>
              <Text style={styles.slotTimeText}>
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </Text>
              <Text style={styles.slotDurationText}>{slot.slot_duration} min</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteSlot(slot.id)} style={styles.deleteButton}>
              <Icon name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#16a34a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Availability</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Icon name="add-circle" size={30} color="#16a34a" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedAvailability}
        keyExtractor={(item) => item.day}
        renderItem={renderDaySection}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Slot Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Availability Slot</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Day</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={(value) => setSelectedDay(value)}
                  style={styles.picker}
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <Picker.Item key={index} label={day} value={index} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.timeButton}>
                <Text style={styles.timeText}>{startTime}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={(() => {
                    const [h, m] = startTime.split(':').map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0);
                    return d;
                  })()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) {
                      const hours = selectedDate.getHours().toString().padStart(2, '0');
                      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                      setStartTime(`${hours}:${minutes}`);
                    }
                  }}
                />
              )}

              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.timeButton}>
                <Text style={styles.timeText}>{endTime}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={(() => {
                    const [h, m] = endTime.split(':').map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0);
                    return d;
                  })()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) {
                      const hours = selectedDate.getHours().toString().padStart(2, '0');
                      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                      setEndTime(`${hours}:${minutes}`);
                    }
                  }}
                />
              )}

              <Text style={styles.label}>Slot Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={slotDuration}
                onChangeText={setSlotDuration}
                keyboardType="numeric"
                placeholder="e.g., 30"
                placeholderTextColor="#9ca3af"
              />

              <TouchableOpacity
                style={[styles.saveButton, submitting && styles.disabledButton]}
                onPress={handleAddSlot}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Add Slot</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
  addButton: { padding: 5 },
  listContent: { padding: 20, paddingBottom: 40 },
  daySection: { marginBottom: 24 },
  dayHeader: { fontSize: 18, fontWeight: '700', color: '#16a34a', marginBottom: 12, letterSpacing: 0.5 },
  noSlotsText: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', marginLeft: 12 },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  slotInfo: { flex: 1 },
  slotTimeText: { fontSize: 16, fontWeight: '500', color: '#14532d', marginBottom: 4 },
  slotDurationText: { fontSize: 14, color: '#4b5563' },
  deleteButton: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#14532d' },
  label: { fontSize: 16, fontWeight: '600', color: '#166534', marginTop: 16, marginBottom: 8 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0fdf4',
  },
  picker: { height: 50, color: '#14532d' },
  timeButton: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f0fdf4',
    marginBottom: 8,
  },
  timeText: { fontSize: 16, color: '#14532d' },
  input: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f0fdf4',
    color: '#14532d',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: { backgroundColor: '#86efac' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 18 },
});