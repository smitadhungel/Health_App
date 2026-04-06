// import React, { useState, useEffect } from "react";
// import {
//     View, Text, TextInput, StyleSheet, TouchableOpacity,
//     ScrollView, Alert, FlatList, Modal, ActivityIndicator,
// } from 'react-native';
// import { useNavigation } from "@react-navigation/native";
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { useRemindersContext } from "../../context/RemindersContext";
// import {
//     Calendar, Clock, User, FileText, MessageSquare,
//     X, ChevronRight, CheckCircle, Search,
// } from 'lucide-react-native';

// const API_BASE_URL = 'http://192.168.100.9:8000/api';

// interface Doctor {
//     id: number;
//     user?: { first_name: string; last_name: string; email: string };
//     full_name?: string;
//     first_name?: string;
//     last_name?: string;
//     name?: string;
//     specialization?: string;
//     specialty?: string;
//     hospital?: string;
//     clinic?: string;
//     clinic_address?: string;
// }

// interface User {
//     id: number;
//     first_name: string;
//     last_name: string;
//     email: string;
//     user_type: string;
// }

// interface AppointmentData {
//     doctor: number;
//     appointment_date: string;
//     appointment_time: string;
//     reason: string;
//     symptoms?: string;
//     duration_minutes?: number;
// }

// const getDoctorDisplayName = (doctor: Doctor): string => {
//     if (doctor.full_name) return `Dr. ${doctor.full_name}`;
//     if (doctor.user?.first_name && doctor.user?.last_name) return `Dr. ${doctor.user.first_name} ${doctor.user.last_name}`;
//     if (doctor.user?.first_name) return `Dr. ${doctor.user.first_name}`;
//     if (doctor.first_name && doctor.last_name) return `Dr. ${doctor.first_name} ${doctor.last_name}`;
//     if (doctor.first_name) return `Dr. ${doctor.first_name}`;
//     if (doctor.name) return `Dr. ${doctor.name}`;
//     if (doctor.specialization) return `Dr. (${doctor.specialization})`;
//     return `Doctor #${doctor.id}`;
// };

// export default function BookAppointmentScreen() {
//     const navigation = useNavigation();
//     const { refresh } = useRemindersContext(); // ← added

//     const [doctorName, setDoctorName] = useState<string>('');
//     const [date, setDate] = useState<string>('');
//     const [time, setTime] = useState<string>('');
//     const [reason, setReason] = useState<string>('');
//     const [notes, setNotes] = useState<string>('');
//     const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
//     const [loading, setLoading] = useState<boolean>(false);
//     const [loadingDoctorDetails, setLoadingDoctorDetails] = useState<boolean>(false);
//     const [showDateModal, setShowDateModal] = useState<boolean>(false);
//     const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
//     const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);
//     const [doctors, setDoctors] = useState<Doctor[]>([]);
//     const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
//     const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);
//     const [availableSlots, setAvailableSlots] = useState<string[]>([]);
//     const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
//     const [user, setUser] = useState<User | null>(null);

//     useEffect(() => {
//         loadUserData();
//         fetchDoctors();
//         const now = new Date();
//         setDate(now.toISOString().split('T')[0]);
//         setTime('');
//     }, []);

//     const loadUserData = async () => {
//         try {
//             const userData = await AsyncStorage.getItem('user');
//             if (userData) setUser(JSON.parse(userData));
//         } catch (error) {
//             console.error('Error loading user data:', error);
//         }
//     };

//     const fetchDoctors = async () => {
//         setLoadingDoctors(true);
//         try {
//             const token = await AsyncStorage.getItem('access_token');
//             if (!token) { Alert.alert('Authentication Required', 'Please login again'); navigation.goBack(); return; }
//             const response = await axios.get(`${API_BASE_URL}/doctors/`, { headers: { Authorization: `Bearer ${token}` } });
//             console.log('Doctors response:', response.data);
//             let doctorsList: Doctor[] = [];
//             if (Array.isArray(response.data)) doctorsList = response.data;
//             else if (response.data?.results) doctorsList = response.data.results;
//             else if (response.data?.data) doctorsList = response.data.data;
//             else if (response.data?.doctors) doctorsList = response.data.doctors;
//             setDoctors(doctorsList);
//             setFilteredDoctors(doctorsList);
//         } catch (error: any) {
//             console.error('Error fetching doctors:', error);
//             Alert.alert('Error', 'Failed to load doctors. Please try again.');
//         } finally {
//             setLoadingDoctors(false);
//         }
//     };

//     const fetchDoctorDetails = async (doctorId: number): Promise<Doctor | null> => {
//         try {
//             const token = await AsyncStorage.getItem('access_token');
//             if (!token) return null;
//             const response = await axios.get(`${API_BASE_URL}/doctors/${doctorId}/`, { headers: { Authorization: `Bearer ${token}` } });
//             console.log('Doctor details:', response.data);
//             return response.data;
//         } catch (error) {
//             console.error('Error fetching doctor details:', error);
//             return null;
//         }
//     };

