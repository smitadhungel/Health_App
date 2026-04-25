import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { medicationsAPI } from '../../../services/api';
import { useRemindersContext } from '../../../context/RemindersContext';
import {
  Pill, Activity, Clock, Calendar, FileText, 
  Plus, Trash2, Check, ChevronRight, Info
} from 'lucide-react-native';

const FORMS = [
  { label: 'Tablet', icon: 'tablet' },
  { label: 'Capsule', icon: 'pill' },
  { label: 'Syrup', icon: 'droplet' },
  { label: 'Injection', icon: 'syringe' },
];

export default function AddMedicationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { refresh } = useRemindersContext();
  const medicationId = (route.params as { medicationId?: string })?.medicationId;
  const isEditing = !!medicationId;

  const [loading, setLoading] = useState(false);
  const [doseTimes, setDoseTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  const selectedForm = watch('form');
  const startDate = watch('start_date');

  useEffect(() => {
    const loadUser = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setUserId(JSON.parse(userStr).id);
    };
    loadUser();
    if (isEditing) loadMedicationData();
  }, []);

  const loadMedicationData = async () => {
    try {
      const med = await medicationsAPI.getDetails(parseInt(medicationId!, 10));
      setValue('name', med.name);
      setValue('dosage', med.dosage);
      setValue('frequency', med.frequency);
      setValue('start_date', med.start_date);
      setValue('duration_days', med.duration_days?.toString() || '');
      setValue('instructions', med.instructions || '');
      setValue('form', med.form || 'TABLET');
      const schedules = await medicationsAPI.getSchedules(med.id);
      setDoseTimes(schedules.map(s => s.time));
    } catch (e) {
      Alert.alert('Error', 'Could not load medication details.');
    }
  };

  const onSubmit = async (data: any) => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = { ...data, patient: userId, duration_days: data.duration_days ? parseInt(data.duration_days) : undefined };
      if (isEditing) {
        await medicationsAPI.update(parseInt(medicationId!, 10), payload);
      } else {
        const res = await medicationsAPI.create(payload);
        for (const time of doseTimes) {
          await medicationsAPI.addSchedule(res.medication.id, { time, dosage_count: 1 });
        }
      }
      refresh();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save medication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isEditing ? 'Update Plan' : 'New Medication'}</Text>
          <Text style={styles.headerSub}>Set up your schedule accurately</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Section: Basic Info */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>General Info</Text>
            
            <Controller
              control={control}
              rules={{ required: 'Name is required' }}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Pill size={18} color="#059669" style={styles.icon} />
                  <TextInput 
                    placeholder="Medicine Name" 
                    value={value} 
                    onChangeText={onChange} 
                    style={styles.input} 
                  />
                </View>
              )}
            />
            
            <Controller
              control={control}
              name="dosage"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Activity size={18} color="#059669" style={styles.icon} />
                  <TextInput 
                    placeholder="Strength (e.g. 500mg)" 
                    value={value} 
                    onChangeText={onChange} 
                    style={styles.input} 
                  />
                </View>
              )}
            />
          </View>

          {/* Section: Form Type */}
          <Text style={styles.sectionTitleOutside}>Medicine Form</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formScroll}>
            {FORMS.map((f) => (
              <TouchableOpacity 
                key={f.label}
                onPress={() => setValue('form', f.label.toUpperCase())}
                style={[styles.formChip, selectedForm === f.label.toUpperCase() && styles.formChipActive]}
              >
                <Text style={[styles.formText, selectedForm === f.label.toUpperCase() && styles.formTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Section: Schedule */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Schedule & Timing</Text>
            
            <TouchableOpacity style={styles.rowPicker} onPress={() => setShowDatePicker(true)}>
              <View style={styles.rowLabel}>
                <Calendar size={18} color="#059669" />
                <Text style={styles.rowText}>Start Date</Text>
              </View>
              <Text style={styles.rowValue}>{startDate}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.rowPicker}>
              <View style={styles.rowLabel}>
                <Clock size={18} color="#059669" />
                <Text style={styles.rowText}>Frequency</Text>
              </View>
              <Controller
                control={control}
                name="frequency"
                render={({ field: { onChange, value } }) => (
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ width: 160 }}
                  >
                    <Picker.Item label="Once Daily" value="ONCE_DAILY" />
                    <Picker.Item label="Twice Daily" value="TWICE_DAILY" />
                    <Picker.Item label="As Needed" value="AS_NEEDED" />
                  </Picker>
                )}
              />
            </View>
          </View>

          {/* Section: Dose Times */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Reminder Times</Text>
              {!isEditing && (
                <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                  <Plus size={20} color="#10b981" />
                </TouchableOpacity>
              )}
            </View>

            {doseTimes.map((time, idx) => (
              <View key={idx} style={styles.timeTag}>
                <Clock size={14} color="#059669" />
                <Text style={styles.timeTagText}>{time}</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={() => setDoseTimes(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            {isEditing && (
              <View style={styles.infoBox}>
                <Info size={14} color="#64748b" />
                <Text style={styles.infoText}>Times cannot be modified while editing.</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Create Reminder'}</Text>
                <Check size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={new Date(startDate)}
          onChange={(e, d) => { setShowDatePicker(false); if(d) setValue('start_date', d.toISOString().split('T')[0]); }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          mode="time"
          value={new Date()}
          is24Hour={true}
          onChange={(e, d) => {
            setShowTimePicker(false);
            if(d) setDoseTimes([...doseTimes, d.toTimeString().split(' ')[0].substring(0, 5)]);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  header: { padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  scrollContent: { padding: 20 },
  
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 16 },
  sectionTitleOutside: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  
  formScroll: { marginBottom: 25 },
  formChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  formChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  formText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  formTextActive: { color: '#fff' },
  
  rowPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  rowValue: { fontSize: 16, color: '#10b981', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeTag: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, marginBottom: 8 },
  timeTagText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#166534' },
  
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginTop: 4 },
  infoText: { fontSize: 12, color: '#64748b', flex: 1 },
  
  saveBtn: { backgroundColor: '#064e3b', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});