import React, { useState } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, ScrollView, StatusBar,Platform
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { documentsAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';

const CATEGORIES = [
  'LAB_REPORT', 'PRESCRIPTION', 'SCAN', 'MRI', 'CT_SCAN',
  'BLOOD_TEST', 'VACCINATION', 'DISCHARGE_SUMMARY',
  'MEDICAL_CERTIFICATE', 'OTHER',
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
      } as any);

      await documentsAPI.upload(formData);
      Alert.alert('Success', 'Document uploaded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Upload Failed', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Record</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Title Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DOCUMENT TITLE <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Icon name="document-text-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Annual Blood Test"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Category Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.pickerWrapper}>
              <Icon name="folder-open-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.picker}
                dropdownIconColor="#16a34a"
              >
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={cat.replace(/_/g, ' ')} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DOCUMENT DATE</Text>
            <View style={styles.inputWrapper}>
              <Icon name="calendar-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={documentDate}
                onChangeText={setDocumentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Add extra details here..."
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* File Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ATTACHMENT <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity 
              style={[styles.uploadBox, file && styles.uploadBoxActive]} 
              onPress={pickImage}
            >
              <Icon name={file ? "checkmark-circle" : "cloud-upload-outline"} size={28} color={file ? "#16a34a" : "#64748b"} />
              <Text style={[styles.uploadBoxText, file && styles.uploadTextActive]}>
                {file ? (file.fileName || 'Image Selected') : 'Tap to select an image'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.mainBtn, loading && styles.mainBtnDisabled]}
          onPress={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.mainBtnText}>Upload Document</Text>
              <Icon name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
  headerArea: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 16, paddingVertical: 12 
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#14532d', marginTop: 10, marginBottom: 10 },
  iconButton: { padding: 4 },
  scrollBody: { padding: 16 },
  card: { 
    backgroundColor: '#fff', borderRadius: 20, padding: 20, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  required: { color: '#ef4444' },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', 
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12 
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 15, color: '#1e293b' },
  pickerWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', 
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingLeft: 12 
  },
  picker: { flex: 1, height: 50, color: '#1e293b' },
  textArea: { height: 100, textAlignVertical: 'top', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginTop: 4 },
  uploadBox: { 
    backgroundColor: '#f1f5f9', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', 
    borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center' 
  },
  uploadBoxActive: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  uploadBoxText: { marginTop: 8, fontSize: 14, color: '#64748b', fontWeight: '500' },
  uploadTextActive: { color: '#16a34a' },
  mainBtn: { 
    backgroundColor: '#16a34a', height: 56, borderRadius: 16, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 40 
  },
  mainBtnDisabled: { backgroundColor: '#86efac' },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});