//     const fetchAvailableSlots = async (doctorId: number, selectedDate: string) => {
//         setLoadingSlots(true);
//         try {
//             const token = await AsyncStorage.getItem('access_token');
//             if (!token) return;
//             const response = await axios.get(`${API_BASE_URL}/appointments/available-slots/${doctorId}/`, {
//                 params: { date: selectedDate },
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             console.log('Available slots raw response:', response.data);
//             let slotsArray: string[] = [];
//             if (Array.isArray(response.data)) {
//                 slotsArray = response.data;
//             } else if (response.data && typeof response.data === 'object') {
//                 if (Array.isArray(response.data.available_slots)) {
//                     slotsArray = response.data.available_slots
//                         .filter((slot: any) => slot.available !== false)
//                         .map((slot: any) => slot.time);
//                 } else if (Array.isArray(response.data.slots)) {
//                     slotsArray = response.data.slots;
//                 } else if (Array.isArray(response.data.times)) {
//                     slotsArray = response.data.times;
//                 }
//             }
//             setAvailableSlots(slotsArray);
//             setTime('');
//         } catch (error) {
//             console.error('Error fetching available slots:', error);
//             setAvailableSlots([]);
//             Alert.alert('Error', 'Failed to load available time slots.');
//         } finally {
//             setLoadingSlots(false);
//         }
//     };

//     useEffect(() => {
//         if (selectedDoctor && date) fetchAvailableSlots(selectedDoctor.id, date);
//         else { setAvailableSlots([]); setTime(''); }
//     }, [selectedDoctor, date]);

//     useEffect(() => {
//         if (doctorName.trim() === '') {
//             setFilteredDoctors(doctors);
//         } else {
//             const searchLower = doctorName.toLowerCase();
//             setFilteredDoctors(doctors.filter(doctor => {
//                 const displayName = getDoctorDisplayName(doctor).toLowerCase();
//                 const spec = (doctor.specialization || doctor.specialty || '').toLowerCase();
//                 return displayName.includes(searchLower) || spec.includes(searchLower) || doctor.id.toString().includes(searchLower);
//             }));
//         }
//     }, [doctorName, doctors]);

//     const handleSelectDoctor = async (doctor: Doctor) => {
//         setShowDoctorModal(false);
//         setLoadingDoctorDetails(true);
//         const fullDetails = await fetchDoctorDetails(doctor.id);
//         if (fullDetails) {
//             setSelectedDoctor(fullDetails);
//             setDoctorName(getDoctorDisplayName(fullDetails));
//         } else {
//             setSelectedDoctor(doctor);
//             setDoctorName(getDoctorDisplayName(doctor));
//             Alert.alert('Warning', 'Could not fetch full doctor details. Using limited info.');
//         }
//         setLoadingDoctorDetails(false);
//     };

//     const generateDateOptions = (): Array<{ value: string; display: string }> => {
//         const options: Array<{ value: string; display: string }> = [];
//         const today = new Date();
//         for (let i = 0; i < 30; i++) {
//             const d = new Date(today);
//             d.setDate(today.getDate() + i);
//             options.push({
//                 value: d.toISOString().split('T')[0],
//                 display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
//             });
//         }
//         return options;
//     };

//     const handleBookAppointment = async () => {
//         if (!selectedDoctor) { Alert.alert('Error', 'Please select a doctor'); return; }
//         if (!date) { Alert.alert('Error', 'Please select a date'); return; }
//         if (!time) { Alert.alert('Error', 'Please select a time slot'); return; }
//         if (!reason.trim()) { Alert.alert('Error', 'Please enter the reason for appointment'); return; }

//         setLoading(true);
//         try {
//             const token = await AsyncStorage.getItem('access_token');
//             if (!token) { Alert.alert('Error', 'Authentication required. Please login again.'); navigation.goBack(); return; }

//             const appointmentData: AppointmentData = {
//                 doctor: selectedDoctor.id,
//                 appointment_date: date,
//                 appointment_time: time,
//                 reason: reason.trim(),
//                 symptoms: notes.trim(),
//                 duration_minutes: 30,
//             };

//             console.log('Sending appointment data:', appointmentData);
//             const response = await axios.post(`${API_BASE_URL}/appointments/book/`, appointmentData, {
//                 headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//             });
//             console.log('Appointment response:', response.data);

//             refresh(); // ← reschedule reminders so new appointment notifications are set

