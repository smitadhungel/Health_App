import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Linking, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DoctorStackParamList } from '../../navigation/types';
import { documentsAPI } from '../../services/api';
import { FileText, ClipboardList, Eye, Calendar, User, ArrowRight, Layers } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<DoctorStackParamList, 'SharedDocuments'>;

// Refined Professional Color Map
const theme = {
  emerald: '#10b981',
  forest: '#064e3b',
  slate: '#64748b',
  bg: '#f8fafc',
};

const categoryStyles: Record<string, { bg: string; text: string }> = {
  LAB_REPORT:   { bg: '#e0f2fe', text: '#0369a1' },
  BLOOD_TEST:   { bg: '#fee2e2', text: '#b91c1c' },
  SCAN:         { bg: '#fef9c3', text: '#854d0e' },
  MRI:          { bg: '#f3e8ff', text: '#6d28d9' },
  CT_SCAN:      { bg: '#ffedd5', text: '#9a3412' },
  PRESCRIPTION: { bg: '#dcfce7', text: '#15803d' },
  OTHER:        { bg: '#f1f5f9', text: '#475569' },
};

export default function SharedDocumentsScreen() {
  const navigation = useNavigation<Nav>();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentsAPI.getSharedWithDoctor();
      setDocuments(Array.isArray(res) ? res : res.documents || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDocuments(); }, [fetchDocuments]));

  const handleViewDocument = (fileUrl: string | null | undefined) => {
    if (!fileUrl) {
      Alert.alert('Unavailable', 'File URL is not available.');
      return;
    }
    Linking.openURL(fileUrl).catch(() => Alert.alert('Error', 'Could not open the document.'));
  };

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.emerald} /></View>;
  }

  const renderItem = ({ item }: { item: any }) => {
    const style = categoryStyles[item.category] || categoryStyles.OTHER;
    const patientId = item.patient_id ?? item.patient;
    const patientName = item.patient_name ?? 'Unknown Patient';

    return (
      <View style={styles.card}>
        {/* Top Section: Category & Date */}
        <View style={styles.cardTop}>
          <View style={[styles.categoryBadge, { backgroundColor: style.bg }]}>
            <Text style={[styles.categoryText, { color: style.text }]}>{item.category_display}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Calendar size={12} color={theme.slate} />
            <Text style={styles.dateText}>{formatDate(item.document_date)}</Text>
          </View>
        </View>

        {/* Middle Section: Title & Patient */}
        <View style={styles.cardBody}>
          <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.patientRow}>
            <View style={styles.avatarMini}>
              <Text style={styles.avatarText}>{patientName.charAt(0)}</Text>
            </View>
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bottom Section: Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => handleViewDocument(item.file_url)}
          >
            <Eye size={16} color={theme.forest} />
            <Text style={styles.secondaryBtnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.primaryBtn}
            onPress={() => {
              if (!patientId) return Alert.alert('Error', 'Patient ID missing');
              navigation.navigate('WritePrescription', {
                patientId, patientName, documentId: item.id, documentTitle: item.title,
              });
            }}
          >
            <ClipboardList size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Prescribe</Text>
            <ArrowRight size={14} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Shared Files</Text>
          <Text style={styles.headerSub}>{documents.length} records available</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Layers size={20} color={theme.forest} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={documents}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDocuments(); }} />
        }
        contentContainerStyle={documents.length === 0 ? styles.emptyContainer : { padding: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <FileText size={40} color={theme.emerald} />
            </View>
            <Text style={styles.emptyTitle}>Your Inbox is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Patient diagnostic reports and history will appear here once shared.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  headerSub: { fontSize: 13, color: theme.slate, fontWeight: '500' },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },

  // Card Design
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, fontWeight: '600', color: theme.slate },

  cardBody: { marginBottom: 16 },
  docTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b', lineHeight: 22, marginBottom: 8 },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarMini: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#dcfce7' },
  avatarText: { fontSize: 11, fontWeight: '700', color: theme.emerald },
  patientName: { fontSize: 13, fontWeight: '600', color: '#475569' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 16 },

  cardActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f1f5f9', 
    borderRadius: 12, 
    paddingVertical: 12, 
    gap: 6 
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  primaryBtn: { 
    flex: 2, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: theme.forest, 
    borderRadius: 12, 
    paddingVertical: 12, 
    gap: 8 
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  emptySubtitle: { fontSize: 14, color: theme.slate, textAlign: 'center', marginTop: 10, lineHeight: 20 },
});