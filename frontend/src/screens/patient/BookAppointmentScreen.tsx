import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, FlatList, Modal, ActivityIndicator, Image,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRemindersContext } from '../../context/RemindersContext';
import { documentsAPI } from '../../services/api';
import DoctorProfileModal from '../../component/DoctorProfileModal';
import {
  Calendar, Clock, User, FileText, MessageSquare,
  X, ChevronRight, CheckCircle, Search,
  Paperclip, CheckSquare, Square, Stethoscope,
} from 'lucide-react-native';

//  const API_BASE_URL = 'http://172.20.10.2:8000/api';
 const API_BASE_URL = 'http://192.168.100.9:8000/api';
interface Doctor {
  id: number;
  user?: { first_name: string; last_name: string };
  doctor_name:string;
  full_name?: string;
  first_name?: string; last_name?: string; name?: string;
  specialization?: string; specialization_display?: string; specialty?: string;
  clinic_address?: string; qualification?: string;
  experience_years?: number; consultation_fee?: string;
  rating?: string; profile_photo?: string; license_photo?: string; bio?: string;
  total_patients?: number;
}

interface MyDocument {
  id: number; title: string; category: string;
  category_display: string; file_size: number;
}

interface DoctorSection { title: string; data: Doctor[]; }

const getDoctorDisplayName = (d: Doctor): string => {
  // Add doctor_name as the first check
  if (d.doctor_name) return d.doctor_name;
  if (d.full_name) return d.full_name;
  if (d.user?.first_name && d.user?.last_name) return `${d.user.first_name} ${d.user.last_name}`;
  if (d.first_name && d.last_name) return `${d.first_name} ${d.last_name}`;
  if (d.first_name) return d.first_name;
  if (d.name) return d.name;
  return `Doctor #${d.id}`;
};
const getSpec = (d: Doctor) => d.specialization_display || d.specialization || d.specialty || 'General';