//             Alert.alert('Success', 'Appointment booked successfully!', [
//                 { text: 'OK', onPress: () => navigation.goBack() },
//             ]);
//         } catch (error: any) {
//             console.error('Booking error:', error);
//             if (error.response) {
//                 const errorData = error.response.data;
//                 let errorMessage = 'Failed to book appointment.';
//                 if (typeof errorData === 'string') errorMessage = errorData;
//                 else if (errorData.detail) errorMessage = errorData.detail;
//                 else if (errorData.message) errorMessage = errorData.message;
//                 else if (errorData.error) errorMessage = errorData.error;
//                 else if (errorData.non_field_errors) errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
//                 else {
//                     const firstKey = Object.keys(errorData)[0];
//                     if (firstKey) {
//                         const fieldError = errorData[firstKey];
//                         errorMessage = `${firstKey}: ${Array.isArray(fieldError) ? fieldError[0] : fieldError}`;
//                     }
//                 }
//                 Alert.alert('Booking Failed', errorMessage);
//             } else if (error.request) {
//                 Alert.alert('Network Error', 'No response from server. Please check your connection.');
//             } else {
//                 Alert.alert('Error', 'Failed to book appointment. Please try again.');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const renderDoctorItem = ({ item }: { item: Doctor }) => (
//         <TouchableOpacity style={styles.doctorItem} onPress={() => handleSelectDoctor(item)} disabled={loadingDoctorDetails}>
//             <View style={styles.doctorInfo}>
//                 <Text style={styles.doctorName}>{getDoctorDisplayName(item)}</Text>
//                 <Text style={styles.doctorSpecialization}>{item.specialization || item.specialty || 'General'}</Text>
//                 {(item.hospital || item.clinic_address || item.clinic) && (
//                     <Text style={styles.doctorHospital}>{item.hospital || item.clinic_address || item.clinic}</Text>
//                 )}
//             </View>
//             <ChevronRight size={20} color="#16a34a" />
//         </TouchableOpacity>
//     );

//     const renderTimeSlot = ({ item }: { item: string }) => (
//         <TouchableOpacity style={[styles.timeOption, time === item && styles.selectedOption]} onPress={() => { setTime(item); setShowTimeModal(false); }}>
//             <Clock size={18} color={time === item ? "#fff" : "#14532d"} />
//             <Text style={[styles.timeOptionText, time === item && styles.selectedOptionText]}>{item}</Text>
//         </TouchableOpacity>
//     );

//     const renderDateModal = () => (
//         <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
//             <View style={styles.modalContainer}>
//                 <View style={styles.modalContent}>
//                     <View style={styles.modalHeader}>
//                         <Text style={styles.modalTitle}>Select Date</Text>
//                         <TouchableOpacity onPress={() => setShowDateModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
//                     </View>
//                     <ScrollView style={styles.modalScroll}>
//                         {generateDateOptions().map((dateOption, index) => (
//                             <TouchableOpacity key={index} style={[styles.dateOption, date === dateOption.value && styles.selectedOption]}
//                                 onPress={() => { setDate(dateOption.value); setShowDateModal(false); }}>
//                                 <Calendar size={18} color={date === dateOption.value ? "#fff" : "#14532d"} />
//                                 <Text style={[styles.dateOptionText, date === dateOption.value && styles.selectedOptionText]}>{dateOption.display}</Text>
//                             </TouchableOpacity>
//                         ))}
//                     </ScrollView>
//                 </View>
//             </View>
//         </Modal>
//     );

//     const renderTimeModal = () => (
//         <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
//             <View style={styles.modalContainer}>
//                 <View style={styles.modalContent}>
//                     <View style={styles.modalHeader}>
//                         <Text style={styles.modalTitle}>Select Time</Text>
//                         <TouchableOpacity onPress={() => setShowTimeModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
//                     </View>
//                     {loadingSlots ? (
//                         <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
//                     ) : availableSlots.length > 0 ? (
//                         <FlatList data={availableSlots} renderItem={renderTimeSlot} keyExtractor={(item, index) => index.toString()} contentContainerStyle={styles.doctorsList} />
//                     ) : (
//                         <Text style={styles.emptyText}>No available slots for this date.</Text>
//                     )}
//                 </View>
//             </View>
//         </Modal>
//     );

//     return (
//         <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//             <Text style={styles.title}>Book Appointment</Text>
//             <View style={styles.card}>
//                 {/* Doctor Selection */}
//                 <Text style={styles.label}>Select Doctor</Text>
//                 <TouchableOpacity style={styles.selector} onPress={() => setShowDoctorModal(true)} disabled={loadingDoctorDetails}>
//                     <User size={20} color="#16a34a" />
//                     {loadingDoctorDetails ? (
//                         <ActivityIndicator size="small" color="#16a34a" style={styles.selectorText} />
//                     ) : doctorName ? (
//                         <Text style={styles.selectorText}>{doctorName}</Text>
//                     ) : (
//                         <Text style={styles.placeholderText}>Tap to select a doctor</Text>
//                     )}
//                 </TouchableOpacity>

