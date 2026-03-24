import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParamList } from '../../navigation/types';
import { documentsAPI } from '../../services/api';
import { Document } from '../../services/types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  FileText,
  Folder,
  Calendar,
  HardDrive,
  Clock,
  User,
  Users,
  Eye,
  Share2,
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleViewFile = () => {
    if (document?.file) {
      Linking.openURL(document.file).catch(() =>
        Alert.alert('Error', 'Could not open file.')
      );
    }
  };

  const getCategoryIcon = (category: string) => {
    // All return FileText for simplicity, but you can map to specific icons if needed
    return FileText;
  };

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
        <Text>Document not found.</Text>
      </View>
    );
  }

  const CategoryIcon = getCategoryIcon(document.category);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.iconContainer}>
        <CategoryIcon size={60} color="#16a34a" />
      </View>

      {/* Title */}
      <Text style={styles.title}>{document.title}</Text>

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Folder size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{document.category_display}</Text>
        </View>

        <View style={styles.detailRow}>
          <Calendar size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Document Date:</Text>
          <Text style={styles.detailValue}>
            {document.document_date ? format(new Date(document.document_date), 'MMM dd, yyyy') : 'Not specified'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <HardDrive size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>File Size:</Text>
          <Text style={styles.detailValue}>{formatFileSize(document.file_size)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Clock size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Uploaded:</Text>
          <Text style={styles.detailValue}>
            {format(new Date(document.created_at), 'MMM dd, yyyy')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <User size={20} color="#16a34a" />
          <Text style={styles.detailLabel}>Uploaded by:</Text>
          <Text style={styles.detailValue}>{document.uploaded_by_name}</Text>
        </View>

        {document.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText}>{document.description}</Text>
          </View>
        ) : null}

        {document.is_shared && (
          <View style={styles.sharedBadge}>
            <Users size={16} color="#16a34a" />
            <Text style={styles.sharedText}>Shared with doctors</Text>
          </View>
        )}
      </View>

      {/* View File Button */}
      <TouchableOpacity style={styles.viewButton} onPress={handleViewFile}>
        <Eye size={22} color="#fff" />
        <Text style={styles.viewButtonText}>View File</Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => {
          Alert.alert('Info', 'To share this document, go back to the list and use the share button.');
        }}
      >
        <Share2 size={22} color="#16a34a" />
        <Text style={styles.shareButtonText}>Share with Doctor</Text>
      </TouchableOpacity>
    </ScrollView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14532d',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14532d',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0fdf4',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    width: 100,
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#14532d',
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0fdf4',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14532d',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sharedText: {
    fontSize: 14,
    color: '#16a34a',
    marginLeft: 6,
  },
  viewButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  shareButtonText: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});