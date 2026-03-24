import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { documentsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';

const CATEGORIES = [
  'LAB_REPORT',
  'PRESCRIPTION',
  'SCAN',
  'MRI',
  'CT_SCAN',
  'BLOOD_TEST',
  'VACCINATION',
  'DISCHARGE_SUMMARY',
  'MEDICAL_CERTIFICATE',
  'OTHER',
];

export default function UploadDocumentScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [documentDate, setDocumentDate] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      if (response.assets && response.assets[0]) {
        setFile(response.assets[0]);
      }
    });
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!file) {
      Alert.alert('Error', 'Please select a file');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      if (documentDate) formData.append('document_date', documentDate);
      if (description) formData.append('description', description);
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName || file.name || 'document.jpg',
      });
      console.log('Uploading document with fields:', { title, category, documentDate, description });
      console.log('File info:', file);
      const response = await documentsAPI.upload(formData);
      console.log('Upload success:', response);
      Alert.alert('Success', 'Document uploaded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
        const errorData = error.response.data;
        let errorMessage = 'Failed to upload document';
        if (typeof errorData === 'string') errorMessage = errorData;
        else if (errorData.detail) errorMessage = errorData.detail;
        else if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
        else {
          const firstKey = Object.keys(errorData)[0];
          if (firstKey && errorData[firstKey]) {
            errorMessage = `${firstKey}: ${Array.isArray(errorData[firstKey]) ? errorData[firstKey][0] : errorData[firstKey]}`;
          }
        }
        Alert.alert('Upload Failed', errorMessage);
      } else if (error.request) {
        Alert.alert('Network Error', 'No response from server. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to upload document. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#16a34a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Document</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.form}>
        {/* Title Field */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Icon name="document-text-outline" size={18} color="#16a34a" />
            <Text style={styles.label}>Title</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Blood Test Report"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Category Field */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Icon name="folder-outline" size={18} color="#16a34a" />
            <Text style={styles.label}>Category</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
              dropdownIconColor="#16a34a"
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat.replace('_', ' ')} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Document Date Field */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Icon name="calendar-outline" size={18} color="#16a34a" />
            <Text style={styles.label}>Document Date (optional)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={documentDate}
            onChangeText={setDocumentDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Description Field */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Icon name="create-outline" size={18} color="#16a34a" />
            <Text style={styles.label}>Description (optional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* File Picker */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelContainer}>
            <Icon name="attach-outline" size={18} color="#16a34a" />
            <Text style={styles.label}>File</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TouchableOpacity style={styles.filePicker} onPress={pickImage}>
            <Icon name="cloud-upload-outline" size={24} color="#16a34a" />
            <Text style={styles.filePickerText} numberOfLines={1}>
              {file ? file.fileName || file.name || 'File selected' : 'Tap to select a file (PDF, Image)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, loading && styles.disabledButton]}
          onPress={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="cloud-upload-outline" size={22} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14532d',
    marginLeft: 6,
  },
  required: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#14532d',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
    color: '#14532d',
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#ecfdf5',
    borderStyle: 'dashed',
  },
  filePickerText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#16a34a',
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#86efac',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});