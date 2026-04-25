import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, StatusBar, 
  SafeAreaView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/types';
import { documentsAPI } from '../../services/api';
import { format } from 'date-fns';
import {
  FileText, Trash2, Upload, Image, File
} from 'lucide-react-native';

interface ApiDocument {
  id: number; title: string; category: string; category_display: string;
  file_extension: string; file_size: number; document_date: string | null;
  is_shared: boolean; created_at: string;
}

type DocumentsScreenNavigationProp = NativeStackNavigationProp<PatientStackParamList, 'Documents'>;

export default function DocumentsScreen() {
  // 1. ALL HOOKS MUST BE AT THE TOP
  const navigation = useNavigation<DocumentsScreenNavigationProp>();
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { 
    loadDocuments(); 
  }, []);

  // 2. LOGIC FUNCTIONS
  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.getMyDocuments();
      const docs = (response as any).documents || [];
      setDocuments(docs);
    } catch (error) {
      Alert.alert('Error', 'Failed to load documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { 
    setRefreshing(true); 
    loadDocuments(); 
  };

  const handleDelete = (docId: number) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await documentsAPI.delete(docId);
            setDocuments(prev => prev.filter(d => d.id !== docId));
          } catch (error) { Alert.alert('Error', 'Failed to delete document'); }
      }},
    ]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PRESCRIPTION': return FileText;
      case 'LAB_REPORT': return File;
      case 'SCAN': case 'MRI': case 'CT_SCAN': return Image;
      default: return FileText;
    }
  };

  const renderDocumentItem = ({ item }: { item: ApiDocument }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    return (
      <TouchableOpacity
        style={styles.documentCard}
        onPress={() => navigation.navigate('DocumentDetails', { documentId: item.id })}
        activeOpacity={0.6}
      >
        <View style={styles.iconBox}><CategoryIcon size={22} color="#16a34a" /></View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.documentMeta}>
            {item.category_display} • {(item.file_size / 1024).toFixed(1)} KB
          </Text>
          <Text style={styles.dateText}>{format(new Date(item.created_at), 'MMM dd, yyyy')}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // 3. CONDITIONAL RENDER AT THE BOTTOM
  // This is where your error was: if this was above useEffect, 
  // useEffect wouldn't run during the loading phase.
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  // 4. MAIN RENDER
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>Medical Records</Text>
            <Text style={styles.headerTitle}>My Documents</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('UploadDocument')} style={styles.uploadBtn}>
            <Upload size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDocumentItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No documents found</Text>
            <Text style={styles.emptyText}>Upload your medical reports to keep them organized.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSafe: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: {fontSize: 20, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 10 },
  headerSubtitle: { fontSize: 11, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 },
  uploadBtn: { backgroundColor: '#16a34a', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  documentCard: { 
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } })
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  documentInfo: { flex: 1, marginLeft: 14 },
  documentTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  documentMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  dateText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  deleteBtn: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 12 },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748b', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4, lineHeight: 20 },
});