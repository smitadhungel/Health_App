import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { medicationsAPI } from '../../../services/api';
import { useRemindersContext } from '../../../context/RemindersContext';
import {
  Pill,
  Activity,
  Clock,
  Calendar,
  CalendarRange,
  FileText,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
} from 'lucide-react-native';

const FREQUENCY_CHOICES = [
  { label: 'Once a day', value: 'ONCE_DAILY' },
  { label: 'Twice a day', value: 'TWICE_DAILY' },
  { label: 'Three times a day', value: 'THRICE_DAILY' },
  { label: 'Four times a day', value: 'FOUR_TIMES_DAILY' },
  { label: 'As needed', value: 'AS_NEEDED' },
];

const getDefaultTimes = (frequency: string): string[] => {
  switch (frequency) {
    case 'ONCE_DAILY':      return ['08:00'];
    case 'TWICE_DAILY':     return ['08:00', '20:00'];
    case 'THRICE_DAILY':    return ['08:00', '14:00', '20:00'];
    case 'FOUR_TIMES_DAILY':return ['08:00', '12:00', '16:00', '20:00'];
    default:                return [];
  }
};

export default function AddMedicationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { refresh } = useRemindersContext(); // ← added
  const medicationId = (route.params as { medicationId?: string })?.medicationId;
  const isEditing = !!medicationId;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [doseTimes, setDoseTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      dosage: '',
      frequency: 'ONCE_DAILY',
      start_date: new Date().toISOString().split('T')[0],
      duration_days: '',
      instructions: '',
      form: 'TABLET',
    },
  });

  const startDate = watch('start_date');
  const frequency = watch('frequency');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id);
        } else {
          Alert.alert('Error', 'User not logged in. Please login again.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Failed to load user', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!isEditing && doseTimes.length === 0) {
      const suggested = getDefaultTimes(frequency);
      if (suggested.length > 0) setDoseTimes(suggested);
    }
  }, [frequency, isEditing]);

  useEffect(() => {
    if (isEditing && medicationId) loadMedicationData();
  }, [isEditing, medicationId]);

  const loadMedicationData = async () => {
    if (!medicationId) return;
    try {
      const medId = parseInt(medicationId, 10);
      const med = await medicationsAPI.getDetails(medId);
      setValue('name', med.name);
      setValue('dosage', med.dosage);
      setValue('frequency', med.frequency);
      setValue('start_date', med.start_date);
      setValue('duration_days', med.duration_days ? med.duration_days.toString() : '');
      setValue('instructions', med.instructions || '');
      setValue('form', med.form || 'TABLET');
      const schedules = await medicationsAPI.getSchedules(medId);
      setDoseTimes(schedules.map(s => s.time));
    } catch (error) {
      Alert.alert('Error', 'Failed to load medication data.');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

  const addDoseTime = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
      if (currentTimeIndex !== null) {
        const newTimes = [...doseTimes];
        newTimes[currentTimeIndex] = timeString;
        setDoseTimes(newTimes);
        setCurrentTimeIndex(null);
      } else {
        setDoseTimes([...doseTimes, timeString]);
      }
    }
  };

  const removeDoseTime = (index: number) => {
    setDoseTimes(prev => prev.filter((_, i) => i !== index));
  };

  const editDoseTime = (index: number) => {
    setCurrentTimeIndex(index);
    setShowTimePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('start_date', selectedDate.toISOString().split('T')[0]);
    }
  };

  const onSubmit = async (data: any) => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated. Please login again.');
      return;
    }
    if (!isEditing && doseTimes.length === 0) {
      Alert.alert('Error', 'Please add at least one dose time.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient: userId,
        name: data.name,
        dosage: data.dosage || '',
        frequency: data.frequency,
        start_date: data.start_date,
        duration_days: data.duration_days ? parseInt(data.duration_days) : undefined,
        instructions: data.instructions || '',
        form: data.form,
      };

      console.log('Submitting payload:', JSON.stringify(payload, null, 2));

      if (isEditing) {
        if (!medicationId) return;
        await medicationsAPI.update(parseInt(medicationId, 10), payload);
        refresh(); // ← reschedule after edit
        Alert.alert('Success', 'Medication updated successfully.');
      } else {
        const response = await medicationsAPI.create(payload);
        const medication = response.medication;
        for (const time of doseTimes) {
          await medicationsAPI.addSchedule(medication.id, { time, dosage_count: 1 });
        }
        refresh(); // ← reschedule after new medication + schedules added
        Alert.alert('Success', 'Medication added successfully.');
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('Save medication error:', error);
      if (error.response) {
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
        Alert.alert('Error', `Server error: ${error.response.status}`);
      } else if (error.request) {
        Alert.alert('Network Error', 'No response from server. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to save medication. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{isEditing ? 'Edit Medication' : 'Add New Medication'}</Text>

      {/* Medicine Name */}
      <Text style={styles.label}>Medicine Name *</Text>
      <View style={styles.inputWrapper}>
        <Pill size={20} color="#16a34a" style={styles.inputIcon} />
        <Controller
          control={control}
          rules={{ required: 'Medicine name is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g., Paracetamol"
              placeholderTextColor="#9ca3af"
            />
          )}
          name="name"
        />
      </View>
      {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

      {/* Strength */}
      <Text style={styles.label}>Strength (optional)</Text>
      <View style={styles.inputWrapper}>
        <Activity size={20} color="#16a34a" style={styles.inputIcon} />
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g., 500mg, 10ml"
              placeholderTextColor="#9ca3af"
            />
          )}
          name="dosage"
        />
      </View>

      {/* Frequency */}
      <Text style={styles.label}>How often? *</Text>
      <View style={styles.pickerWrapper}>
        <Clock size={20} color="#16a34a" style={styles.pickerIcon} />
        <Controller
          control={control}
          rules={{ required: 'Frequency is required' }}
          render={({ field: { onChange, value } }) => (
            <Picker
              selectedValue={value}
              onValueChange={onChange}
              style={styles.picker}
              {...(Platform.OS === 'android' ? { mode: 'dropdown' } : {})}
              dropdownIconColor="#16a34a"
            >
              {FREQUENCY_CHOICES.map(choice => (
                <Picker.Item key={choice.value} label={choice.label} value={choice.value} />
              ))}
            </Picker>
          )}
          name="frequency"
        />
      </View>
      {errors.frequency && <Text style={styles.error}>{errors.frequency.message}</Text>}

      {/* Start Date */}
      <Text style={styles.label}>Start Date *</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <Calendar size={20} color="#16a34a" style={styles.dateIcon} />
        <Text style={styles.dateText}>{startDate}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={new Date(startDate)}
          onChange={onDateChange}
        />
      )}
      {errors.start_date && <Text style={styles.error}>{errors.start_date.message}</Text>}

      {/* Duration */}
      <Text style={styles.label}>Duration (days, optional)</Text>
      <View style={styles.inputWrapper}>
        <CalendarRange size={20} color="#16a34a" style={styles.inputIcon} />
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g., 7"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          )}
          name="duration_days"
        />
      </View>

      {/* Instructions */}
      <Text style={styles.label}>Special Instructions (optional)</Text>
      <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
        <FileText size={20} color="#16a34a" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 12 }]} />
        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="e.g., Take after meals"
              multiline
              numberOfLines={3}
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          )}
          name="instructions"
        />
      </View>

      {/* Dose Times */}
      <Text style={styles.label}>When to take? {!isEditing && '*'}</Text>
      {isEditing ? (
        <>
          {doseTimes.map((time, index) => (
            <View key={index} style={styles.timeRowReadOnly}>
              <Clock size={18} color="#16a34a" />
              <Text style={styles.timeText}>{time}</Text>
            </View>
          ))}
          <Text style={styles.note}>To change dose times, please delete and recreate the medication.</Text>
        </>
      ) : (
        <>
          {doseTimes.map((time, index) => (
            <View key={index} style={styles.timeRow}>
              <View style={styles.timeInfo}>
                <Clock size={18} color="#16a34a" />
                <Text style={styles.timeText}>{time}</Text>
              </View>
              <View style={styles.timeActions}>
                <TouchableOpacity onPress={() => editDoseTime(index)} style={styles.editButton}>
                  <Edit3 size={18} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeDoseTime(index)} style={styles.removeButton}>
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addTimeButton}
            onPress={() => {
              setCurrentTimeIndex(null);
              setShowTimePicker(true);
            }}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addTimeText}>Add Dose Time</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              mode="time"
              value={new Date()}
              is24Hour={true}
              display="default"
              onChange={addDoseTime}
            />
          )}
        </>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <CheckCircle size={22} color="#fff" />
            <Text style={styles.submitText}>{isEditing ? 'Update Medication' : 'Save Medication'}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f0fdf4', flexGrow: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#14532d', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#166534', marginTop: 16, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#ffffff', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#14532d' },
  pickerWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#ffffff', paddingHorizontal: 8 },
  pickerIcon: { marginRight: 4 },
  picker: { flex: 1, height: 50, color: '#14532d' },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 14 },
  dateIcon: { marginRight: 8 },
  dateText: { fontSize: 16, color: '#14532d', flex: 1 },
  textAreaWrapper: { alignItems: 'flex-start' },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  timeRowReadOnly: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  timeInfo: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 16, color: '#14532d', marginLeft: 8 },
  timeActions: { flexDirection: 'row' },
  editButton: { padding: 6, marginRight: 8, backgroundColor: '#dcfce7', borderRadius: 8 },
  removeButton: { padding: 6, backgroundColor: '#fee2e2', borderRadius: 8 },
  addTimeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', padding: 14, borderRadius: 30, marginTop: 12 },
  addTimeText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  note: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', marginTop: 8 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', padding: 16, borderRadius: 30, marginTop: 32, marginBottom: 20, elevation: 3 },
  disabledButton: { backgroundColor: '#bbf7d0' },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 4, marginLeft: 4 },
});