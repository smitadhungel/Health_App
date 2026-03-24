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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { medicationsAPI } from '../../../services/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Pill,
  CheckSquare,
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
      setDoses(response);
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
      Alert.alert('Success', 'Dose marked as taken.');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update dose.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TAKEN': return CheckCircle;
      case 'MISSED': return XCircle;
      case 'SKIPPED': return AlertCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TAKEN': return '#16a34a';
      case 'MISSED': return '#ef4444';
      case 'SKIPPED': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'TAKEN': return styles.taken;
      case 'MISSED': return styles.missed;
      case 'SKIPPED': return styles.skipped;
      case 'DELAYED': return styles.delayed;
      default: return styles.pending;
    }
  };

  const renderDoseItem = ({ item }: { item: TodaysDose }) => {
    const StatusIcon = getStatusIcon(item.status);
    return (
      <View style={styles.doseCard}>
        <View style={styles.doseHeader}>
          <View style={styles.doseTimeContainer}>
            <Clock size={18} color="#14532d" />
            <Text style={styles.doseTime}>{item.scheduled_time}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <StatusIcon size={12} color="#fff" />
            <Text style={styles.statusText}>{item.status_display}</Text>
          </View>
        </View>
        <Text style={styles.medName}>{item.medication_name}</Text>
        {item.status !== 'TAKEN' && (
          <TouchableOpacity style={styles.takeButton} onPress={() => handleMarkTaken(item)}>
            <CheckSquare size={18} color="#fff" />
            <Text style={styles.takeButtonText}>Mark as Taken</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doses}
        renderItem={renderDoseItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle size={60} color="#bbf7d0" />
            <Text style={styles.emptyText}>No doses scheduled for today.</Text>
            <Text style={styles.emptySubtext}>Great job staying on track!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  listContent: {
    padding: 20,
    paddingBottom: 30,
  },
  doseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  doseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doseTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  taken: {
    backgroundColor: '#16a34a',
  },
  missed: {
    backgroundColor: '#ef4444',
  },
  skipped: {
    backgroundColor: '#f97316',
  },
  delayed: {
    backgroundColor: '#f59e0b',
  },
  pending: {
    backgroundColor: '#6b7280',
  },
  medName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#14532d',
    marginBottom: 12,
  },
  takeButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  takeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});