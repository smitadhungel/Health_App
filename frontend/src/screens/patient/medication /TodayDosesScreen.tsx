import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import {  SafeAreaView,} from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native';
import { medicationsAPI } from '../../../services/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
} from 'lucide-react-native';

interface TodaysDose {
  scheduled_time: string;
  medication_name: string;
  status: string;
  status_display: string;
  medication: number;
  scheduled_date: string;
}

export default function TodayDosesScreen() {
  const [doses, setDoses] = useState<TodaysDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const response = await medicationsAPI.getTodaysDoses();
      // Use logic to extract array if response is wrapped in an object
      const dosesArray = Array.isArray(response) ? response : (response as any).doses || [];
      setDoses(dosesArray);
    } catch (error) {
      Alert.alert('Error', 'Failed to load today\'s doses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMarkTaken = async (dose: TodaysDose) => {
    try {
      await medicationsAPI.log(dose.medication, {
        scheduled_date: dose.scheduled_date,
        scheduled_time: dose.scheduled_time,
        status: 'TAKEN',
        actual_time: new Date().toISOString(),
        dosage_taken: 1,
      });
      loadData();
      Alert.alert('Success', 'Dose recorded!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update dose.');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'TAKEN': 
        return { color: '#16a34a', bg: '#dcfce7', icon: CheckCircle };
      case 'MISSED': 
        return { color: '#ef4444', bg: '#fee2e2', icon: XCircle };
      case 'SKIPPED': 
        return { color: '#f97316', bg: '#ffedd5', icon: AlertCircle };
      default: 
        return { color: '#64748b', bg: '#f1f5f9', icon: Clock };
    }
  };

  const renderDoseItem = ({ item, index }: { item: TodaysDose; index: number }) => {
    const config = getStatusConfig(item.status);
    const isTaken = item.status === 'TAKEN';

    return (
      <View style={styles.timelineRow}>
        {/* Timeline Decoration */}
        <View style={styles.timelineSidebar}>
          <View style={[styles.timelineDot, { backgroundColor: config.color }]} />
          {index !== doses.length - 1 && <View style={styles.timelineConnector} />}
        </View>

        <View style={[styles.doseCard, isTaken && styles.doseCardCompleted]}>
          <View style={styles.cardMain}>
            <View style={styles.timeWrapper}>
              <Text style={[styles.timeText, isTaken && styles.textMuted]}>{item.scheduled_time}</Text>
              <View style={[styles.statusTag, { backgroundColor: config.bg }]}>
                <Text style={[styles.statusTagText, { color: config.color }]}>
                  {item.status_display}
                </Text>
              </View>
            </View>

            <Text style={[styles.medName, isTaken && styles.textStrike]}>
              {item.medication_name}
            </Text>

            {!isTaken && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleMarkTaken(item)}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Mark Taken</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isTaken && (
            <View style={styles.completedCheck}>
              <CheckCircle size={24} color="#16a34a" />
            </View>
          )}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={styles.title}>Daily Schedule</Text>
        </View>

        <FlatList
          data={doses}
          renderItem={renderDoseItem}
          keyExtractor={(item, index) => index.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <CalendarDays size={40} color="#16a34a" />
              </View>
              <Text style={styles.emptyText}>All clear for today!</Text>
              <Text style={styles.emptySubtext}>You have no doses scheduled right now.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 15,
  },
  dateText: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#14532d', marginTop: 4 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // Timeline Styling
  timelineRow: { flexDirection: 'row' },
  timelineSidebar: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 2, marginTop: 24 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#e2e8f0' },

  // Card Styling
  doseCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  doseCardCompleted: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.8,
  },
  cardMain: { flex: 1 },
  timeWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeText: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginRight: 10 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  medName: { fontSize: 17, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  textStrike: { textDecorationLine: 'line-through', color: '#94a3b8' },
  textMuted: { color: '#94a3b8' },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  
  completedCheck: { marginLeft: 10 },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  emptySubtext: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});