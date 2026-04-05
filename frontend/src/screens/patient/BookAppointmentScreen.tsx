import React, { useState, useEffect } from "react";
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    ScrollView, Alert, FlatList, Modal, ActivityIndicator,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRemindersContext } from "../../context/RemindersContext";
import {
    Calendar, Clock, User, FileText, MessageSquare,
    X, ChevronRight, CheckCircle, Search,
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

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
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
    const { refresh } = useRemindersContext(); // ← added

    const [doctorName, setDoctorName] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingDoctorDetails, setLoadingDoctorDetails] = useState<boolean>(false);
    const [showDateModal, setShowDateModal] = useState<boolean>(false);
    const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
    const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        loadUserData();
        fetchDoctors();
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        setTime('');
    }, []);

    const loadUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) setUser(JSON.parse(userData));
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) { Alert.alert('Authentication Required', 'Please login again'); navigation.goBack(); return; }
            const response = await axios.get(`${API_BASE_URL}/doctors/`, { headers: { Authorization: `Bearer ${token}` } });
            console.log('Doctors response:', response.data);
            let doctorsList: Doctor[] = [];
            if (Array.isArray(response.data)) doctorsList = response.data;
            else if (response.data?.results) doctorsList = response.data.results;
            else if (response.data?.data) doctorsList = response.data.data;
            else if (response.data?.doctors) doctorsList = response.data.doctors;
            setDoctors(doctorsList);
            setFilteredDoctors(doctorsList);
        } catch (error: any) {
            console.error('Error fetching doctors:', error);
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
            console.log('Doctor details:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching doctor details:', error);
            return null;
        }
    };

    const fetchAvailableSlots = async (doctorId: number, selectedDate: string) => {
        setLoadingSlots(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;
            const response = await axios.get(`${API_BASE_URL}/appointments/available-slots/${doctorId}/`, {
                params: { date: selectedDate },
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Available slots raw response:', response.data);
            let slotsArray: string[] = [];
            if (Array.isArray(response.data)) {
                slotsArray = response.data;
            } else if (response.data && typeof response.data === 'object') {
                if (Array.isArray(response.data.available_slots)) {
                    slotsArray = response.data.available_slots
                        .filter((slot: any) => slot.available !== false)
                        .map((slot: any) => slot.time);
                } else if (Array.isArray(response.data.slots)) {
                    slotsArray = response.data.slots;
                } else if (Array.isArray(response.data.times)) {
                    slotsArray = response.data.times;
                }
            }
            setAvailableSlots(slotsArray);
            setTime('');
        } catch (error) {
            console.error('Error fetching available slots:', error);
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

    useEffect(() => {
        if (doctorName.trim() === '') {
            setFilteredDoctors(doctors);
        } else {
            const searchLower = doctorName.toLowerCase();
            setFilteredDoctors(doctors.filter(doctor => {
                const displayName = getDoctorDisplayName(doctor).toLowerCase();
                const spec = (doctor.specialization || doctor.specialty || '').toLowerCase();
                return displayName.includes(searchLower) || spec.includes(searchLower) || doctor.id.toString().includes(searchLower);
            }));
        }
    }, [doctorName, doctors]);

    const handleSelectDoctor = async (doctor: Doctor) => {
        setShowDoctorModal(false);
        setLoadingDoctorDetails(true);
        const fullDetails = await fetchDoctorDetails(doctor.id);
        if (fullDetails) {
            setSelectedDoctor(fullDetails);
            setDoctorName(getDoctorDisplayName(fullDetails));
        } else {
            setSelectedDoctor(doctor);
            setDoctorName(getDoctorDisplayName(doctor));
            Alert.alert('Warning', 'Could not fetch full doctor details. Using limited info.');
        }
        setLoadingDoctorDetails(false);
    };

    const generateDateOptions = (): Array<{ value: string; display: string }> => {
        const options: Array<{ value: string; display: string }> = [];
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

    const handleBookAppointment = async () => {
        if (!selectedDoctor) { Alert.alert('Error', 'Please select a doctor'); return; }
        if (!date) { Alert.alert('Error', 'Please select a date'); return; }
        if (!time) { Alert.alert('Error', 'Please select a time slot'); return; }
        if (!reason.trim()) { Alert.alert('Error', 'Please enter the reason for appointment'); return; }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) { Alert.alert('Error', 'Authentication required. Please login again.'); navigation.goBack(); return; }

            const appointmentData: AppointmentData = {
                doctor: selectedDoctor.id,
                appointment_date: date,
                appointment_time: time,
                reason: reason.trim(),
                symptoms: notes.trim(),
                duration_minutes: 30,
            };

            console.log('Sending appointment data:', appointmentData);
            const response = await axios.post(`${API_BASE_URL}/appointments/book/`, appointmentData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            console.log('Appointment response:', response.data);

            refresh(); // ← reschedule reminders so new appointment notifications are set

            Alert.alert('Success', 'Appointment booked successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            console.error('Booking error:', error);
            if (error.response) {
                const errorData = error.response.data;
                let errorMessage = 'Failed to book appointment.';
                if (typeof errorData === 'string') errorMessage = errorData;
                else if (errorData.detail) errorMessage = errorData.detail;
                else if (errorData.message) errorMessage = errorData.message;
                else if (errorData.error) errorMessage = errorData.error;
                else if (errorData.non_field_errors) errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
                else {
                    const firstKey = Object.keys(errorData)[0];
                    if (firstKey) {
                        const fieldError = errorData[firstKey];
                        errorMessage = `${firstKey}: ${Array.isArray(fieldError) ? fieldError[0] : fieldError}`;
                    }
                }
                Alert.alert('Booking Failed', errorMessage);
            } else if (error.request) {
                Alert.alert('Network Error', 'No response from server. Please check your connection.');
            } else {
                Alert.alert('Error', 'Failed to book appointment. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderDoctorItem = ({ item }: { item: Doctor }) => (
        <TouchableOpacity style={styles.doctorItem} onPress={() => handleSelectDoctor(item)} disabled={loadingDoctorDetails}>
            <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{getDoctorDisplayName(item)}</Text>
                <Text style={styles.doctorSpecialization}>{item.specialization || item.specialty || 'General'}</Text>
                {(item.hospital || item.clinic_address || item.clinic) && (
                    <Text style={styles.doctorHospital}>{item.hospital || item.clinic_address || item.clinic}</Text>
                )}
            </View>
            <ChevronRight size={20} color="#16a34a" />
        </TouchableOpacity>
    );

    const renderTimeSlot = ({ item }: { item: string }) => (
        <TouchableOpacity style={[styles.timeOption, time === item && styles.selectedOption]} onPress={() => { setTime(item); setShowTimeModal(false); }}>
            <Clock size={18} color={time === item ? "#fff" : "#14532d"} />
            <Text style={[styles.timeOptionText, time === item && styles.selectedOptionText]}>{item}</Text>
        </TouchableOpacity>
    );

    const renderDateModal = () => (
        <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Date</Text>
                        <TouchableOpacity onPress={() => setShowDateModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        {generateDateOptions().map((dateOption, index) => (
                            <TouchableOpacity key={index} style={[styles.dateOption, date === dateOption.value && styles.selectedOption]}
                                onPress={() => { setDate(dateOption.value); setShowDateModal(false); }}>
                                <Calendar size={18} color={date === dateOption.value ? "#fff" : "#14532d"} />
                                <Text style={[styles.dateOptionText, date === dateOption.value && styles.selectedOptionText]}>{dateOption.display}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderTimeModal = () => (
        <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Time</Text>
                        <TouchableOpacity onPress={() => setShowTimeModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
                    </View>
                    {loadingSlots ? (
                        <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
                    ) : availableSlots.length > 0 ? (
                        <FlatList data={availableSlots} renderItem={renderTimeSlot} keyExtractor={(item, index) => index.toString()} contentContainerStyle={styles.doctorsList} />
                    ) : (
                        <Text style={styles.emptyText}>No available slots for this date.</Text>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Book Appointment</Text>
            <View style={styles.card}>
                {/* Doctor Selection */}
                <Text style={styles.label}>Select Doctor</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setShowDoctorModal(true)} disabled={loadingDoctorDetails}>
                    <User size={20} color="#16a34a" />
                    {loadingDoctorDetails ? (
                        <ActivityIndicator size="small" color="#16a34a" style={styles.selectorText} />
                    ) : doctorName ? (
                        <Text style={styles.selectorText}>{doctorName}</Text>
                    ) : (
                        <Text style={styles.placeholderText}>Tap to select a doctor</Text>
                    )}
                </TouchableOpacity>

                <Modal visible={showDoctorModal} animationType="slide" transparent onRequestClose={() => setShowDoctorModal(false)}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Doctor</Text>
                                <TouchableOpacity onPress={() => setShowDoctorModal(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
                            </View>
                            <View style={styles.searchContainer}>
                                <Search size={20} color="#9ca3af" />
                                <TextInput style={styles.searchInput} placeholder="Search by name or specialization..." placeholderTextColor="#9ca3af"
                                    value={doctorName} onChangeText={setDoctorName} autoFocus />
                            </View>
                            {loadingDoctors ? (
                                <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
                            ) : (
                                <FlatList data={filteredDoctors} renderItem={renderDoctorItem} keyExtractor={item => item.id.toString()}
                                    contentContainerStyle={styles.doctorsList} ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>} />
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Date */}
                <Text style={styles.label}>Appointment Date</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setShowDateModal(true)}>
                    <Calendar size={20} color="#16a34a" />
                    <Text style={styles.selectorText}>
                        {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select Date'}
                    </Text>
                </TouchableOpacity>
                {renderDateModal()}

                {/* Time */}
                <Text style={styles.label}>Appointment Time</Text>
                <TouchableOpacity style={styles.selector} onPress={() => {
                    if (!selectedDoctor) { Alert.alert('Info', 'Please select a doctor first.'); return; }
                    if (!date) { Alert.alert('Info', 'Please select a date first.'); return; }
                    setShowTimeModal(true);
                }}>
                    <Clock size={20} color="#16a34a" />
                    <Text style={styles.selectorText}>{time || 'Select Time'}</Text>
                </TouchableOpacity>
                {renderTimeModal()}

                {/* Reason */}
                <Text style={styles.label}>Reason for Visit</Text>
                <View style={styles.textAreaContainer}>
                    <MessageSquare size={20} color="#16a34a" style={styles.textAreaIcon} />
                    <TextInput style={styles.textAreaInput} placeholder="e.g., Regular checkup, fever, headache..."
                        placeholderTextColor="#9ca3af" value={reason} onChangeText={setReason} multiline numberOfLines={2} />
                </View>

                {/* Symptoms */}
                <Text style={styles.label}>Symptoms / Additional Notes</Text>
                <View style={styles.textAreaContainer}>
                    <FileText size={20} color="#16a34a" style={styles.textAreaIcon} />
                    <TextInput style={[styles.textAreaInput, styles.symptomsInput]} placeholder="Describe your symptoms..."
                        placeholderTextColor="#9ca3af" value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
                </View>

                {/* Book Button */}
                <TouchableOpacity style={[styles.bookButton, loading && styles.disabledButton]}
                    onPress={handleBookAppointment} disabled={loading || loadingDoctorDetails || loadingSlots}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <CheckCircle size={22} color="#fff" />
                            <Text style={styles.bookButtonText}>Confirm Appointment</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#14532d', marginLeft: 20, marginTop: 20 },
    card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, elevation: 3 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 16, color: '#166534' },
    selector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 14, backgroundColor: '#dcfce7' },
    selectorText: { fontSize: 16, color: '#14532d', marginLeft: 10, flex: 1 },
    placeholderText: { fontSize: 16, color: '#9ca3af', marginLeft: 10 },
    textAreaContainer: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, backgroundColor: '#ffffff', paddingHorizontal: 14 },
    textAreaIcon: { marginTop: 14, marginRight: 8 },
    textAreaInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#14532d', minHeight: 60, textAlignVertical: 'top' },
    symptomsInput: { minHeight: 100 },
    bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 30, marginTop: 30, marginBottom: 10, elevation: 3 },
    disabledButton: { backgroundColor: '#bbf7d0' },
    bookButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 18, marginLeft: 8 },
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#ffffff', borderRadius: 16, maxHeight: '80%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#14532d' },
    modalScroll: { maxHeight: 400 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, margin: 16, paddingHorizontal: 12, backgroundColor: '#f0fdf4' },
    searchInput: { flex: 1, paddingVertical: 12, paddingLeft: 8, fontSize: 16, color: '#14532d' },
    doctorsList: { paddingHorizontal: 16, paddingBottom: 16 },
    doctorItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
    doctorInfo: { flex: 1 },
    doctorName: { fontSize: 16, fontWeight: '600', color: '#14532d', marginBottom: 4 },
    doctorSpecialization: { fontSize: 14, color: '#16a34a', marginBottom: 4 },
    doctorHospital: { fontSize: 12, color: '#6b7280' },
    loader: { padding: 40 },
    emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 16, padding: 40 },
    dateOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
    timeOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ecfdf5' },
    dateOptionText: { fontSize: 16, color: '#14532d', marginLeft: 12 },
    timeOptionText: { fontSize: 16, color: '#14532d', marginLeft: 12 },
    selectedOption: { backgroundColor: '#16a34a' },
    selectedOptionText: { color: '#ffffff', fontWeight: '600' },
});