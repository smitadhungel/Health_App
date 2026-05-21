import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView, StatusBar,
  Modal, FlatList, Animated, Dimensions,
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
  Pill, Activity, Clock, Calendar,
  Plus, Trash2, Check, Info,
} from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FORMS = [
  { label: 'Tablet'    },
  { label: 'Capsule'   },
  { label: 'Syrup'     },
  { label: 'Injection' },
];

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const ITEM_HEIGHT = 52;
const VISIBLE     = 5;
const PICKER_H    = ITEM_HEIGHT * VISIBLE;

// ─── Drum Scroll Column ──────────────────────────────────────────────────────
function DrumColumn({
  data,
  selectedIndex,
  onSelect,
  label,
}: {
  data: string[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  label: string;
}) {
  const ref = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }, 100);
  }, []);

  const onMomentumEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, data.length - 1));
    onSelect(clamped);
  };

  return (
    <View style={drum.col}>
      <Text style={drum.label}>{label}</Text>
      <View pointerEvents="none" style={drum.highlight} />
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index,
        })}
        renderItem={({ item, index }) => {
          const active = index === selectedIndex;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                ref.current?.scrollToIndex({ index, animated: true });
                onSelect(index);
              }}
              style={drum.item}
            >
              <Text style={[drum.itemText, active && drum.itemTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ─── Time Picker Modal ───────────────────────────────────────────────────────
function TimePickerModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [hourIdx,   setHourIdx]   = useState(8);
  const [minuteIdx, setMinuteIdx] = useState(0);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, bounciness: 4,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleConfirm = () => {
    const time = `${HOURS[hourIdx]}:${MINUTES[minuteIdx]}`;
    onConfirm(time);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[modal.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={modal.handle} />
        <Text style={modal.title}>Set Reminder Time</Text>
        <Text style={modal.sub}>Scroll to select hour and minute</Text>

        <View style={modal.drumsRow}>
          <DrumColumn data={HOURS}   selectedIndex={hourIdx}   onSelect={setHourIdx}   label="Hour" />
          <Text style={modal.colon}>:</Text>
          <DrumColumn data={MINUTES} selectedIndex={minuteIdx} onSelect={setMinuteIdx} label="Min"  />
        </View>

        <View style={modal.preview}>
          <Clock size={16} color="#059669" />
          <Text style={modal.previewText}>
            {HOURS[hourIdx]}:{MINUTES[minuteIdx]}
          </Text>
        </View>

        <View style={modal.actions}>
          <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modal.confirmBtn} onPress={handleConfirm}>
            <Check size={18} color="#fff" />
            <Text style={modal.confirmText}>Add Time</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AddMedicationScreen() {
  const navigation   = useNavigation();
  const route        = useRoute();
  const { refresh }  = useRemindersContext();
  const medicationId = (route.params as { medicationId?: string })?.medicationId;
  const isEditing    = !!medicationId;

  const [loading,        setLoading]        = useState(false);
  const [doseTimes,      setDoseTimes]      = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userId,         setUserId]         = useState<number | null>(null);

  const { control, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      name:          '',
      dosage:        '',
      frequency:     'ONCE_DAILY',
      start_date:    new Date().toISOString().split('T')[0],
      duration_days: '',
      instructions:  '',
      form:          'TABLET',
    },
  });

  const selectedForm = watch('form');
  const startDate    = watch('start_date');

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
      setValue('name',          med.name);
      setValue('dosage',        med.dosage);
      setValue('frequency',     med.frequency);
      setValue('start_date',    med.start_date);
      setValue('duration_days', med.duration_days?.toString() || '');
      setValue('instructions',  med.instructions || '');
      setValue('form',          med.form || 'TABLET');
      const schedules = await medicationsAPI.getSchedules(med.id);
      setDoseTimes(schedules.map((s: any) => s.time));
    } catch {
      Alert.alert('Error', 'Could not load medication details.');
    }
  };

  const onSubmit = async (data: any) => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = {
        ...data,
        patient:       userId,
        duration_days: data.duration_days ? parseInt(data.duration_days) : undefined,
      };
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
    } catch {
      Alert.alert('Error', 'Failed to save medication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Update Plan' : 'New Medication'}
          </Text>
          <Text style={styles.headerSub}>Set up your schedule accurately</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── General Info ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>General Info</Text>

            {/* Medicine Name */}
            <Controller
              control={control}
              rules={{ required: 'Name is required' }}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Pill size={18} color="#059669" style={styles.icon} />
                  <TextInput
                    placeholder="Medicine Name"
                    placeholderTextColor="#94a3b8"   // ✅ visible placeholder
                    value={value}
                    onChangeText={onChange}
                    style={styles.input}
                  />
                </View>
              )}
            />

            {/* Strength / Dosage */}
            <Controller
              control={control}
              name="dosage"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Activity size={18} color="#059669" style={styles.icon} />
                  <TextInput
                    placeholder="Strength (e.g. 500mg)"
                    placeholderTextColor="#94a3b8"   // ✅ visible placeholder
                    value={value}
                    onChangeText={onChange}
                    style={styles.input}
                  />
                </View>
              )}
            />

            {/* Duration Days */}
            <Controller
              control={control}
              name="duration_days"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Calendar size={18} color="#059669" style={styles.icon} />
                  <TextInput
                    placeholder="Duration (days, optional)"
                    placeholderTextColor="#94a3b8"   // ✅ visible placeholder
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              )}
            />

            {/* Instructions */}
            <Controller
              control={control}
              name="instructions"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.textAreaGroup]}>
                  <TextInput
                    placeholder="Instructions (e.g. take after food)"
                    placeholderTextColor="#94a3b8"   // ✅ visible placeholder
                    value={value}
                    onChangeText={onChange}
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              )}
            />
          </View>

          {/* ── Medicine Form ── */}
          <Text style={styles.sectionTitleOutside}>Medicine Form</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.formScroll}
          >
            {FORMS.map((f) => (
              <TouchableOpacity
                key={f.label}
                onPress={() => setValue('form', f.label.toUpperCase())}
                style={[
                  styles.formChip,
                  selectedForm === f.label.toUpperCase() && styles.formChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.formText,
                    selectedForm === f.label.toUpperCase() && styles.formTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Schedule & Timing ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Schedule & Timing</Text>

            {/* Start Date */}
            <TouchableOpacity
              style={styles.rowPicker}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.rowLabel}>
                <Calendar size={18} color="#059669" />
                <Text style={styles.rowText}>Start Date</Text>
              </View>
              <Text style={styles.rowValue}>{startDate}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Frequency */}
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
                    <Picker.Item label="Once Daily"  value="ONCE_DAILY"  />
                    <Picker.Item label="Twice Daily" value="TWICE_DAILY" />
                    <Picker.Item label="As Needed"   value="AS_NEEDED"   />
                  </Picker>
                )}
              />
            </View>
          </View>

          {/* ── Reminder Times ── */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Reminder Times</Text>
              {!isEditing && (
                <TouchableOpacity
                  style={styles.addTimeBtn}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addTimeBtnText}>Add Time</Text>
                </TouchableOpacity>
              )}
            </View>

            {doseTimes.length === 0 && !isEditing && (
              <View style={styles.emptyTimes}>
                <Clock size={28} color="#d1fae5" />
                <Text style={styles.emptyTimesText}>No times added yet</Text>
              </View>
            )}

            {doseTimes.map((time, idx) => (
              <View key={idx} style={styles.timeTag}>
                <View style={styles.timeTagLeft}>
                  <Clock size={16} color="#059669" />
                  <Text style={styles.timeTagText}>{time}</Text>
                </View>
                {!isEditing && (
                  <TouchableOpacity
                    style={styles.deleteTimeBtn}
                    onPress={() =>
                      setDoseTimes((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {isEditing && (
              <View style={styles.infoBox}>
                <Info size={14} color="#64748b" />
                <Text style={styles.infoText}>
                  Times cannot be modified while editing.
                </Text>
              </View>
            )}
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Save Changes' : 'Create Reminder'}
                </Text>
                <Check size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Native date picker */}
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={new Date(startDate)}
          onChange={(e, d) => {
            setShowDatePicker(false);
            if (d) setValue('start_date', d.toISOString().split('T')[0]);
          }}
        />
      )}

      {/* Custom time picker */}
      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={(time) => setDoseTimes((prev) => [...prev, time])}
      />
    </SafeAreaView>
  );
}

// ─── Drum styles ──────────────────────────────────────────────────────────────
const drum = StyleSheet.create({
  col: { flex: 1, alignItems: 'center' },
  label: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  highlight: {
    position: 'absolute',
    top: 28 + ITEM_HEIGHT * 2,
    left: 8, right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT, justifyContent: 'center',
    alignItems: 'center', width: 90,
  },
  itemText: {
    fontSize: 28, fontWeight: '300', color: '#cbd5e1',
    fontVariant: ['tabular-nums'],
  },
  itemTextActive: {
    fontSize: 32, fontWeight: '800', color: '#059669',
  },
});

// ─── Modal styles ─────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  sub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  drumsRow: {
    flexDirection: 'row', alignItems: 'center',
    height: PICKER_H + 36, marginBottom: 8,
  },
  colon: {
    fontSize: 36, fontWeight: '800', color: '#059669',
    marginBottom: 20, marginHorizontal: 4,
  },
  preview: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#f0fdf4', paddingVertical: 10,
    borderRadius: 12, marginBottom: 20,
  },
  previewText: {
    fontSize: 22, fontWeight: '800', color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#f1f5f9', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#064e3b', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fcfcfc' },
  header:       { padding: 20, backgroundColor: '#fff' },
  headerTitle:  { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  headerSub:    { fontSize: 14, color: '#64748b', marginTop: 4 },
  scrollContent: { padding: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#1e293b',
    textTransform: 'uppercase', marginBottom: 16,
  },
  sectionTitleOutside: {
    fontSize: 13, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', marginBottom: 12, marginLeft: 4,
  },

  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 12,
    paddingHorizontal: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  textAreaGroup: { alignItems: 'flex-start', paddingTop: 12 },
  icon:  { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 0 },

  formScroll:     { marginBottom: 25 },
  formChip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  formChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  formText:       { fontSize: 14, fontWeight: '600', color: '#64748b' },
  formTextActive: { color: '#fff' },

  rowPicker: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText:  { fontSize: 16, fontWeight: '600', color: '#334155' },
  rowValue: { fontSize: 16, color: '#10b981', fontWeight: '700' },
  divider:  { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  rowBetween: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },

  addTimeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#059669', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 10,
  },
  addTimeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyTimes:     { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyTimesText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

  timeTag: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', padding: 14,
    borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  timeTagLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeTagText: {
    fontSize: 18, fontWeight: '800', color: '#166534',
    fontVariant: ['tabular-nums'],
  },
  deleteTimeBtn: { padding: 6, borderRadius: 8, backgroundColor: '#fef2f2' },

  infoBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginTop: 4,
  },
  infoText: { fontSize: 12, color: '#64748b', flex: 1 },

  saveBtn: {
    backgroundColor: '#064e3b', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12,
    marginTop: 10, marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});