//                 <Modal visible={showDoctorModal} animationType="slide" transparent onRequestClose={() => setShowDoctorModal(false)}>
//                     <View style={styles.modalContainer}>
//                         <View style={styles.modalContent}>
//                             <View style={styles.modalHeader}>
//                                 <Text style={styles.modalTitle}>Select Doctor</Text>
//                                 <TouchableOpacity onPress={() => setShowDoctorModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
//                             </View>
//                             <View style={styles.searchContainer}>
//                                 <Search size={20} color="#9ca3af" />
//                                 <TextInput style={styles.searchInput} placeholder="Search by name or specialization..." placeholderTextColor="#9ca3af"
//                                     value={doctorName} onChangeText={setDoctorName} autoFocus />
//                             </View>
//                             {loadingDoctors ? (
//                                 <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
//                             ) : (
//                                 <FlatList data={filteredDoctors} renderItem={renderDoctorItem} keyExtractor={item => item.id.toString()}
//                                     contentContainerStyle={styles.doctorsList} ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>} />
//                             )}
//                         </View>
//                     </View>
//                 </Modal>

//                 {/* Date */}
//                 <Text style={styles.label}>Appointment Date</Text>
//                 <TouchableOpacity style={styles.selector} onPress={() => setShowDateModal(true)}>
//                     <Calendar size={20} color="#16a34a" />
//                     <Text style={styles.selectorText}>
//                         {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select Date'}
//                     </Text>
//                 </TouchableOpacity>
//                 {renderDateModal()}

//                 {/* Time */}
//                 <Text style={styles.label}>Appointment Time</Text>
//                 <TouchableOpacity style={styles.selector} onPress={() => {
//                     if (!selectedDoctor) { Alert.alert('Info', 'Please select a doctor first.'); return; }
//                     if (!date) { Alert.alert('Info', 'Please select a date first.'); return; }
//                     setShowTimeModal(true);
//                 }}>
//                     <Clock size={20} color="#16a34a" />
//                     <Text style={styles.selectorText}>{time || 'Select Time'}</Text>
//                 </TouchableOpacity>
//                 {renderTimeModal()}

//                 {/* Reason */}
//                 <Text style={styles.label}>Reason for Visit</Text>
//                 <View style={styles.textAreaContainer}>
//                     <MessageSquare size={20} color="#16a34a" style={styles.textAreaIcon} />
//                     <TextInput style={styles.textAreaInput} placeholder="e.g., Regular checkup, fever, headache..."
//                         placeholderTextColor="#9ca3af" value={reason} onChangeText={setReason} multiline numberOfLines={2} />
//                 </View>

//                 {/* Symptoms */}
//                 <Text style={styles.label}>Symptoms / Additional Notes</Text>
//                 <View style={styles.textAreaContainer}>
//                     <FileText size={20} color="#16a34a" style={styles.textAreaIcon} />
//                     <TextInput style={[styles.textAreaInput, styles.symptomsInput]} placeholder="Describe your symptoms..."
//                         placeholderTextColor="#9ca3af" value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
//                 </View>

//                 {/* Book Button */}
//                 <TouchableOpacity style={[styles.bookButton, loading && styles.disabledButton]}
//                     onPress={handleBookAppointment} disabled={loading || loadingDoctorDetails || loadingSlots}>
//                     {loading ? <ActivityIndicator color="#fff" /> : (
//                         <>
//                             <CheckCircle size={22} color="#fff" />
//                             <Text style={styles.bookButtonText}>Confirm Appointment</Text>
//                         </>
//                     )}
//                 </TouchableOpacity>
//             </View>
//         </ScrollView>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
//     title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#14532d', marginLeft: 20, marginTop: 20 },
//     card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, elevation: 3 },
//     label: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 16, color: '#166534' },
//     selector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 14, backgroundColor: '#dcfce7' },
//     selectorText: { fontSize: 16, color: '#14532d', marginLeft: 10, flex: 1 },
//     placeholderText: { fontSize: 16, color: '#9ca3af', marginLeft: 10 },
//     textAreaContainer: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#ffffff', paddingHorizontal: 14 },
//     textAreaIcon: { marginTop: 14, marginRight: 8 },
//     textAreaInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#14532d', minHeight: 60, textAlignVertical: 'top' },
//     symptomsInput: { minHeight: 100 },
//     bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 30, marginTop: 30, marginBottom: 10, elevation: 3 },
//     disabledButton: { backgroundColor: '#bbf7d0' },
//     bookButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 18, marginLeft: 8 },
//     modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
//     modalContent: { backgroundColor: '#ffffff', borderRadius: 16, maxHeight: '80%', overflow: 'hidden' },
//     modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
//     modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
//     modalScroll: { maxHeight: 400 },
//     searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, margin: 16, paddingHorizontal: 12, backgroundColor: '#f0fdf4' },
//     searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 16, color: '#14532d' },
//     doctorsList: { paddingHorizontal: 16, paddingBottom: 16 },
//     doctorItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
//     doctorInfo: { flex: 1 },
//     doctorName: { fontSize: 16, fontWeight: '600', color: '#14532d', marginBottom: 4 },
//     doctorSpecialization: { fontSize: 14, color: '#16a34a', marginBottom: 4 },
//     doctorHospital: { fontSize: 12, color: '#6b7280' },
//     loader: { padding: 40 },
//     emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 16, padding: 40 },
//     dateOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
//     timeOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
//     dateOptionText: { fontSize: 16, color: '#14532d', marginLeft: 12 },
//     timeOptionText: { fontSize: 16, color: '#14532d', marginLeft: 12 },
//     selectedOption: { backgroundColor: '#16a34a' },
//     selectedOptionText: { color: '#ffffff', fontWeight: '600' },
// });