const groupBySpec = (doctors: Doctor[]): DoctorSection[] => {
  const map = new Map<string, Doctor[]>();
  doctors.forEach(doc => {
    const spec = getSpec(doc);
    if (!map.has(spec)) map.set(spec, []);
    map.get(spec)!.push(doc);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
};

export default function BookAppointmentScreen() {
  const navigation = useNavigation();
  const { refresh } = useRemindersContext();

  const [doctorLabel,         setDoctorLabel]         = useState('');
  const [date,                setDate]                = useState('');
  const [time,                setTime]                = useState('');
  const [reason,              setReason]              = useState('');
  const [notes,               setNotes]               = useState('');
  const [selectedDoctor,      setSelectedDoctor]      = useState<Doctor | null>(null);
  const [loading,             setLoading]             = useState(false);
  const [loadingDetails,      setLoadingDetails]      = useState(false);

  const [showDateModal,       setShowDateModal]       = useState(false);
  const [showTimeModal,       setShowTimeModal]       = useState(false);
  const [showDoctorModal,     setShowDoctorModal]     = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileDoctor,       setProfileDoctor]       = useState<Doctor | null>(null);

  const [doctors,             setDoctors]             = useState<Doctor[]>([]);
  const [filteredDoctors,     setFilteredDoctors]     = useState<Doctor[]>([]);
  const [loadingDoctors,      setLoadingDoctors]      = useState(false);
  const [availableSlots,      setAvailableSlots]      = useState<string[]>([]);
  const [loadingSlots,        setLoadingSlots]        = useState(false);
  const [searchQuery,         setSearchQuery]         = useState('');

  const [myDocuments,         setMyDocuments]         = useState<MyDocument[]>([]);
  const [selectedDocIds,      setSelectedDocIds]      = useState<number[]>([]);
  const [loadingDocs,         setLoadingDocs]         = useState(false);
  const [docsExpanded,        setDocsExpanded]        = useState(false);

  useEffect(() => {
    fetchDoctors();
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const getToken = () => AsyncStorage.getItem('access_token');

  // const fetchDoctors = async () => {
  //   setLoadingDoctors(true);
  //   try {
  //     const token = await getToken();
  //     const res = await axios.get(`${API_BASE_URL}/doctors/`, { headers: { Authorization: `Bearer ${token}` } });
  //     const list: Doctor[] = Array.isArray(res.data) ? res.data : res.data?.doctors || res.data?.results || [];
  //     setDoctors(list);
  //     setFilteredDoctors(list);
  //   } catch { Alert.alert('Error', 'Failed to load doctors.'); }
  //   finally { setLoadingDoctors(false); }
  // };

  const fetchDoctors = async () => {
  setLoadingDoctors(true);
  try {
    const token = await getToken();
    const res = await axios.get(`${API_BASE_URL}/doctors/`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    const list: Doctor[] = Array.isArray(res.data) ? res.data : res.data?.doctors || res.data?.results || [];
    
    // Add this to see what data you're actually getting
    console.log('Doctor data:', JSON.stringify(list[0], null, 2));
    
    setDoctors(list);
    setFilteredDoctors(list);
  } catch { Alert.alert('Error', 'Failed to load doctors.'); }
  finally { setLoadingDoctors(false); }
};
  const fetchDoctorDetails = async (doctorId: number): Promise<Doctor | null> => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/doctors/${doctorId}/`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    } catch { return null; }
  };

  const fetchSlots = async (doctorId: number, d: string) => {
    setLoadingSlots(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE_URL}/appointments/available-slots/${doctorId}/`, {
        params: { date: d }, headers: { Authorization: `Bearer ${token}` },
      });
      let slots: string[] = [];
      if (Array.isArray(res.data)) slots = res.data;
      else if (res.data?.available_slots)
        slots = res.data.available_slots.filter((s: any) => s.available !== false).map((s: any) => s.time);
      else if (res.data?.slots) slots = res.data.slots;
      setAvailableSlots(slots); setTime('');
    } catch { setAvailableSlots([]); }
    finally { setLoadingSlots(false); }
  };

  useEffect(() => {
    if (selectedDoctor && date) fetchSlots(selectedDoctor.id, date);
    else { setAvailableSlots([]); setTime(''); }
  }, [selectedDoctor, date]);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredDoctors(doctors); return; }
    const q = searchQuery.toLowerCase();
    setFilteredDoctors(doctors.filter(d =>
      getDoctorDisplayName(d).toLowerCase().includes(q) || getSpec(d).toLowerCase().includes(q)
    ));
  }, [searchQuery, doctors]);

  const fetchMyDocuments = async () => {
    setLoadingDocs(true);
    try { const res = await documentsAPI.getMyDocuments(); setMyDocuments((res as any).documents || []); }
    catch { } finally { setLoadingDocs(false); }
  };

  const toggleDoc = (id: number) =>
    setSelectedDocIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // Called from "Select This Doctor" inside profile modal
  const handleSelectDoctor = async (doctor: Doctor) => {
    setShowDoctorModal(false);
    setProfileModalVisible(false);
    setLoadingDetails(true);
    setSelectedDocIds([]);
    const full = await fetchDoctorDetails(doctor.id);
    const resolved = full || doctor;
    setSelectedDoctor(resolved);
    setDoctorLabel(`Dr. ${getDoctorDisplayName(resolved)}`);
    setLoadingDetails(false);
    fetchMyDocuments();
    setDocsExpanded(true);
  };

  const handleViewProfile = async (doctor: Doctor) => {
    setLoadingDetails(true);
    const full = await fetchDoctorDetails(doctor.id);
    setProfileDoctor(full || doctor);
    setLoadingDetails(false);
    setProfileModalVisible(true);
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor) { Alert.alert('Error', 'Please select a doctor'); return; }
    if (!date)           { Alert.alert('Error', 'Please select a date');   return; }
    if (!time)           { Alert.alert('Error', 'Please select a time');   return; }
    if (!reason.trim())  { Alert.alert('Error', 'Please enter a reason');  return; }

    setLoading(true);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE_URL}/appointments/book/`, {
        doctor: selectedDoctor.id, appointment_date: date,
        appointment_time: time, reason: reason.trim(),
        symptoms: notes.trim(), duration_minutes: 30,
      }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

      if (selectedDocIds.length > 0)
        await Promise.allSettled(selectedDocIds.map(id => documentsAPI.shareWithDoctor(id, [selectedDoctor.id])));

      refresh();
      Alert.alert('🎉 Booked!',
        selectedDocIds.length > 0 ? `Appointment booked & ${selectedDocIds.length} document(s) shared!` : 'Appointment booked successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      const data = error.response?.data;
      const msg = data?.detail || data?.message || data?.error || 'Failed to book appointment.';
      Alert.alert('Booking Failed', msg);
    } finally { setLoading(false); }
  };

  const generateDateOptions = () => {
    const opts: { value: string; display: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      opts.push({
        value: d.toISOString().split('T')[0],
        display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }
    return opts;
  };

  const sections = groupBySpec(filteredDoctors);

  const renderDoctorRow = (doctor: Doctor) => {
    const isSelected = selectedDoctor?.id === doctor.id;
    return (
      <View style={[styles.doctorRow, isSelected && styles.doctorRowSelected]}>
        <View style={styles.docAvatar}>
          {doctor.profile_photo
            ? <Image source={{ uri: doctor.profile_photo }} style={styles.docAvatarImg} />
            : <View style={styles.docAvatarFallback}><Stethoscope size={17} color="#fff" /></View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorRowName}>Dr. {getDoctorDisplayName(doctor)}</Text>
          {doctor.experience_years
            ? <Text style={styles.doctorRowSub}>{doctor.experience_years} yrs · ₹{doctor.consultation_fee}</Text>
            : null
          }
        </View>
        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => handleViewProfile(doctor)}>
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Book Appointment</Text>
      <View style={styles.card}>

        {/* Doctor */}
        <Text style={styles.label}>Select Doctor</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowDoctorModal(true)} disabled={loadingDetails}>
          <User size={20} color="#16a34a" />
          {loadingDetails
            ? <ActivityIndicator size="small" color="#16a34a" style={{ marginLeft: 10 }} />
            : <Text style={[styles.selectorText, !doctorLabel && styles.placeholder]}>
                {doctorLabel || 'Tap to select a doctor'}
              </Text>
          }
          <ChevronRight size={18} color="#9ca3af" />
        </TouchableOpacity>

        {/* Date */}
        <Text style={styles.label}>Appointment Date</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowDateModal(true)}>
          <Calendar size={20} color="#16a34a" />
          <Text style={styles.selectorText}>
            {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select Date'}
          </Text>
        </TouchableOpacity>

        {/* Time */}
        <Text style={styles.label}>Appointment Time</Text>
        <TouchableOpacity style={styles.selector} onPress={() => {
          if (!selectedDoctor) { Alert.alert('', 'Select a doctor first.'); return; }
          setShowTimeModal(true);
        }}>
          <Clock size={20} color="#16a34a" />
          <Text style={[styles.selectorText, !time && styles.placeholder]}>{time || 'Select Time'}</Text>
        </TouchableOpacity>

        {/* Attach Documents */}
        {selectedDoctor && (
          <View>
            <Text style={styles.label}>Attach Documents</Text>
            <TouchableOpacity style={styles.attachToggle} onPress={() => { if (!myDocuments.length) fetchMyDocuments(); setDocsExpanded(p => !p); }}>
              <View style={styles.attachLeft}>
                <Paperclip size={17} color="#0f4c81" />
                <Text style={styles.attachText}>
                  {selectedDocIds.length > 0 ? `${selectedDocIds.length} selected` : 'Share reports with doctor'}
                </Text>
              </View>
              {selectedDocIds.length > 0 && <View style={styles.countBadge}><Text style={styles.countBadgeText}>{selectedDocIds.length}</Text></View>}
              <Text style={styles.attachArrow}>{docsExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {docsExpanded && (
              <View style={styles.docsList}>
                {loadingDocs ? <ActivityIndicator color="#0f4c81" style={{ marginVertical: 16 }} />
                  : myDocuments.length === 0 ? <Text style={styles.docsEmpty}>No documents uploaded yet.</Text>
                  : myDocuments.map(doc => {
                      const sel = selectedDocIds.includes(doc.id);
                      return (
                        <TouchableOpacity key={doc.id} style={[styles.docItem, sel && styles.docItemSelected]} onPress={() => toggleDoc(doc.id)}>
                          {sel ? <CheckSquare size={22} color="#0f4c81" /> : <Square size={22} color="#9ca3af" />}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                            <Text style={styles.docCat}>{doc.category_display}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                }
                <Text style={styles.docsHint}>Shared automatically when you book.</Text>
              </View>
            )}
          </View>
        )}

        {/* Reason */}
        <Text style={styles.label}>Reason for Visit</Text>
        <View style={styles.textAreaBox}>
          <MessageSquare size={20} color="#16a34a" style={styles.textAreaIcon} />
          <TextInput style={styles.textAreaInput} placeholder="e.g., Regular checkup, fever..." placeholderTextColor="#9ca3af" value={reason} onChangeText={setReason} multiline numberOfLines={2} />
        </View>

        {/* Symptoms */}
        <Text style={styles.label}>Symptoms / Notes</Text>
        <View style={styles.textAreaBox}>
          <FileText size={20} color="#16a34a" style={styles.textAreaIcon} />
          <TextInput style={[styles.textAreaInput, { minHeight: 90 }]} placeholder="Describe your symptoms..." placeholderTextColor="#9ca3af" value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
        </View>

        {/* Book Button */}
        <TouchableOpacity style={[styles.bookButton, loading && styles.bookButtonDisabled]} onPress={handleBookAppointment} disabled={loading || loadingDetails}>
          {loading ? <ActivityIndicator color="#fff" /> : <><CheckCircle size={22} color="#fff" /><Text style={styles.bookText}>Confirm Appointment</Text></>}
        </TouchableOpacity>
      </View>

      {/* ── Doctor Selection Modal ── */}
      <Modal visible={showDoctorModal} animationType="slide" transparent onRequestClose={() => setShowDoctorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a Doctor</Text>
              <TouchableOpacity onPress={() => setShowDoctorModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Search size={18} color="#9ca3af" />
              <TextInput style={styles.searchInput} placeholder="Search by name or specialization..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            {loadingDoctors
              ? <ActivityIndicator size="large" color="#16a34a" style={{ padding: 40 }} />
              : <SectionList
                  sections={sections}
                  keyExtractor={item => item.id.toString()}
                  renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                      <Stethoscope size={13} color="#16a34a" />
                      <Text style={styles.sectionHeaderText}>{section.title}</Text>
                      <View style={styles.sectionCount}><Text style={styles.sectionCountText}>{section.data.length}</Text></View>
                    </View>
                  )}
                  renderItem={({ item }) => renderDoctorRow(item)}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
                  ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>}
                />
            }
          </View>
        </View>
      </Modal>

      {/* ── Doctor Profile Modal ── */}
      <DoctorProfileModal
        visible={profileModalVisible}
        doctor={profileDoctor}
        onClose={() => setProfileModalVisible(false)}
        onSelect={handleSelectDoctor}
      />

      {/* ── Date Modal ── */}
      <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {generateDateOptions().map((opt, i) => (
                <TouchableOpacity key={i} style={[styles.listItem, date === opt.value && styles.listItemSelected]} onPress={() => { setDate(opt.value); setShowDateModal(false); }}>
                  <Calendar size={17} color={date === opt.value ? '#fff' : '#14532d'} />
                  <Text style={[styles.listItemText, date === opt.value && { color: '#fff' }]}>{opt.display}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Time Modal ── */}
      <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            {loadingSlots
              ? <ActivityIndicator size="large" color="#16a34a" style={{ padding: 40 }} />
              : availableSlots.length > 0
                ? <FlatList data={availableSlots} keyExtractor={(_, i) => i.toString()} renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.listItem, time === item && styles.listItemSelected]} onPress={() => { setTime(item); setShowTimeModal(false); }}>
                      <Clock size={17} color={time === item ? '#fff' : '#14532d'} />
                      <Text style={[styles.listItemText, time === item && { color: '#fff' }]}>{item}</Text>
                    </TouchableOpacity>
                  )} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }} />
                : <Text style={styles.emptyText}>No slots available for this date.</Text>
            }
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
  pageTitle:   { fontSize: 22, fontWeight: 'bold', color: '#14532d', marginTop: 20, marginBottom: 20 },
  card:        { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3, marginBottom: 30 },
  label:       { fontSize: 15, fontWeight: '600', color: '#166534', marginBottom: 8, marginTop: 16 },
  selector:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 14, backgroundColor: '#dcfce7' },
  selectorText:{ fontSize: 15, color: '#14532d', marginLeft: 10, flex: 1 },
  placeholder: { color: '#9ca3af' },
  doctorRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  doctorRowSelected: { backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 6 },
  docAvatar:   { marginRight: 10 },
  docAvatarImg:{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#bbf7d0' },
  docAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f4c81', justifyContent: 'center', alignItems: 'center' },
  doctorRowName: { fontSize: 15, fontWeight: '600', color: '#14532d' },
  doctorRowSub:  { fontSize: 12, color: '#6b7280', marginTop: 2 },
  viewProfileBtn:{ backgroundColor: '#e8f0fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  viewProfileText:{ fontSize: 12, fontWeight: '600', color: '#0f4c81' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, marginTop: 8 },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', color: '#14532d', flex: 1, textTransform: 'capitalize' },
  sectionCount:  { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  sectionCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  attachToggle:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 14, backgroundColor: '#eff6ff' },
  attachLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  attachText:  { fontSize: 14, fontWeight: '600', color: '#0f4c81', flex: 1 },
  attachArrow: { fontSize: 12, color: '#6b7280', marginLeft: 6 },
  countBadge:  { backgroundColor: '#0f4c81', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6 },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  docsList:    { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, marginTop: 6 },
  docItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  docItemSelected: { backgroundColor: '#eff6ff' },
  docTitle:    { fontSize: 14, fontWeight: '600', color: '#1e3a5f' },
  docCat:      { fontSize: 12, color: '#6b7280', marginTop: 1 },
  docsEmpty:   { fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 16 },
  docsHint:    { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
  textAreaBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14 },
  textAreaIcon:{ marginTop: 14, marginRight: 8 },
  textAreaInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#14532d', minHeight: 60, textAlignVertical: 'top' },
  bookButton:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 30, marginTop: 28, marginBottom: 8, gap: 8, elevation: 3 },
  bookButtonDisabled: { backgroundColor: '#bbf7d0' },
  bookText:    { color: '#fff', fontWeight: '700', fontSize: 17 },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
  modalTitle:  { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, margin: 16, paddingHorizontal: 12, backgroundColor: '#f0fdf4' },
  searchInput: { flex: 1, paddingVertical: 11, paddingLeft: 8, fontSize: 15, color: '#14532d' },
  listItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0fdf4', gap: 10 },
  listItemSelected: { backgroundColor: '#16a34a', borderRadius: 10 },
  listItemText:{ fontSize: 15, color: '#14532d' },
  emptyText:   { textAlign: 'center', color: '#9ca3af', fontSize: 15, padding: 40 },
});