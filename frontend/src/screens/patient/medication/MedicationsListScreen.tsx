import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../../navigation/types';
import { medicationsAPI } from '../../../services/api';
import {
  Pill,
  Heart,
  CheckCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Plus,
  FileText,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  X,
  Award,
  MessageCircle,
} from 'lucide-react-native';

type MedicationsListNavigationProp = NativeStackNavigationProp<PatientStackParamList>;

interface Medication {
  id: number;
  name: string;
  dosage: string;
  form_display: string;
  frequency_display: string;
  is_refill_needed?: boolean;
  next_dose_time?: { time: string; date: string };
}

interface Stats {
  active_medications: number;
  doses_taken_today: number;
  doses_missed_today: number;
  adherence_rate: number;
}

interface TodayDose {
  medication_id: number;
  medication_name: string;
  dosage: string;
  schedule_id: number;
  time: string;
  dosage_count: number;
  instructions: string;
  status: string;
  status_display?: string;
  actual_time: string | null;
  log_id: number | null;
  can_update: boolean;
}

type LogStatus = 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

const formatTimeForAPI = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm   = pad(date.getMonth() + 1);
  const dd   = pad(date.getDate());
  const hh   = pad(date.getHours());
  const min  = pad(date.getMinutes());
  const ss   = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; label: string; border: string; text: string }> = {
  TAKEN:   { bg: '#f0fdf4', label: 'Taken',   border: '#bbf7d0', text: '#16a34a' },
  MISSED:  { bg: '#fff5f5', label: 'Missed',  border: '#fecaca', text: '#dc2626' },
  SKIPPED: { bg: '#fff7ed', label: 'Skipped', border: '#fed7aa', text: '#ea580c' },
  DELAYED: { bg: '#fffbeb', label: 'Delayed', border: '#fde68a', text: '#d97706' },
  PENDING: { bg: '#eff6ff', label: 'Pending', border: '#bfdbfe', text: '#2563eb' },
};

const getStatusConfig = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.PENDING;

// ─── UPDATE STATUS MODAL ───────────────────────────────────────────────────────

interface UpdateModalProps {
  visible: boolean;
  dose: TodayDose | null;
  onClose: () => void;
  onUpdate: (logId: number, status: LogStatus, dose: TodayDose) => Promise<void>;
}