import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ScrollView, Alert, FlatList, Modal, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRemindersContext } from '../../context/RemindersContext';
import { documentsAPI } from '../../services/api';
import {
    Calendar, Clock, User, FileText, MessageSquare,
    X, ChevronRight, CheckCircle, Search,
    Paperclip, CheckSquare, Square,
} from 'lucide-react-native';

const API_BASE_URL = 'http://192.168.100.9:8000/api';

interface Doctor {
    id: number;
    user?: { first_name: string; last_name: string; email: string };
    full_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    specialization?: string;
    specialty?: string;
    hospital?: string;
    clinic?: string;
    clinic_address?: string;
}

interface MyDocument {
    id: number;
    title: string;
    category: string;
    category_display: string;
    file_size: number;
}

interface AppointmentData {
    doctor: number;
    appointment_date: string;
    appointment_time: string;
    reason: string;
    symptoms?: string;
    duration_minutes?: number;
}

const getDoctorDisplayName = (doctor: Doctor): string => {
    if (doctor.full_name) return `Dr. ${doctor.full_name}`;
    if (doctor.user?.first_name && doctor.user?.last_name) return `Dr. ${doctor.user.first_name} ${doctor.user.last_name}`;
    if (doctor.user?.first_name) return `Dr. ${doctor.user.first_name}`;
    if (doctor.first_name && doctor.last_name) return `Dr. ${doctor.first_name} ${doctor.last_name}`;
    if (doctor.first_name) return `Dr. ${doctor.first_name}`;
    if (doctor.name) return `Dr. ${doctor.name}`;
    if (doctor.specialization) return `Dr. (${doctor.specialization})`;
    return `Doctor #${doctor.id}`;
};

