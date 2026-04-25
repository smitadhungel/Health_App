import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { doctorsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define slot colors to differentiate morning/evening
const getSlotColor = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return '#10b981'; // Morning - Green
  if (hour < 17) return '#f59e0b'; // Afternoon - Orange
  return '#6366f1'; // Evening - Indigo
};

export default function SetAvailabilityScreen({ navigation }: any) {
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doctorId, setDoctorId] = useState<number | null>(null);

  // Form State
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState('30');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const loadInitialData = useCallback(async () => {
    try {
      const profile = await doctorsAPI.getMyProfile();
      setDoctorId(profile.id);
      const data = await doctorsAPI.getAvailability(profile.id);
      setAvailability(data);
    } catch (error) {
      Alert.alert('Profile Required', 'Please complete your doctor profile to set availability.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleAddSlot = async () => {
    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be later than start time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
        slot_duration: parseInt(slotDuration, 10),
        is_active: true,
      };
      await doctorsAPI.addAvailability(payload);
      setModalVisible(false);
      if (doctorId) {
        const updated = await doctorsAPI.getAvailability(doctorId);
        setAvailability(updated);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not add slot');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlot = ({ item }: { item: any }) => (
    <View style={styles.modernSlotCard}>
      <View style={[styles.timeIndicator, { backgroundColor: getSlotColor(item.start_time) }]} />
      <View style={styles.slotMain}>
        <View style={styles.slotTimeRow}>
          <Icon name="time-outline" size={16} color="#64748b" />
          <Text style={styles.timeRangeText}>
            {item.start_time.slice(0, 5)} — {item.end_time.slice(0, 5)}
          </Text>
        </View>
        <View style={styles.tagRow}>
          <View style={styles.durationTag}>
            <Text style={styles.tagText}>{item.slot_duration} min slots</Text>
          </View>
          <View style={styles.dayTag}>
            <Text style={styles.tagText}>{FULL_DAYS[item.day_of_week]}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.trashBtn}>
        <Icon name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
            <Icon name="chevron-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color="#10b981" /></View>
      ) : (
        <FlatList
          data={availability}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSlot}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No active working hours set</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.emptyAddText}>Add Your First Slot</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modern Add Slot Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}></Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <Text style={styles.sectionLabel}>Select Day</Text>
            <View style={styles.dayPicker}>
              {DAYS_OF_WEEK.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(index)}
                  style={[styles.dayCircle, selectedDay === index && styles.dayCircleActive]}
                >
                  <Text style={[styles.dayLetter, selectedDay === index && styles.dayLetterActive]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Starts</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.timePickerBtn}>
                  <Icon name="play-outline" size={18} color="#10b981" />
                  <Text style={styles.timePickerText}>{startTime}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ width: 20 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Ends</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.timePickerBtn}>
                  <Icon name="stop-outline" size={18} color="#ef4444" />
                  <Text style={styles.timePickerText}>{endTime}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Duration per Patient (mins)</Text>
            <View style={styles.durationRow}>
              {['15', '30', '45', '60'].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSlotDuration(d)}
                  style={[styles.durationChip, slotDuration === d && styles.durationChipActive]}
                >
                  <Text style={[styles.durationChipText, slotDuration === d && styles.durationChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.mainSaveBtn, submitting && { opacity: 0.7 }]}
              onPress={handleAddSlot}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainSaveText}>Save Schedule</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        {/* Start Picker Modal (Android logic handled via DateTimePicker directly) */}
        {showStartPicker && (
          <DateTimePicker
            mode="time"
            value={new Date()}
            onChange={(e, date) => {
              setShowStartPicker(false);
              if (date) setStartTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            mode="time"
            value={new Date()}
            onChange={(e, date) => {
              setShowEndPicker(false);
              if (date) setEndTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
            }}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
  listContainer: { padding: 20 },
  modernSlotCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  timeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  slotMain: { flex: 1 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeRangeText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  durationTag: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  dayTag: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  tagText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  trashBtn: { padding: 8 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#94a3b8', marginTop: 12, fontWeight: '500' },
  emptyAddBtn: { marginTop: 20, backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyAddText: { color: '#fff', fontWeight: '700' },

  // Modal Styles
  modalBody: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  closeText: { color: '#ef4444', fontWeight: '600' },
  modalScroll: { padding: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, marginTop: 20 },
  
  dayPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dayCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  dayCircleActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  dayLetter: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  dayLetterActive: { color: '#fff' },

  timeInputRow: { flexDirection: 'row' },
  timePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  timePickerText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  durationChipActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  durationChipText: { fontWeight: '700', color: '#64748b' },
  durationChipTextActive: { color: '#fff' },

  mainSaveBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 40, elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10 },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});