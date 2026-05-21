// import React, { useState, useEffect, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   Alert,
//   ActivityIndicator,
//   Modal,
//   TextInput,
//   ScrollView,
//   Platform,
//   StatusBar,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { doctorsAPI } from '../../services/api';
// import { Picker } from '@react-native-picker/picker';
// import DateTimePicker from '@react-native-community/datetimepicker';

// // Define slot colors to differentiate morning/evening
// const getSlotColor = (time: string) => {
//   const hour = parseInt(time.split(':')[0], 10);
//   if (hour < 12) return '#10b981'; // Morning - Green
//   if (hour < 17) return '#f59e0b'; // Afternoon - Orange
//   return '#6366f1'; // Evening - Indigo
// };

// export default function SetAvailabilityScreen({ navigation }: any) {
//   const [availability, setAvailability] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [doctorId, setDoctorId] = useState<number | null>(null);

//   // Form State
//   const [selectedDay, setSelectedDay] = useState(0);
//   const [startTime, setStartTime] = useState('09:00');
//   const [endTime, setEndTime] = useState('17:00');
//   const [slotDuration, setSlotDuration] = useState('30');
//   const [showStartPicker, setShowStartPicker] = useState(false);
//   const [showEndPicker, setShowEndPicker] = useState(false);

//   const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//   const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

//   const loadInitialData = useCallback(async () => {
//     try {
//       const profile = await doctorsAPI.getMyProfile();
//       setDoctorId(profile.id);
//       const data = await doctorsAPI.getAvailability(profile.id);
//       setAvailability(data);
//     } catch (error) {
//       Alert.alert('Profile Required', 'Please complete your doctor profile to set availability.');
//       navigation.goBack();
//     } finally {
//       setLoading(false);
//     }
//   }, [navigation]);

//   useEffect(() => {
//     loadInitialData();
//   }, [loadInitialData]);