export default function BookAppointmentScreen() {
    const navigation = useNavigation();
    const { refresh } = useRemindersContext();

    // Appointment state
    const [doctorName, setDoctorName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingDoctorDetails, setLoadingDoctorDetails] = useState(false);

    // Modal visibility
    const [showDateModal, setShowDateModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showDoctorModal, setShowDoctorModal] = useState(false);

    // Doctors & slots
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Document attachment state
    const [myDocuments, setMyDocuments] = useState<MyDocument[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [docsExpanded, setDocsExpanded] = useState(false);

    useEffect(() => {
        fetchDoctors();
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
    }, []);

    // ─── Doctors ────────────────────────────────────────────
    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) { Alert.alert('Authentication Required', 'Please login again'); navigation.goBack(); return; }
            const response = await axios.get(`${API_BASE_URL}/doctors/`, { headers: { Authorization: `Bearer ${token}` } });
            let list: Doctor[] = [];
            if (Array.isArray(response.data)) list = response.data;
            else if (response.data?.doctors) list = response.data.doctors;
            else if (response.data?.results) list = response.data.results;
            setDoctors(list);
            setFilteredDoctors(list);
        } catch {
            Alert.alert('Error', 'Failed to load doctors. Please try again.');
        } finally {
            setLoadingDoctors(false);
        }
    };

    const fetchDoctorDetails = async (doctorId: number): Promise<Doctor | null> => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return null;
            const response = await axios.get(`${API_BASE_URL}/doctors/${doctorId}/`, { headers: { Authorization: `Bearer ${token}` } });
            return response.data;
        } catch {
            return null;
        }
    };

    // ─── Available Slots ────────────────────────────────────
    const fetchAvailableSlots = async (doctorId: number, selectedDate: string) => {
        setLoadingSlots(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;
            const response = await axios.get(`${API_BASE_URL}/appointments/available-slots/${doctorId}/`, {
                params: { date: selectedDate },
                headers: { Authorization: `Bearer ${token}` },
            });
            let slotsArray: string[] = [];
            if (Array.isArray(response.data)) {
                slotsArray = response.data;
            } else if (response.data?.available_slots) {
                slotsArray = response.data.available_slots
                    .filter((s: any) => s.available !== false)
                    .map((s: any) => s.time);
            } else if (response.data?.slots) {
                slotsArray = response.data.slots;
            }
            setAvailableSlots(slotsArray);
            setTime('');
        } catch {
            setAvailableSlots([]);
            Alert.alert('Error', 'Failed to load available time slots.');
        } finally {
            setLoadingSlots(false);
        }
    };

    useEffect(() => {
        if (selectedDoctor && date) fetchAvailableSlots(selectedDoctor.id, date);
        else { setAvailableSlots([]); setTime(''); }
    }, [selectedDoctor, date]);

    // ─── Doctor search filter ────────────────────────────────
    useEffect(() => {
        if (!doctorName.trim()) { setFilteredDoctors(doctors); return; }
        const q = doctorName.toLowerCase();
        setFilteredDoctors(doctors.filter(d => {
            const name = getDoctorDisplayName(d).toLowerCase();
            const spec = (d.specialization || d.specialty || '').toLowerCase();
            return name.includes(q) || spec.includes(q);
        }));
    }, [doctorName, doctors]);

    // ─── Documents ──────────────────────────────────────────
    const fetchMyDocuments = async () => {
        setLoadingDocs(true);
        try {
            const res = await documentsAPI.getMyDocuments();
            setMyDocuments((res as any).documents || []);
        } catch {
            console.error('Failed to load documents');
        } finally {
            setLoadingDocs(false);
        }
    };

    const toggleDocSelection = (docId: number) => {
        setSelectedDocIds(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    // ─── Doctor selection ────────────────────────────────────
    const handleSelectDoctor = async (doctor: Doctor) => {
        setShowDoctorModal(false);
        setLoadingDoctorDetails(true);
        setSelectedDocIds([]);

        const fullDetails = await fetchDoctorDetails(doctor.id);
        if (fullDetails) {
            setSelectedDoctor(fullDetails);
            setDoctorName(getDoctorDisplayName(fullDetails));
        } else {
            setSelectedDoctor(doctor);
            setDoctorName(getDoctorDisplayName(doctor));
        }
        setLoadingDoctorDetails(false);

        // Auto-load documents and expand section
        fetchMyDocuments();
        setDocsExpanded(true);
    };

    // ─── Book Appointment ────────────────────────────────────
    const handleBookAppointment = async () => {
        if (!selectedDoctor) { Alert.alert('Error', 'Please select a doctor'); return; }
        if (!date) { Alert.alert('Error', 'Please select a date'); return; }
        if (!time) { Alert.alert('Error', 'Please select a time slot'); return; }
        if (!reason.trim()) { Alert.alert('Error', 'Please enter the reason for appointment'); return; }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) { Alert.alert('Error', 'Authentication required.'); navigation.goBack(); return; }

            const appointmentData: AppointmentData = {
                doctor: selectedDoctor.id,
                appointment_date: date,
                appointment_time: time,
                reason: reason.trim(),
                symptoms: notes.trim(),
                duration_minutes: 30,
            };

            await axios.post(`${API_BASE_URL}/appointments/book/`, appointmentData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });

            // Share selected documents with the doctor
            if (selectedDocIds.length > 0) {
                await Promise.allSettled(
                    selectedDocIds.map(docId =>
                        documentsAPI.shareWithDoctor(docId, [selectedDoctor.id])
                    )
                );
            }

            refresh();

            Alert.alert(
                'Success! 🎉',
                selectedDocIds.length > 0
                    ? `Appointment booked and ${selectedDocIds.length} document(s) shared with the doctor!`
                    : 'Appointment booked successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            if (error.response) {
                const data = error.response.data;
                let msg = 'Failed to book appointment.';
                if (data.detail) msg = data.detail;
                else if (data.message) msg = data.message;
                else if (data.error) msg = data.error;
                else if (data.non_field_errors) msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
                else {
                    const key = Object.keys(data)[0];
                    if (key) msg = `${key}: ${Array.isArray(data[key]) ? data[key][0] : data[key]}`;
                }
                Alert.alert('Booking Failed', msg);
            } else {
                Alert.alert('Network Error', 'No response from server. Check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ─── Date options ────────────────────────────────────────
    const generateDateOptions = () => {
        const options: { value: string; display: string }[] = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            options.push({
                value: d.toISOString().split('T')[0],
                display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            });
        }
        return options;
    };

    // ─── Render helpers ──────────────────────────────────────
    const renderDoctorItem = ({ item }: { item: Doctor }) => (
        <TouchableOpacity style={styles.listItem} onPress={() => handleSelectDoctor(item)} disabled={loadingDoctorDetails}>
            <View style={{ flex: 1 }}>
                <Text style={styles.listItemTitle}>{getDoctorDisplayName(item)}</Text>
                <Text style={styles.listItemSub}>{item.specialization || item.specialty || 'General'}</Text>
                {(item.clinic_address || item.clinic) && (
                    <Text style={styles.listItemHint}>{item.clinic_address || item.clinic}</Text>
                )}
            </View>
            <ChevronRight size={20} color="#16a34a" />
        </TouchableOpacity>
    );

    const renderTimeSlot = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[styles.listItem, time === item && styles.listItemSelected]}
            onPress={() => { setTime(item); setShowTimeModal(false); }}
        >
            <Clock size={18} color={time === item ? '#fff' : '#14532d'} />
            <Text style={[styles.listItemTitle, { marginLeft: 10 }, time === item && { color: '#fff' }]}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.pageTitle}>Book Appointment</Text>

            <View style={styles.card}>

                {/* ── Doctor ── */}
                <Text style={styles.label}>Select Doctor</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setShowDoctorModal(true)} disabled={loadingDoctorDetails}>
                    <User size={20} color="#16a34a" />
                    {loadingDoctorDetails
                        ? <ActivityIndicator size="small" color="#16a34a" style={{ marginLeft: 10 }} />
                        : <Text style={[styles.selectorText, !doctorName && styles.placeholder]}>
                            {doctorName || 'Tap to select a doctor'}
                          </Text>
                    }
                </TouchableOpacity>

                {/* ── Date ── */}
                <Text style={styles.label}>Appointment Date</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setShowDateModal(true)}>
                    <Calendar size={20} color="#16a34a" />
                    <Text style={styles.selectorText}>
                        {date
                            ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            : 'Select Date'}
                    </Text>
                </TouchableOpacity>

                {/* ── Time ── */}
                <Text style={styles.label}>Appointment Time</Text>
                <TouchableOpacity
                    style={styles.selector}
                    onPress={() => {
                        if (!selectedDoctor) { Alert.alert('Info', 'Please select a doctor first.'); return; }
                        if (!date) { Alert.alert('Info', 'Please select a date first.'); return; }
                        setShowTimeModal(true);
                    }}
                >
                    <Clock size={20} color="#16a34a" />
                    <Text style={[styles.selectorText, !time && styles.placeholder]}>
                        {time || 'Select Time'}
                    </Text>
                </TouchableOpacity>

                {/* ── Attach Documents (shows after doctor is selected) ── */}
                {selectedDoctor && (
                    <View>
                        <Text style={styles.label}>Attach Documents</Text>

                        <TouchableOpacity
                            style={styles.attachToggle}
                            onPress={() => {
                                if (myDocuments.length === 0) fetchMyDocuments();
                                setDocsExpanded(prev => !prev);
                            }}
                        >
                            <View style={styles.attachToggleLeft}>
                                <Paperclip size={18} color="#0f4c81" />
                                <Text style={styles.attachToggleText}>
                                    {selectedDocIds.length > 0
                                        ? `${selectedDocIds.length} document(s) selected`
                                        : 'Select reports to share with doctor'}
                                </Text>
                            </View>
                            {selectedDocIds.length > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{selectedDocIds.length}</Text>
                                </View>
                            )}
                            <Text style={styles.attachToggleArrow}>{docsExpanded ? '▲' : '▼'}</Text>
                        </TouchableOpacity>

                        {docsExpanded && (
                            <View style={styles.docsList}>
                                {loadingDocs ? (
                                    <ActivityIndicator color="#0f4c81" style={{ marginVertical: 16 }} />
                                ) : myDocuments.length === 0 ? (
                                    <Text style={styles.docsEmpty}>
                                        No documents uploaded yet. Go to My Documents to upload first.
                                    </Text>
                                ) : (
                                    myDocuments.map(doc => {
                                        const selected = selectedDocIds.includes(doc.id);
                                        return (
                                            <TouchableOpacity
                                                key={doc.id}
                                                style={[styles.docItem, selected && styles.docItemSelected]}
                                                onPress={() => toggleDocSelection(doc.id)}
                                            >
                                                {selected
                                                    ? <CheckSquare size={22} color="#0f4c81" />
                                                    : <Square size={22} color="#9ca3af" />
                                                }
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                                                    <Text style={styles.docCategory}>{doc.category_display}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                                <Text style={styles.docsHint}>
                                    Selected documents will be shared with the doctor automatically when you book.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Reason ── */}
                <Text style={styles.label}>Reason for Visit</Text>
                <View style={styles.textAreaBox}>
                    <MessageSquare size={20} color="#16a34a" style={styles.textAreaIcon} />
                    <TextInput
                        style={styles.textAreaInput}
                        placeholder="e.g., Regular checkup, fever, headache..."
                        placeholderTextColor="#9ca3af"
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={2}
                    />
                </View>

                {/* ── Symptoms ── */}
                <Text style={styles.label}>Symptoms / Additional Notes</Text>
                <View style={styles.textAreaBox}>
                    <FileText size={20} color="#16a34a" style={styles.textAreaIcon} />
                    <TextInput
                        style={[styles.textAreaInput, { minHeight: 100 }]}
                        placeholder="Describe your symptoms..."
                        placeholderTextColor="#9ca3af"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* ── Book Button ── */}
                <TouchableOpacity
                    style={[styles.bookButton, loading && styles.bookButtonDisabled]}
                    onPress={handleBookAppointment}
                    disabled={loading || loadingDoctorDetails || loadingSlots}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <CheckCircle size={22} color="#fff" />
                            <Text style={styles.bookButtonText}>Confirm Appointment</Text>
                          </>
                    }
                </TouchableOpacity>
            </View>

            {/* ── Doctor Modal ── */}
            <Modal visible={showDoctorModal} animationType="slide" transparent onRequestClose={() => setShowDoctorModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Doctor</Text>
                            <TouchableOpacity onPress={() => setShowDoctorModal(false)}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchBox}>
                            <Search size={20} color="#9ca3af" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or specialization..."
                                placeholderTextColor="#9ca3af"
                                value={doctorName}
                                onChangeText={setDoctorName}
                                autoFocus
                            />
                        </View>
                        {loadingDoctors
                            ? <ActivityIndicator size="large" color="#16a34a" style={styles.modalLoader} />
                            : <FlatList
                                data={filteredDoctors}
                                renderItem={renderDoctorItem}
                                keyExtractor={item => item.id.toString()}
                                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                                ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>}
                              />
                        }
                    </View>
                </View>
            </Modal>

            {/* ── Date Modal ── */}
            <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {generateDateOptions().map((opt, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.listItem, date === opt.value && styles.listItemSelected]}
                                    onPress={() => { setDate(opt.value); setShowDateModal(false); }}
                                >
                                    <Calendar size={18} color={date === opt.value ? '#fff' : '#14532d'} />
                                    <Text style={[styles.listItemTitle, { marginLeft: 10 }, date === opt.value && { color: '#fff' }]}>
                                        {opt.display}
                                    </Text>
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
                            <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        {loadingSlots
                            ? <ActivityIndicator size="large" color="#16a34a" style={styles.modalLoader} />
                            : availableSlots.length > 0
                                ? <FlatList
                                    data={availableSlots}
                                    renderItem={renderTimeSlot}
                                    keyExtractor={(item, i) => i.toString()}
                                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                                  />
                                : <Text style={styles.emptyText}>No available slots for this date.</Text>
                        }
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container:          { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
    pageTitle:          { fontSize: 26, fontWeight: 'bold', color: '#14532d', marginTop: 20, marginBottom: 20 },
    card:               { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3, marginBottom: 30 },

    label:              { fontSize: 15, fontWeight: '600', color: '#166534', marginBottom: 8, marginTop: 16 },
    selector: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#bbf7d0',
        borderRadius: 12, padding: 14, backgroundColor: '#dcfce7',
    },
    selectorText:       { fontSize: 15, color: '#14532d', marginLeft: 10, flex: 1 },
    placeholder:        { color: '#9ca3af' },

    // Document attachment
    attachToggle: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#bfdbfe',
        borderRadius: 12, padding: 14, backgroundColor: '#eff6ff',
    },
    attachToggleLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
    attachToggleText:   { fontSize: 14, fontWeight: '600', color: '#0f4c81', flex: 1 },
    attachToggleArrow:  { fontSize: 12, color: '#6b7280', marginLeft: 6 },
    countBadge: {
        backgroundColor: '#0f4c81', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2, marginRight: 6,
    },
    countBadgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
    docsList: {
        backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e2e8f0',
        padding: 10, marginTop: 6,
    },
    docItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 8,
        borderRadius: 8, marginBottom: 4,
    },
    docItemSelected:    { backgroundColor: '#eff6ff' },
    docTitle:           { fontSize: 14, fontWeight: '600', color: '#1e3a5f' },
    docCategory:        { fontSize: 12, color: '#6b7280', marginTop: 1 },
    docsEmpty:          { fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 16 },
    docsHint:           { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },

    // Text areas
    textAreaBox: {
        flexDirection: 'row', alignItems: 'flex-start',
        borderWidth: 1, borderColor: '#bbf7d0',
        borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14,
    },
    textAreaIcon:       { marginTop: 14, marginRight: 8 },
    textAreaInput:      { flex: 1, paddingVertical: 12, fontSize: 15, color: '#14532d', minHeight: 60, textAlignVertical: 'top' },

    // Book button
    bookButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#16a34a', paddingVertical: 16,
        borderRadius: 30, marginTop: 28, marginBottom: 8, elevation: 3,
    },
    bookButtonDisabled: { backgroundColor: '#bbf7d0' },
    bookButtonText:     { color: '#fff', fontWeight: '600', fontSize: 17, marginLeft: 8 },

    // Modals
    modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalBox:           { backgroundColor: '#fff', borderRadius: 16, maxHeight: '80%', overflow: 'hidden' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: '#ecfdf5',
    },
    modalTitle:         { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
    modalLoader:        { padding: 40 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#bbf7d0',
        borderRadius: 12, margin: 16, paddingHorizontal: 12, backgroundColor: '#f0fdf4',
    },
    searchInput:        { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 15, color: '#14532d' },

    // List items (doctors / dates / times inside modals)
    listItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#ecfdf5',
    },
    listItemSelected:   { backgroundColor: '#16a34a' },
    listItemTitle:      { fontSize: 15, fontWeight: '600', color: '#14532d' },
    listItemSub:        { fontSize: 13, color: '#16a34a', marginTop: 2 },
    listItemHint:       { fontSize: 12, color: '#6b7280', marginTop: 2 },
    emptyText:          { textAlign: 'center', color: '#9ca3af', fontSize: 15, padding: 40 },
});