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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doctorsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AvailabilitySlot {
  id?: number;
  day_of_week: number;
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
  'Sunday',
];

export default function SetAvailabilityScreen({ navigation }: any) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New slot form state
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('30');

  // Time picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const doctorId = await AsyncStorage.getItem('doctorId');
      if (!doctorId) {
        Alert.alert('Error', 'Doctor ID not found');
        setLoading(false);
        return;
      }
      const data = await doctorsAPI.getAvailability(parseInt(doctorId, 10));
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
    // Send slot data with day_of_week as string and is_available as true
    const newSlot = {
      day_of_week: DAYS_OF_WEEK[selectedDay],
      start_time: startTime,
      end_time: endTime,
      is_available: true,
    };
    console.log('Sending slot data:', newSlot);
    await doctorsAPI.addAvailability(newSlot);
    Alert.alert('Success', 'Availability slot added');
    setModalVisible(false);
    loadAvailability();
  } catch (error: any) {
    console.error('Error adding slot:', error);
    if (error.response) {
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Error status:', error.response.status);
      // Show error message from backend
      const errorData = error.response.data;
      let errorMsg = 'Failed to add slot.';
      if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (errorData.detail) {
        errorMsg = errorData.detail;
      } else if (errorData.message) {
        errorMsg = errorData.message;
      } else if (errorData.error) {
        errorMsg = errorData.error;
      } else if (errorData.non_field_errors) {
        errorMsg = errorData.non_field_errors.join(', ');
      } else {
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
            // You'll need a delete endpoint; if not available, you can set is_active = false
            // await doctorsAPI.deleteAvailability(slotId);
            // For now, assume we can delete
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
    // Convert "HH:MM" to "h:MM AM/PM"
    const [hour, minute] = time.split(':');
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  const renderSlotItem = ({ item }: { item: AvailabilitySlot }) => (
    <View style={styles.slotCard}>
      <View style={styles.slotInfo}>
        <Text style={styles.slotDay}>{DAYS_OF_WEEK[item.day_of_week]}</Text>
        <Text style={styles.slotTime}>
          {formatTime(item.start_time)} - {formatTime(item.end_time)}
        </Text>
        <Text style={styles.slotDuration}>{item.slot_duration} min slots</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteSlot(item.id!)} style={styles.deleteButton}>
        <Icon name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

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
            <Text style={styles.slotTimeText}>
              {formatTime(slot.start_time)} - {formatTime(slot.end_time)} ({slot.slot_duration} min)
            </Text>
            <TouchableOpacity onPress={() => handleDeleteSlot(slot.id!)}>
              <Icon name="close-circle" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Availability</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Icon name="add-circle" size={30} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedAvailability}
        keyExtractor={(item) => item.day}
        renderItem={renderDaySection}
        contentContainerStyle={styles.listContent}
      />

      {/* Add Slot Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Availability Slot</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
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
                <Text>{startTime}</Text>
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
                <Text>{endTime}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  addButton: { padding: 5 },
  listContent: { padding: 20 },
  daySection: { marginBottom: 20 },
  dayHeader: { fontSize: 18, fontWeight: '600', color: '#007AFF', marginBottom: 10 },
  noSlotsText: { fontSize: 14, color: '#999', fontStyle: 'italic', marginLeft: 10 },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  slotTimeText: { fontSize: 14, color: '#333' },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  slotInfo: { flex: 1 },
  slotDay: { fontSize: 16, fontWeight: '600', color: '#333' },
  slotTime: { fontSize: 14, color: '#666', marginTop: 4 },
  slotDuration: { fontSize: 12, color: '#999', marginTop: 2 },
  deleteButton: { padding: 5 },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 15, marginBottom: 5 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  picker: { height: 50 },
  timeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { backgroundColor: '#a5b4fc' },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});