//   const handleAddSlot = async () => {
//     if (startTime >= endTime) {
//       Alert.alert('Invalid Time', 'End time must be later than start time.');
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const payload = {
//         day_of_week: selectedDay,
//         start_time: startTime,
//         end_time: endTime,
//         slot_duration: parseInt(slotDuration, 10),
//         is_active: true,
//       };
//       await doctorsAPI.addAvailability(payload);
//       setModalVisible(false);
//       if (doctorId) {
//         const updated = await doctorsAPI.getAvailability(doctorId);
//         setAvailability(updated);
//       }
//     } catch (error: any) {
//       Alert.alert('Error', error.response?.data?.detail || 'Could not add slot');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const renderSlot = ({ item }: { item: any }) => (
//     <View style={styles.modernSlotCard}>
//       <View style={[styles.timeIndicator, { backgroundColor: getSlotColor(item.start_time) }]} />
//       <View style={styles.slotMain}>
//         <View style={styles.slotTimeRow}>
//           <Icon name="time-outline" size={16} color="#64748b" />
//           <Text style={styles.timeRangeText}>
//             {item.start_time.slice(0, 5)} — {item.end_time.slice(0, 5)}
//           </Text>
//         </View>
//         <View style={styles.tagRow}>
//           <View style={styles.durationTag}>
//             <Text style={styles.tagText}>{item.slot_duration} min slots</Text>
//           </View>
//           <View style={styles.dayTag}>
//             <Text style={styles.tagText}>{FULL_DAYS[item.day_of_week]}</Text>
//           </View>
//         </View>
//       </View>
//       <TouchableOpacity style={styles.trashBtn}>
//         <Icon name="trash-outline" size={20} color="#ef4444" />
//       </TouchableOpacity>
//     </View>
//   );

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="dark-content" />
//       <SafeAreaView edges={['top']} style={styles.header}>
//         <View style={styles.navRow}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.roundBtn}>
//             <Icon name="chevron-back" size={24} color="#1e293b" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Schedule</Text>
//           <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
//             <Icon name="add" size={24} color="#fff" />
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>

//       {loading ? (
//         <View style={styles.centered}><ActivityIndicator color="#10b981" /></View>
//       ) : (
//         <FlatList
//           data={availability}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={renderSlot}
//           contentContainerStyle={styles.listContainer}
//           ListEmptyComponent={
//             <View style={styles.emptyState}>
//               <Icon name="calendar-outline" size={64} color="#cbd5e1" />
//               <Text style={styles.emptyText}>No active working hours set</Text>
//               <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
//                 <Text style={styles.emptyAddText}>Add Your First Slot</Text>
//               </TouchableOpacity>
//             </View>
//           }
//         />
//       )}

//       {/* Modern Add Slot Modal */}
//       <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
//         <SafeAreaView style={styles.modalBody}>
//           <View style={styles.modalHeader}>
//             <Text style={styles.modalTitle}></Text>
//             <TouchableOpacity onPress={() => setModalVisible(false)}>
//               <Text style={styles.closeText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView style={styles.modalScroll}>
//             <Text style={styles.sectionLabel}>Select Day</Text>
//             <View style={styles.dayPicker}>
//               {DAYS_OF_WEEK.map((day, index) => (
//                 <TouchableOpacity
//                   key={day}
//                   onPress={() => setSelectedDay(index)}
//                   style={[styles.dayCircle, selectedDay === index && styles.dayCircleActive]}
//                 >
//                   <Text style={[styles.dayLetter, selectedDay === index && styles.dayLetterActive]}>{day}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <View style={styles.timeInputRow}>
//               <View style={{ flex: 1 }}>
//                 <Text style={styles.sectionLabel}>Starts</Text>
//                 <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.timePickerBtn}>
//                   <Icon name="play-outline" size={18} color="#10b981" />
//                   <Text style={styles.timePickerText}>{startTime}</Text>
//                 </TouchableOpacity>
//               </View>
//               <View style={{ width: 20 }} />
//               <View style={{ flex: 1 }}>
//                 <Text style={styles.sectionLabel}>Ends</Text>
//                 <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.timePickerBtn}>
//                   <Icon name="stop-outline" size={18} color="#ef4444" />
//                   <Text style={styles.timePickerText}>{endTime}</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             <Text style={styles.sectionLabel}>Duration per Patient (mins)</Text>
//             <View style={styles.durationRow}>
//               {['15', '30', '45', '60'].map((d) => (
//                 <TouchableOpacity
//                   key={d}
//                   onPress={() => setSlotDuration(d)}
//                   style={[styles.durationChip, slotDuration === d && styles.durationChipActive]}
//                 >
//                   <Text style={[styles.durationChipText, slotDuration === d && styles.durationChipTextActive]}>{d}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>

//             <TouchableOpacity
//               style={[styles.mainSaveBtn, submitting && { opacity: 0.7 }]}
//               onPress={handleAddSlot}
//               disabled={submitting}
//             >
//               {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainSaveText}>Save Schedule</Text>}
//             </TouchableOpacity>
//           </ScrollView>
//         </SafeAreaView>

//         {/* Start Picker Modal (Android logic handled via DateTimePicker directly) */}
//         {showStartPicker && (
//           <DateTimePicker
//             mode="time"
//             value={new Date()}
//             onChange={(e, date) => {
//               setShowStartPicker(false);
//               if (date) setStartTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
//             }}
//           />
//         )}
//         {showEndPicker && (
//           <DateTimePicker
//             mode="time"
//             value={new Date()}
//             onChange={(e, date) => {
//               setShowEndPicker(false);
//               if (date) setEndTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
//             }}
//           />
//         )}
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#f8fafc' },
//   centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
//   navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
//   headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
//   roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
//   addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
//   listContainer: { padding: 20 },
//   modernSlotCard: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     padding: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#f1f5f9',
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//   },
//   timeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
//   slotMain: { flex: 1 },
//   slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
//   timeRangeText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
//   tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
//   durationTag: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
//   dayTag: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
//   tagText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
//   trashBtn: { padding: 8 },

//   emptyState: { alignItems: 'center', marginTop: 100 },
//   emptyText: { fontSize: 16, color: '#94a3b8', marginTop: 12, fontWeight: '500' },
//   emptyAddBtn: { marginTop: 20, backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
//   emptyAddText: { color: '#fff', fontWeight: '700' },

//   // Modal Styles
//   modalBody: { flex: 1, backgroundColor: '#fff' },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
//   modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
//   closeText: { color: '#ef4444', fontWeight: '600' },
//   modalScroll: { padding: 20 },
//   sectionLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, marginTop: 20 },
  
//   dayPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
//   dayCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
//   dayCircleActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
//   dayLetter: { fontSize: 12, fontWeight: '700', color: '#64748b' },
//   dayLetterActive: { color: '#fff' },

//   timeInputRow: { flexDirection: 'row' },
//   timePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
//   timePickerText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

//   durationRow: { flexDirection: 'row', gap: 10 },
//   durationChip: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
//   durationChipActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
//   durationChipText: { fontWeight: '700', color: '#64748b' },
//   durationChipTextActive: { color: '#fff' },

//   mainSaveBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 40, elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10 },
//   mainSaveText: { color: '#fff', fontSize: 16, fontWeight: '800' }
// });


import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { doctorsAPI } from '../../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getSlotColor = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return '#10b981';
  if (hour < 17) return '#f59e0b';
  return '#6366f1';
};

