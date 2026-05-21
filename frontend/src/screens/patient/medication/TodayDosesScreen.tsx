import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { medicationsAPI } from '../../../services/api';
import {
  CheckCircle,
  CheckCircle2,
  CalendarDays,
  AlertTriangle,
  RotateCcw,
  Clock,
  X,
  SkipForward,
  Timer,
  XCircle,
} from 'lucide-react-native';

// ─── TYPES & HELPERS ─────────────────────────────────────────────────────────

interface TodaysDose {
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

const getTodayDate = (): string => new Date().toISOString().split('T')[0];

const STATUS_CONFIG: Record<string, {
  color: string; bg: string; label: string;
  dotColor: string; borderColor: string;
}> = {
  TAKEN:   { color: '#fff', bg: '#16a34a', label: 'Taken',   dotColor: '#16a34a', borderColor: '#bbf7d0' },
  MISSED:  { color: '#fff', bg: '#dc2626', label: 'Missed',  dotColor: '#dc2626', borderColor: '#fecaca' },
  SKIPPED: { color: '#fff', bg: '#ea580c', label: 'Skipped', dotColor: '#ea580c', borderColor: '#fed7aa' },
  DELAYED: { color: '#fff', bg: '#d97706', label: 'Delayed', dotColor: '#d97706', borderColor: '#fde68a' },
  PENDING: { color: '#fff', bg: '#2563eb', label: 'Pending', dotColor: '#2563eb', borderColor: '#bfdbfe' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

// ─── UPDATE MODAL COMPONENT ──────────────────────────────────────────────────

interface UpdateModalProps {
  visible: boolean;
  dose: TodaysDose | null;
  onClose: () => void;
  onUpdate: (logId: number, status: LogStatus) => Promise<void>;
}

type StatusOption = {
  value: LogStatus;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
};

function UpdateStatusModal({ visible, dose, onClose, onUpdate }: UpdateModalProps) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LogStatus>('TAKEN');

  const options: StatusOption[] = [
    { value: 'TAKEN',   label: 'Mark as Taken',   desc: 'I took this dose',          Icon: CheckCircle2  },
    { value: 'SKIPPED', label: 'Mark as Skipped',  desc: 'Intentionally skipped',     Icon: SkipForward   },
    { value: 'DELAYED', label: 'Mark as Delayed',  desc: 'Will take it soon',         Icon: Timer         },
    { value: 'MISSED',  label: 'Keep as Missed',   desc: 'Did not take this dose',    Icon: XCircle       },
  ];

  const handleConfirm = async () => {
    if (!dose?.log_id) return;
    setLoading(true);
    try {
      await onUpdate(dose.log_id, selected);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <View>
              <Text style={modalStyles.title}>Update Dose Status</Text>
              {dose && (
                <Text style={modalStyles.sub}>
                  {dose.medication_name} • scheduled {dose.time}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.options}>
            {options.map((opt) => {
              const isSelected = selected === opt.value;
              const cfg = getStatusConfig(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    modalStyles.option,
                    isSelected && { borderColor: cfg.bg, backgroundColor: cfg.bg + '12' },
                  ]}
                  onPress={() => setSelected(opt.value)}
                  activeOpacity={0.8}
                >
                  <View style={[modalStyles.optionIconWrap, { backgroundColor: cfg.bg + '18' }]}>
                    <opt.Icon size={20} color={cfg.bg} />
                  </View>
                  <View style={modalStyles.optionText}>
                    <Text style={[modalStyles.optionLabel, isSelected && { color: cfg.bg }]}>
                      {opt.label}
                    </Text>
                    <Text style={modalStyles.optionDesc}>{opt.desc}</Text>
                  </View>
                  {isSelected && (
                    <View style={[modalStyles.dot, { backgroundColor: cfg.bg }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[modalStyles.confirm, { backgroundColor: getStatusConfig(selected).bg }, loading && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={modalStyles.confirmText}>Confirm Update</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN COMPONENT ───────────────────────────────────────────────────

export default function TodayDosesScreen() {
  const [doses, setDoses]           = useState<TodaysDose[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId]   = useState<number | null>(null);

  // Update modal state
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedDose, setSelectedDose]             = useState<TodaysDose | null>(null);

  // Completion Alert State & Animations
  const [completedModal, setCompletedModal] = useState(false);
  const [completedMedName, setCompletedMedName] = useState('');
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Filter: 'active' = pending/missed/delayed | 'taken' = completed
  const [activeTab, setActiveTab] = useState<'active' | 'taken'>('active');

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  const loadData = async () => {
    try {
      const response = await medicationsAPI.getTodaysDoses();
      const dosesArray: TodaysDose[] = Array.isArray(response)
        ? response
        : (response as any).doses || [];
      setDoses(dosesArray);
    } catch {
      Alert.alert('Error', "Failed to load today's doses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Auto-complete Animation helper ──────────────────────────────────────────
  const showAutoCompletedAlert = (medicationName: string) => {
    setCompletedMedName(medicationName);
    setCompletedModal(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true, bounciness: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
    ]).start();
  };

  const closeCompletedModal = () => {
    Animated.timing(opacityAnim, {
      toValue: 0, duration: 180, useNativeDriver: true,
    }).start(() => {
      setCompletedModal(false);
      scaleAnim.setValue(0.85);
    });
  };

  // ── Mark a PENDING dose as TAKEN ───────────────────────────────────────────
  const handleMarkTaken = async (dose: TodaysDose) => {
    setMarkingId(dose.medication_id);
    try {
      const now = new Date();
      const response = await medicationsAPI.log(dose.medication_id, {
        scheduled_date: getTodayDate(),
        scheduled_time: dose.time,
        status: 'TAKEN',
        actual_time: formatTimeForAPI(now),
        dosage_taken: dose.dosage_count,
      });

      if (response?.auto_completed) {
        showAutoCompletedAlert(dose.medication_name);
      }

      await loadData();
    } catch (error: any) {
      const msg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : 'Failed to update dose.';
      Alert.alert('Error', msg);
    } finally {
      setMarkingId(null);
    }
  };

  // ── Update an already-logged dose via PATCH ────────────────────────────────
  const handleUpdateStatus = async (logId: number, newStatus: LogStatus) => {
    try {
      const response = await medicationsAPI.updateLog(logId, { status: newStatus });

      if (response?.auto_completed) {
        showAutoCompletedAlert(selectedDose?.medication_name ?? 'Medication');
      }

      await loadData();
    } catch (error: any) {
      const msg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : 'Failed to update status.';
      Alert.alert('Error', msg);
    }
  };

  const openUpdateModal = (dose: TodaysDose) => {
    setSelectedDose(dose);
    setUpdateModalVisible(true);
  };

  // ── Split doses ─────────────────────────────────────────────────────────────
  const activeDoses  = doses.filter(d => d.status !== 'TAKEN');
  const takenDoses   = doses.filter(d => d.status === 'TAKEN');
  const displayDoses = activeTab === 'active' ? activeDoses : takenDoses;

  const renderDoseItem = ({ item, index }: { item: TodaysDose; index: number }) => {
    const cfg       = getStatusConfig(item.status);
    const isTaken   = item.status === 'TAKEN';
    const isMissed  = item.status === 'MISSED';
    const isPending = item.status === 'PENDING';
    const isMarking = markingId === item.medication_id;
    const list      = activeTab === 'active' ? activeDoses : takenDoses;

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineSidebar}>
          <View style={[styles.timelineDot, { backgroundColor: cfg.dotColor }]} />
          {index !== list.length - 1 && <View style={styles.timelineConnector} />}
        </View>

        <View style={[
          styles.doseCard,
          isTaken  && styles.doseCardTaken,
          isMissed && styles.doseCardMissed,
          { borderColor: cfg.borderColor },
        ]}>
          <View style={styles.cardMain}>
            <View style={styles.timeWrapper}>
              <View style={styles.timeRow}>
                <Clock size={13} color={cfg.dotColor} />
                <Text style={[styles.timeText, (isTaken || isMissed) && styles.textMuted]}>
                  {item.time}
                </Text>
              </View>
              <View style={[styles.statusTag, { backgroundColor: cfg.bg }]}>
                <Text style={styles.statusTagText}>
                  {item.status_display || cfg.label}
                </Text>
              </View>
            </View>

            <Text style={[styles.medName, isTaken && styles.textStrike]}>
              {item.medication_name}
            </Text>

            {!!item.dosage && <Text style={styles.dosageText}>{item.dosage}</Text>}
            {!!item.instructions && <Text style={styles.instructionsText}>{item.instructions}</Text>}

            <View style={styles.actionRow}>
              {isPending && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.takenButton, isMarking && styles.actionButtonLoading]}
                  onPress={() => handleMarkTaken(item)}
                  disabled={isMarking}
                  activeOpacity={0.8}
                >
                  {isMarking
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <CheckCircle2 size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Mark Taken</Text>
                      </>
                  }
                </TouchableOpacity>
              )}

              {(isMissed || item.status === 'SKIPPED' || item.status === 'DELAYED') && item.log_id && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.updateButton]}
                  onPress={() => openUpdateModal(item)}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={15} color="#dc2626" />
                  <Text style={styles.updateButtonText}>
                    {isMissed ? 'Took it? Update' : 'Change Status'}
                  </Text>
                </TouchableOpacity>
              )}

              {isTaken && item.log_id && (
                <TouchableOpacity
                  style={styles.changeLinkBtn}
                  onPress={() => openUpdateModal(item)}
                >
                  <Text style={styles.changeLinkText}>Change status</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isTaken ? (
            <View style={styles.completedCheck}>
              <CheckCircle size={26} color="#16a34a" />
            </View>
          ) : isMissed ? (
            <View style={styles.completedCheck}>
              <AlertTriangle size={26} color="#dc2626" />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const missedCount = doses.filter(d => d.status === 'MISSED').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.title}>Daily Schedule</Text>

          {doses.length > 0 && (
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>{takenDoses.length}/{doses.length} doses completed</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(takenDoses.length / doses.length) * 100}%` }]} />
              </View>
            </View>
          )}

          {missedCount > 0 && activeTab === 'active' && (
            <View style={styles.missedBanner}>
              <AlertTriangle size={14} color="#9a3412" />
              <Text style={styles.missedBannerText}>
                {missedCount} dose{missedCount > 1 ? 's' : ''} missed — tap to update
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.tabActive]} onPress={() => setActiveTab('active')}>
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Pending / Missed</Text>
            {activeDoses.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'active' && { color: '#fff' }]}>{activeDoses.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tab, activeTab === 'taken' && styles.tabActive]} onPress={() => setActiveTab('taken')}>
            <Text style={[styles.tabText, activeTab === 'taken' && styles.tabTextActive]}>Completed</Text>
            {takenDoses.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'taken' && { ...styles.tabBadgeActive, backgroundColor: '#16a34a' }]}>
                <Text style={[styles.tabBadgeText, activeTab === 'taken' && { color: '#fff' }]}>{takenDoses.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={displayDoses}
          renderItem={renderDoseItem}
          keyExtractor={(item) => `${item.medication_id}-${item.schedule_id}-${item.status}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}><CalendarDays size={40} color="#16a34a" /></View>
              <Text style={styles.emptyText}>{activeTab === 'active' ? 'All caught up!' : 'No completed doses yet'}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Standard Update Status Modal */}
      <UpdateStatusModal
        visible={updateModalVisible}
        dose={selectedDose}
        onClose={() => { setUpdateModalVisible(false); setSelectedDose(null); }}
        onUpdate={handleUpdateStatus}
      />

      {/* Course Completion Modal */}
      <Modal visible={completedModal} transparent animationType="none" onRequestClose={closeCompletedModal}>
        <Animated.View style={[completedStyles.overlay, { opacity: opacityAnim }]}>
          <Animated.View style={[completedStyles.card, { transform: [{ scale: scaleAnim }] }]}>
            <View style={completedStyles.topBar} />
            <View style={completedStyles.iconRing}><CheckCircle size={38} color="#16a34a" /></View>
            <Text style={completedStyles.title}>Course complete!</Text>
            <View style={completedStyles.pillBadge}><Text style={completedStyles.pillBadgeText}>{completedMedName}</Text></View>
            <Text style={completedStyles.body}>
              You have finished every dose for this medication. It has been removed from your active list.
            </Text>
            <View style={completedStyles.streakRow}>
              <CheckCircle size={16} color="#16a34a" />
              <Text style={completedStyles.streakText}>100% adherence this course</Text>
            </View>
            <TouchableOpacity style={completedStyles.btn} onPress={closeCompletedModal} activeOpacity={0.85}>
              <Text style={completedStyles.btnText}>Got it</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#14532d', marginTop: 4 },
  progressPill: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: '#f0fdf4', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  progressText: { fontSize: 13, fontWeight: '700', color: '#16a34a', flex: 1 },
  progressBarBg: { width: 80, height: 6, backgroundColor: '#dcfce7', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#16a34a', borderRadius: 3 },
  missedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
  missedBannerText: { fontSize: 12, color: '#9a3412', fontWeight: '600', flex: 1 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, backgroundColor: '#fff', gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14, gap: 6, backgroundColor: '#f1f5f9' },
  tabActive: { backgroundColor: '#14532d' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeActive: { backgroundColor: '#dc2626' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  timelineRow: { flexDirection: 'row' },
  timelineSidebar: { width: 28, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 2, marginTop: 26 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#e2e8f0' },
  doseCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 14, marginLeft: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', elevation: 2 },
  doseCardTaken: { backgroundColor: '#f8fafc', opacity: 0.72 },
  doseCardMissed: { backgroundColor: '#fff5f5' },
  cardMain: { flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  timeText: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  statusTag: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: '#fff' },
  medName: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  dosageText: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  instructionsText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 4 },
  textStrike: { textDecorationLine: 'line-through', color: '#94a3b8' },
  textMuted: { color: '#94a3b8' },
  actionRow: { flexDirection: 'row', marginTop: 10, gap: 8, flexWrap: 'wrap' },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 12, gap: 6 },
  takenButton: { backgroundColor: '#16a34a' },
  updateButton: { backgroundColor: '#fff1f1', borderWidth: 1.5, borderColor: '#fca5a5' },
  actionButtonLoading: { backgroundColor: '#86efac' },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  updateButtonText: { color: '#dc2626', fontSize: 13, fontWeight: '700' },
  changeLinkBtn: { paddingVertical: 4 },
  changeLinkText: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  completedCheck: { marginLeft: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 5, backgroundColor: '#e2e8f0', alignSelf: 'center', borderRadius: 10, marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 3 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  options: { gap: 10, marginBottom: 24 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fafafa', gap: 12 },
  optionIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  optionDesc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  confirm: { paddingVertical: 17, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

const completedStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 28, width: '100%', alignItems: 'center', overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#16a34a' },
  iconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  pillBadge: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  pillBadgeText: { fontSize: 13, fontWeight: '600', color: '#166534' },
  body: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20, width: '100%', justifyContent: 'center' },
  streakText: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  btn: { backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 14, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});