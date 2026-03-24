import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/types';
import { documentsAPI, doctorsAPI } from '../../services/api';
import { format } from 'date-fns';
import {
  FileText,
  Folder,
  HardDrive,
  Clock,
  Users,
  Share2,
  Trash2,
  Upload,
  X,
  CheckSquare,
  Square,
  Image,
  File,
} from 'lucide-react-native';

// Define the document structure from the API
interface ApiDocument {
  id: number;
  title: string;
  category: string;
  category_display: string;
  file_extension: string;
  file_size: number;
  document_date: string | null;
  is_shared: boolean;
  created_at: string;
}

interface Doctor {
  id: number;
  doctor_name: string;
  specialization_display: string;
}

type DocumentsScreenNavigationProp = NativeStackNavigationProp<PatientStackParamList, 'Documents'>;

export default function DocumentsScreen() {
  const navigation = useNavigation<DocumentsScreenNavigationProp>();
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sharing modal state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApiDocument | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<number[]>([]);
  const [sharing, setSharing] = useState(false);

  const loadDocuments = async () => {
    try {
      console.log('Fetching documents...');
      const response = await documentsAPI.getMyDocuments();
      // The response is { count, documents }
      const docs = (response as any).documents || [];
      console.log('Documents received:', docs);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents. Check console for details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handleDelete = (docId: number) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await documentsAPI.delete(docId);
            setDocuments(prev => prev.filter(d => d.id !== docId));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete document');
          }
        },
      },
    ]);
  };

  // Sharing handlers
  const handleSharePress = (document: ApiDocument) => {
    setSelectedDocument(document);
    setSelectedDoctors([]);
    loadDoctors();
    setShareModalVisible(true);
  };

  const loadDoctors = async () => {
    try {
      const response = await doctorsAPI.list();
      setDoctors(response);
    } catch (error) {
      Alert.alert('Error', 'Failed to load doctors list.');
      console.error(error);
    }
  };

  const toggleDoctorSelection = (doctorId: number) => {
    setSelectedDoctors(prev =>
      prev.includes(doctorId)
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const handleShareConfirm = async () => {
    if (!selectedDocument) return;
    setSharing(true);
    try {
      await documentsAPI.shareWithDoctor(selectedDocument.id, selectedDoctors);
      Alert.alert('Success', 'Document shared successfully.');
      setShareModalVisible(false);
      loadDocuments(); // Refresh to update is_shared flag
    } catch (error) {
      Alert.alert('Error', 'Failed to share document.');
      console.error(error);
    } finally {
      setSharing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PRESCRIPTION':
        return FileText;
      case 'LAB_REPORT':
        return File;
      case 'SCAN':
      case 'MRI':
      case 'CT_SCAN':
        return Image;
      default:
        return Folder;
    }
  };

  const renderDocumentItem = ({ item }: { item: ApiDocument }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    return (
      <TouchableOpacity
        style={styles.documentCard}
        onPress={() => navigation.navigate('DocumentDetails', { documentId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <CategoryIcon size={28} color="#16a34a" />
        </View>

        <View style={styles.documentInfo}>
          <Text style={styles.documentTitle}>{item.title}</Text>
          <Text style={styles.documentMeta}>
            {item.category_display} • {formatFileSize(item.file_size)} • {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </Text>

          {item.is_shared && (
            <View style={styles.sharedBadge}>
              <Users size={12} color="#16a34a" />
              <Text style={styles.sharedText}>Shared</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => handleSharePress(item)} style={styles.shareButton}>
            <Share2 size={20} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Documents</Text>
        <TouchableOpacity onPress={() => navigation.navigate('UploadDocument')} style={styles.uploadButton}>
          <Upload size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDocumentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={60} color="#bbf7d0" />
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the upload button to add your first document
            </Text>
          </View>
        }
      />

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Document</Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select doctors to share "{selectedDocument?.title}" with:
            </Text>

            {doctors.length === 0 ? (
              <ActivityIndicator size="small" color="#16a34a" style={styles.modalLoader} />
            ) : (
              <ScrollView style={styles.doctorList}>
                {doctors.map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={styles.doctorItem}
                    onPress={() => toggleDoctorSelection(doctor.id)}
                  >
                    <View style={styles.doctorCheckbox}>
                      {selectedDoctors.includes(doctor.id) ? (
                        <CheckSquare size={24} color="#16a34a" />
                      ) : (
                        <Square size={24} color="#9ca3af" />
                      )}
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>{doctor.doctor_name}</Text>
                      <Text style={styles.doctorSpecialty}>{doctor.specialization_display}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, sharing && styles.disabledButton]}
                onPress={handleShareConfirm}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Share</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
  },
  uploadButton: {
    backgroundColor: '#16a34a',
    padding: 10,
    borderRadius: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  sharedText: {
    fontSize: 11,
    color: '#16a34a',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    padding: 8,
    marginRight: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 20,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14532d',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  modalLoader: {
    marginVertical: 20,
  },
  doctorList: {
    maxHeight: 300,
  },
  doctorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0fdf4',
  },
  doctorCheckbox: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#14532d',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#16a34a',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#bbf7d0',
  },
});