function UpdateStatusModal({ visible, dose, onClose, onUpdate }: UpdateModalProps) {
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<LogStatus>('TAKEN');

  const options: { value: LogStatus; label: string; desc: string }[] = [
    { value: 'TAKEN',   label: 'Mark as Taken',   desc: 'I took this dose' },
    { value: 'SKIPPED', label: 'Mark as Skipped',  desc: 'Intentionally skipped' },
    { value: 'DELAYED', label: 'Mark as Delayed',  desc: 'Will take it soon' },
    { value: 'MISSED',  label: 'Keep as Missed',   desc: 'Did not take this dose' },
  ];

  const handleConfirm = async () => {
    if (!dose) return;
    setLoading(true);
    try {
      if (dose.log_id) {
        await onUpdate(dose.log_id, selected, dose);
      } else {
        await onUpdate(-1, selected, dose);
      }
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data
        ? JSON.stringify(error.response.data)
        : 'Failed to update. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <View style={{ flex: 1 }}>
              <Text style={modal.title}>Update Dose Status</Text>
              {dose && (
                <Text style={modal.sub}>
                  {dose.medication_name}  •  {dose.time}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={modal.options}>
            {options.map((opt) => {
              const isSelected = selected === opt.value;
              const cfg = getStatusConfig(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    modal.option,
                    isSelected && { borderColor: cfg.text, backgroundColor: cfg.bg },
                  ]}
                  onPress={() => setSelected(opt.value)}
                  activeOpacity={0.75}
                >
                  <View style={[modal.swatch, { backgroundColor: cfg.text }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[modal.optionLabel, isSelected && { color: cfg.text }]}>
                      {opt.label}
                    </Text>
                    <Text style={modal.optionDesc}>{opt.desc}</Text>
                  </View>
                  {isSelected && (
                    <View style={[modal.selectedDot, { backgroundColor: cfg.text }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[modal.confirm, { backgroundColor: getStatusConfig(selected).text }, loading && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={modal.confirmText}>Confirm</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── COURSE COMPLETE MODAL ────────────────────────────────────────────────────

interface CompleteModalProps {
  visible: boolean;
  medName: string;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  onClose: () => void;
}

function CourseCompleteModal({ visible, medName, scaleAnim, opacityAnim, onClose }: CompleteModalProps) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[completed.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[completed.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={completed.topBar} />
          <View style={completed.iconRing}>
            <Award size={34} color="#16a34a" />
          </View>
          <Text style={completed.title}>Course Complete</Text>
          <View style={completed.nameBadge}>
            <Text style={completed.nameBadgeText}>{medName}</Text>
          </View>
          <Text style={completed.body}>
            You have finished every dose for this medication. It has been removed from your active list.
          </Text>
          <View style={completed.adherenceRow}>
            <CheckCircle size={15} color="#16a34a" />
            <Text style={completed.adherenceText}>100% adherence this course</Text>
          </View>
          <TouchableOpacity style={completed.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={completed.btnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function MedicationsListScreen() {
  const navigation = useNavigation<MedicationsListNavigationProp>();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayDoses, setTodayDoses]   = useState<TodayDose[]>([]);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [markingId, setMarkingId]     = useState<number | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDose, setSelectedDose] = useState<TodayDose | null>(null);

  const [completeVisible, setCompleteVisible]   = useState(false);
  const [completedMedName, setCompletedMedName] = useState('');
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const [medsRes, statsRes, dosesRes] = await Promise.all([
        medicationsAPI.getMyMedications(),
        medicationsAPI.getStats(),
        medicationsAPI.getTodaysDoses(),
      ]);

      const meds: Medication[]  = Array.isArray(medsRes)  ? medsRes  : (medsRes  as any).medications ?? [];
      const statsData: Stats    = (statsRes as any)?.active_medications !== undefined ? statsRes as any : (statsRes as any)?.stats ?? null;
      const doses: TodayDose[]  = Array.isArray(dosesRes) ? dosesRes : (dosesRes as any).doses ?? [];

      setMedications(meds);
      setStats(statsData);
      setTodayDoses(doses);
    } catch {
      Alert.alert('Error', 'Failed to load medications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getDosesForMed = (medicationId: number): TodayDose[] =>
    todayDoses.filter(d => d.medication_id === medicationId);

  const showCompleteModal = (name: string) => {
    setCompletedMedName(name);
    setCompleteVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, bounciness: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeCompleteModal = () => {
    Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: true })
      .start(() => { setCompleteVisible(false); scaleAnim.setValue(0.88); });
  };

  const handleQuickMarkTaken = async (dose: TodayDose) => {
    setMarkingId(dose.schedule_id);
    try {
      const response = await medicationsAPI.log(dose.medication_id, {
        scheduled_date: getTodayDate(),
        scheduled_time: dose.time,
        status:         'TAKEN',
        actual_time:    formatTimeForAPI(new Date()),
        dosage_taken:   dose.dosage_count,
      });
      if (response?.auto_completed) showCompleteModal(dose.medication_name);
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data
        ? JSON.stringify(error.response.data)
        : 'Failed to mark dose.');
    } finally {
      setMarkingId(null);
    }
  };

  const openUpdateModal = (dose: TodayDose) => {
    setSelectedDose(dose);
    setModalVisible(true);
  };

  const handleUpdateStatus = async (logId: number, newStatus: LogStatus, dose: TodayDose) => {
    try {
      let response: any;
      if (logId === -1) {
        response = await medicationsAPI.log(dose.medication_id, {
          scheduled_date: getTodayDate(),
          scheduled_time: dose.time,
          status:         newStatus,
          actual_time:    newStatus === 'TAKEN' ? formatTimeForAPI(new Date()) : undefined,
          dosage_taken:   dose.dosage_count,
        });
      } else {
        response = await medicationsAPI.updateLog(logId, { status: newStatus });
      }
      if (response?.auto_completed) showCompleteModal(dose.medication_name);
      await loadData();
    } catch (error: any) {
      throw error;
    }
  };

  // ─── Dose pills ────────────────────────────────────────────────────────────

  const renderDosePills = (medId: number) => {
    const doses = getDosesForMed(medId);
    if (doses.length === 0) return null;

    return (
      <View style={styles.doseSection}>
        <View style={styles.doseDivider} />
        {doses.map((dose) => {
          const cfg       = getStatusConfig(dose.status);
          const isTaken   = dose.status === 'TAKEN';
          const isPending = dose.status === 'PENDING';
          const isMarking = markingId === dose.schedule_id;

          return (
            <View key={dose.schedule_id} style={styles.doseRow}>
              <View style={styles.doseLeft}>
                <Clock size={12} color={cfg.text} />
                <Text style={[styles.doseTime, { color: cfg.text }]}>{dose.time}</Text>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Text style={[styles.statusPillText, { color: cfg.text }]}>
                    {dose.status_display || cfg.label}
                  </Text>
                </View>
              </View>

              <View style={styles.doseRight}>
                {isPending && (
                  <TouchableOpacity
                    style={[styles.doseActionBtn, styles.takenBtn, isMarking && styles.loadingBtn]}
                    onPress={() => handleQuickMarkTaken(dose)}
                    disabled={isMarking}
                    activeOpacity={0.8}
                  >
                    {isMarking
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <CheckCircle2 size={13} color="#fff" />
                          <Text style={styles.doseActionText}>Mark Taken</Text>
                        </>
                    }
                  </TouchableOpacity>
                )}

                {(dose.status === 'MISSED' || dose.status === 'DELAYED' || dose.status === 'SKIPPED') && (
                  <TouchableOpacity
                    style={[styles.doseActionBtn, styles.updateBtn]}
                    onPress={() => openUpdateModal(dose)}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={12} color="#dc2626" />
                    <Text style={styles.updateBtnText}>
                      {dose.status === 'MISSED' ? 'Took it?' : 'Update'}
                    </Text>
                  </TouchableOpacity>
                )}

                {isTaken && (
                  <TouchableOpacity onPress={() => openUpdateModal(dose)}>
                    <CheckCircle size={22} color="#16a34a" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Medication card ───────────────────────────────────────────────────────

  const renderMedicationItem = ({ item }: { item: Medication }) => {
    const doses     = getDosesForMed(item.id);
    const hasMissed = doses.some(d => d.status === 'MISSED');
    const allTaken  = doses.length > 0 && doses.every(d => d.status === 'TAKEN');

    return (
      <View style={[styles.medCard, hasMissed && styles.medCardMissed, allTaken && styles.medCardDone]}>
        <TouchableOpacity
          style={styles.medCardBody}
          onPress={() => navigation.navigate('MedicationDetail', { medicationId: item.id })}
          activeOpacity={0.85}
        >
          <View style={[
            styles.medIconWrapper,
            allTaken  && { backgroundColor: '#dcfce7' },
            hasMissed && { backgroundColor: '#fff5f5' },
          ]}>
            <Pill size={22} color={hasMissed ? '#dc2626' : '#16a34a'} />
          </View>

          <View style={styles.medMainInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.medTitle}>{item.name}</Text>
              {item.is_refill_needed && <View style={styles.refillDot} />}
              {hasMissed && (
                <View style={styles.missedBadge}>
                  <AlertTriangle size={10} color="#dc2626" />
                  <Text style={styles.missedBadgeText}>Missed</Text>
                </View>
              )}
            </View>
            <Text style={styles.medSubtitle}>{item.dosage}  •  {item.form_display}</Text>
            <View style={styles.freqTag}>
              <Clock size={11} color="#16a34a" />
              <Text style={styles.freqTagText}>{item.frequency_display}</Text>
            </View>
          </View>

          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {renderDosePills(item.id)}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.mainContainer}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingText}>My Health</Text>
            <Text style={styles.largeTitle}>Medicines</Text>
          </View>

          {/* Action buttons row */}
          <View style={styles.headerActions}>

            {/* ← NEW: AI Chat button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Chat')}
              style={styles.chatBtn}
              activeOpacity={0.8}
            >
              <MessageCircle size={20} color="#16a34a" />
              <Text style={styles.chatBtnLabel}>Ask AI</Text>
            </TouchableOpacity>

            {/* Existing: Add medication button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('AddMedication', {})}
              style={styles.fabHeader}
            >
              <Plus size={22} color="#fff" />
            </TouchableOpacity>

          </View>
        </View>

        <FlatList
          data={medications}
          renderItem={renderMedicationItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          ListHeaderComponent={
            <>
              {/* Stats row */}
              {stats && (
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: '#fff' }]}>
                    <Heart size={18} color="#16a34a" />
                    <Text style={styles.statNum}>{stats.active_medications}</Text>
                    <Text style={styles.statDesc}>Active</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: '#16a34a' }]}>
                    <TrendingUp size={18} color="#fff" />
                    <Text style={[styles.statNum, { color: '#fff' }]}>{stats.adherence_rate}%</Text>
                    <Text style={[styles.statDesc, { color: '#dcfce7' }]}>Adherence</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: '#fff' }]}>
                    <CheckCircle size={18} color="#16a34a" />
                    <Text style={styles.statNum}>{stats.doses_taken_today}</Text>
                    <Text style={styles.statDesc}>Taken today</Text>
                  </View>
                </View>
              )}

              {/* ← NEW: AI chat banner (shown when there are missed doses) */}
              {stats && stats.doses_missed_today > 0 && (
                <TouchableOpacity
                  style={styles.aiBanner}
                  onPress={() => navigation.navigate('Chat')}
                  activeOpacity={0.85}
                >
                  <View style={styles.aiBannerLeft}>
                    <View style={styles.aiBannerIcon}>
                      <MessageCircle size={16} color="#16a34a" />
                    </View>
                    <View>
                      <Text style={styles.aiBannerTitle}>
                        {stats.doses_missed_today} dose{stats.doses_missed_today > 1 ? 's' : ''} missed today
                      </Text>
                      <Text style={styles.aiBannerSub}>Ask AI what to do →</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#16a34a" />
                </TouchableOpacity>
              )}

              <Text style={styles.listHeaderTitle}>Active Medications</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <FileText size={42} color="#16a34a" />
              </View>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptySub}>
                Add your prescriptions to start tracking your health.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('AddMedication', {})}
              >
                <Text style={styles.emptyBtnText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Update status modal */}
      <UpdateStatusModal
        visible={modalVisible}
        dose={selectedDose}
        onClose={() => { setModalVisible(false); setSelectedDose(null); }}
        onUpdate={handleUpdateStatus}
      />

      {/* Course complete modal */}
      <CourseCompleteModal
        visible={completeVisible}
        medName={completedMedName}
        scaleAnim={scaleAnim}
        opacityAnim={opacityAnim}
        onClose={closeCompleteModal}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: '#f8fafc' },
  mainContainer: { flex: 1 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollPadding: { paddingBottom: 120 },

  // ── Header ─────────────────────────────────────────────────────────────────
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 15,
  },
  greetingText: {
    fontSize: 13, color: '#64748b', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  largeTitle: { fontSize: 30, fontWeight: '800', color: '#14532d' },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ← NEW chat button
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  chatBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },

  fabHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // ── Stats ───────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  statBox: {
    width: '31%', padding: 16, borderRadius: 22, alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statNum:  { fontSize: 20, fontWeight: '800', color: '#14532d', marginVertical: 4 },
  statDesc: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  // ← NEW AI banner
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTitle: { fontSize: 13, fontWeight: '700', color: '#14532d' },
  aiBannerSub:   { fontSize: 11, color: '#16a34a', marginTop: 1 },

  listHeaderTitle: {
    fontSize: 18, fontWeight: '700', color: '#14532d',
    marginHorizontal: 24, marginTop: 24, marginBottom: 14,
  },

  // ── Medication card ─────────────────────────────────────────────────────────
  medCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  medCardMissed: { borderColor: '#fecaca' },
  medCardDone:   { borderColor: '#bbf7d0' },
  medCardBody:   { flexDirection: 'row', alignItems: 'center', padding: 18 },

  medIconWrapper: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },
  medMainInfo: { flex: 1, marginLeft: 14 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  medTitle:    { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  refillDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },

  missedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fff5f5', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#fecaca',
  },
  missedBadgeText: { fontSize: 10, color: '#dc2626', fontWeight: '700' },
  medSubtitle:     { fontSize: 13, color: '#64748b', marginTop: 2 },

  freqTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8, marginTop: 7,
  },
  freqTagText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  // ── Dose section ────────────────────────────────────────────────────────────
  doseSection:   { paddingHorizontal: 18, paddingBottom: 14 },
  doseDivider:   { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  doseRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  doseLeft:      { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  doseRight:     { flexDirection: 'row', alignItems: 'center' },
  doseTime:      { fontSize: 13, fontWeight: '700' },

  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, marginLeft: 4,
  },
  statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  doseActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 10, gap: 5,
  },
  takenBtn:       { backgroundColor: '#16a34a' },
  updateBtn:      { backgroundColor: '#fff1f1', borderWidth: 1, borderColor: '#fca5a5' },
  loadingBtn:     { backgroundColor: '#86efac', paddingHorizontal: 18 },
  doseActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  updateBtnText:  { color: '#dc2626', fontSize: 12, fontWeight: '700' },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyWrap:    { alignItems: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyCircle:  { width: 90, height: 90, borderRadius: 45, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptySub:     { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  emptyBtn:     { backgroundColor: '#16a34a', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 18 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── MODAL STYLES ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  handle:  { width: 40, height: 5, backgroundColor: '#e2e8f0', alignSelf: 'center', borderRadius: 10, marginBottom: 20 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:   { fontSize: 19, fontWeight: '800', color: '#1e293b' },
  sub:     { fontSize: 13, color: '#64748b', marginTop: 3 },
  closeBtn:{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  options: { gap: 10, marginBottom: 22 },
  option:  { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fafafa', gap: 12 },
  swatch:  { width: 12, height: 12, borderRadius: 6 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  optionDesc:  { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  selectedDot: { width: 9, height: 9, borderRadius: 5 },
  confirm:     { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

const completed = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:         { backgroundColor: '#fff', borderRadius: 28, padding: 26, width: '100%', alignItems: 'center', overflow: 'hidden' },
  topBar:       { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#16a34a' },
  iconRing:     { width: 68, height: 68, borderRadius: 34, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 14 },
  title:        { fontSize: 21, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  nameBadge:    { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  nameBadgeText:{ fontSize: 13, fontWeight: '600', color: '#166534' },
  body:         { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  adherenceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 20, width: '100%', justifyContent: 'center' },
  adherenceText:{ fontSize: 13, fontWeight: '600', color: '#166534' },
  btn:          { backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 13, width: '100%', alignItems: 'center' },
  btnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});