// ─── Drum Scroll Wheel ───────────────────────────────────────────────────────

interface WheelProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}

function DrumWheel({ items, selectedIndex, onSelect, label }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    // Scroll to selected on mount/change
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onSelect(clamped);
    // Snap exactly
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={wheelStyles.wrapper}>
      <Text style={wheelStyles.label}>{label}</Text>
      <View style={wheelStyles.container}>
        {/* Top + bottom gradient overlays */}
        <View style={[wheelStyles.fade, wheelStyles.fadeTop]} pointerEvents="none" />
        <View style={[wheelStyles.fade, wheelStyles.fadeBottom]} pointerEvents="none" />
        {/* Selection highlight */}
        <View style={wheelStyles.highlight} pointerEvents="none" />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          }}
          scrollEventThrottle={16}
        >
          {items.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(i);
                  scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
                }}
                style={wheelStyles.item}
              >
                <Text
                  style={[
                    wheelStyles.itemText,
                    isSelected && wheelStyles.itemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  container: {
    height: WHEEL_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: '#10b98115',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10b98140',
    zIndex: 1,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 2,
  },
  fadeTop: {
    top: 0,
    // Simulated gradient via backgroundColor with opacity layers
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  fadeBottom: {
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 26,
    fontWeight: '300',
    color: '#c8d6e5',
    letterSpacing: 1,
  },
  itemTextSelected: {
    fontSize: 30,
    fontWeight: '700',
    color: '#10b981',
  },
});

// ─── Time Picker Modal ───────────────────────────────────────────────────────

interface TimePickerProps {
  visible: boolean;
  value: string;       // "HH:MM"
  title: string;
  accentColor?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

function TimePickerModal({
  visible,
  value,
  title,
  accentColor = '#10b981',
  onConfirm,
  onCancel,
}: TimePickerProps) {
  const initialHour = parseInt(value.split(':')[0], 10);
  const initialMinuteRaw = parseInt(value.split(':')[1], 10);
  const initialMinuteIndex = Math.round(initialMinuteRaw / 5);

  const [hourIndex, setHourIndex] = useState(initialHour);
  const [minuteIndex, setMinuteIndex] = useState(initialMinuteIndex);

  // Reset when opened
  useEffect(() => {
    if (visible) {
      setHourIndex(parseInt(value.split(':')[0], 10));
      setMinuteIndex(Math.round(parseInt(value.split(':')[1], 10) / 5));
    }
  }, [visible]);

  const handleConfirm = () => {
    const h = HOURS[hourIndex] ?? '00';
    const m = MINUTES[minuteIndex] ?? '00';
    onConfirm(`${h}:${m}`);
  };

  const displayTime = `${HOURS[hourIndex] ?? '00'}:${MINUTES[minuteIndex] ?? '00'}`;
  const hour24 = parseInt(HOURS[hourIndex] ?? '0', 10);
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={tpStyles.overlay}>
        <View style={tpStyles.sheet}>
          {/* Header */}
          <View style={tpStyles.header}>
            <TouchableOpacity onPress={onCancel} style={tpStyles.cancelTouchable}>
              <Text style={tpStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={tpStyles.headerTitle}>{title}</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[tpStyles.doneTouchable, { backgroundColor: accentColor }]}
            >
              <Text style={tpStyles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Live Preview */}
          <View style={tpStyles.preview}>
            <Text style={[tpStyles.previewTime, { color: accentColor }]}>
              {hour12}:{MINUTES[minuteIndex] ?? '00'}
            </Text>
            <View style={[tpStyles.periodBadge, { backgroundColor: accentColor + '20' }]}>
              <Text style={[tpStyles.periodText, { color: accentColor }]}>{period}</Text>
            </View>
          </View>

          {/* Wheels */}
          <View style={tpStyles.wheelsRow}>
            <DrumWheel
              items={HOURS}
              selectedIndex={hourIndex}
              onSelect={setHourIndex}
              label="Hour"
            />

            <View style={tpStyles.colonContainer}>
              <Text style={tpStyles.colonDot}>•</Text>
              <Text style={tpStyles.colonDot}>•</Text>
            </View>

            <DrumWheel
              items={MINUTES}
              selectedIndex={minuteIndex}
              onSelect={setMinuteIndex}
              label="Minute"
            />
          </View>

          {/* Period pill row */}
          <View style={tpStyles.periodRow}>
            {['AM', 'PM'].map((p) => {
              const active = p === period;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    tpStyles.periodPill,
                    active && { backgroundColor: accentColor },
                  ]}
                  onPress={() => {
                    const current = parseInt(HOURS[hourIndex] ?? '0', 10);
                    if (p === 'AM' && current >= 12) setHourIndex(current - 12);
                    if (p === 'PM' && current < 12) setHourIndex(current + 12);
                  }}
                >
                  <Text
                    style={[
                      tpStyles.periodPillText,
                      active && { color: '#fff' },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  cancelTouchable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  doneTouchable: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  doneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  previewTime: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -1,
  },
  periodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  colonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 4,
    marginTop: 24,
  },
  colonDot: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '900',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  periodPillText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#94a3b8',
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

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
        <View style={styles.centered}>
          <ActivityIndicator color="#10b981" />
        </View>
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
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyAddText}>Add Your First Slot</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add Slot Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalBody}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Schedule</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* Day Selector */}
            <Text style={styles.sectionLabel}>Select Day</Text>
            <View style={styles.dayPicker}>
              {DAYS_OF_WEEK.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(index)}
                  style={[
                    styles.dayCircle,
                    selectedDay === index && styles.dayCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLetter,
                      selectedDay === index && styles.dayLetterActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Row */}
            <Text style={styles.sectionLabel}>Working Hours</Text>
            <View style={styles.timeInputRow}>
              <TouchableOpacity
                style={styles.timeCard}
                onPress={() => setShowStartPicker(true)}
              >
                <View style={styles.timeCardInner}>
                  <Icon name="play-circle" size={18} color="#10b981" />
                  <Text style={styles.timeCardLabel}>Start</Text>
                </View>
                <Text style={styles.timeCardValue}>{startTime}</Text>
              </TouchableOpacity>

              <View style={styles.timeSeparator}>
                <Icon name="arrow-forward" size={16} color="#cbd5e1" />
              </View>

              <TouchableOpacity
                style={styles.timeCard}
                onPress={() => setShowEndPicker(true)}
              >
                <View style={styles.timeCardInner}>
                  <Icon name="stop-circle" size={18} color="#ef4444" />
                  <Text style={styles.timeCardLabel}>End</Text>
                </View>
                <Text style={styles.timeCardValue}>{endTime}</Text>
              </TouchableOpacity>
            </View>

            {/* Slot Duration */}
            <Text style={styles.sectionLabel}>Duration per Patient (mins)</Text>
            <View style={styles.durationRow}>
              {['15', '30', '45', '60'].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSlotDuration(d)}
                  style={[
                    styles.durationChip,
                    slotDuration === d && styles.durationChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      slotDuration === d && styles.durationChipTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.mainSaveBtn, submitting && { opacity: 0.7 }]}
              onPress={handleAddSlot}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainSaveText}>Save Schedule</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Custom Time Pickers */}
      <TimePickerModal
        visible={showStartPicker}
        value={startTime}
        title="Start Time"
        accentColor="#10b981"
        onConfirm={(t) => { setStartTime(t); setShowStartPicker(false); }}
        onCancel={() => setShowStartPicker(false)}
      />
      <TimePickerModal
        visible={showEndPicker}
        value={endTime}
        title="End Time"
        accentColor="#ef4444"
        onConfirm={(t) => { setEndTime(t); setShowEndPicker(false); }}
        onCancel={() => setShowEndPicker(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  roundBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center', alignItems: 'center',
  },

  listContainer: { padding: 20 },
  modernSlotCard: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
  },
  timeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 15 },
  slotMain: { flex: 1 },
  slotTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeRangeText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  durationTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  dayTag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  tagText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  trashBtn: { padding: 8 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#94a3b8', marginTop: 12, fontWeight: '500' },
  emptyAddBtn: {
    marginTop: 20, backgroundColor: '#10b981',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyAddText: { color: '#fff', fontWeight: '700' },

  modalBody: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  closeText: { color: '#ef4444', fontWeight: '600' },
  modalScroll: { padding: 20 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', marginBottom: 12, marginTop: 20,
    letterSpacing: 0.5,
  },

  dayPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dayCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  dayCircleActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  dayLetter: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  dayLetterActive: { color: '#fff' },

  // Improved time row cards
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  timeCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 6,
  },
  timeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  timeSeparator: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  durationRow: { flexDirection: 'row', gap: 10 },
  durationChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#f8fafc', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  durationChipActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  durationChipText: { fontWeight: '700', color: '#64748b' },
  durationChipTextActive: { color: '#fff' },

  mainSaveBtn: {
    backgroundColor: '#10b981', padding: 18, borderRadius: 16,
    alignItems: 'center', marginTop: 40,
    elevation: 4,
    shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10,
  },
  mainSaveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});