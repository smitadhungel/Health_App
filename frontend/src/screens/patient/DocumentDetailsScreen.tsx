import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, TouchableOpacity, Linking, StatusBar,Platform
} from 'react-native';
import{SafeAreaView} from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParamList } from '../../navigation/types';
import { documentsAPI } from '../../services/api';
import { Document } from '../../services/types';
import { format } from 'date-fns';
import {
  FileText, Calendar, HardDrive, Clock, User,
  Eye, ChevronLeft, Image as ImageIcon, File
} from 'lucide-react-native';

type DocumentDetailsRouteProp = RouteProp<PatientStackParamList, 'DocumentDetails'>;
type DocumentDetailsNavigationProp = NativeStackNavigationProp<PatientStackParamList, 'DocumentDetails'>;

export default function DocumentDetailsScreen() {
  const navigation = useNavigation<DocumentDetailsNavigationProp>();
  const route = useRoute<DocumentDetailsRouteProp>();
  const { documentId } = route.params;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, []);

  const fetchDocument = async () => {
    try {
      const response = await documentsAPI.getDetails(documentId);
      setDocument(response);
    } catch (error) {
      Alert.alert('Error', 'Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = () => {
    if (document?.file) {
      Linking.openURL(document.file).catch(() =>
        Alert.alert('Error', 'Could not open file.')
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SCAN': case 'MRI': case 'CT_SCAN': return ImageIcon;
      case 'LAB_REPORT': return File;
      default: return FileText;
    }
  };

  // Keep hooks above this line
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Document not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const CategoryIcon = getCategoryIcon(document.category);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          {/* <View style={styles.iconCircle}>
            <CategoryIcon size={32} color="#16a34a" />
          </View> */}
          <Text style={styles.title}>{document.title}</Text>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{document.category_display}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow 
            icon={<Calendar size={18} color="#64748b" />} 
            label="Document Date" 
            value={document.document_date ? format(new Date(document.document_date), 'MMM dd, yyyy') : '—'} 
          />
          <InfoRow 
            icon={<HardDrive size={18} color="#64748b" />} 
            label="File Size" 
            value={`${(document.file_size / 1024).toFixed(1)} KB`} 
          />
          <InfoRow 
            icon={<Clock size={18} color="#64748b" />} 
            label="Uploaded On" 
            value={format(new Date(document.created_at), 'MMM dd, yyyy')} 
          />
          <InfoRow 
            icon={<User size={18} color="#64748b" />} 
            label="Uploaded By" 
            value={document.uploaded_by_name} 
            isLast
          />

          {document.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Notes</Text>
              <Text style={styles.descriptionText}>{document.description}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.viewButton} onPress={handleViewFile} activeOpacity={0.8}>
          <Eye size={20} color="#fff" />
          <Text style={styles.viewButtonText}>Open Document</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Small helper component for the rows
const InfoRow = ({ icon, label, value, isLast }: any) => (
  <View style={[styles.detailRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.rowLabelGroup}>
      {icon}
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  headerSafe: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  headerTitle: { color: '#0f172a',fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
  backBtn: { padding: 4 },
  heroSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center', paddingHorizontal: 24 },
  typeTag: { marginTop: 12, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  typeTagText: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  infoCard: { backgroundColor: '#fff', marginTop: 20, marginHorizontal: 16, borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  rowLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  descriptionBox: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  descriptionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  descriptionText: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  viewButton: { flexDirection: 'row', backgroundColor: '#16a34a', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 40, gap: 10 },
  viewButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#64748b', fontSize: 16 },
  backLink: { marginTop: 12 },
  backLinkText: { color: '#16a34a', fontWeight: '700' }
});