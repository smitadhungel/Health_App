import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    FlatList,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ============================================
// CONFIGURATION
// ============================================
const API_BASE_URL = 'http://192.168.100.9:8000/api'; // Update if needed

// ============================================
// TYPES
// ============================================
interface Doctor {
    id: number;
    user?: {
        first_name: string;
        last_name: string;
        email: string;
    };
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

// Helper to extract doctor display name
const getDoctorDisplayName = (doctor: Doctor): string => {
    if (doctor.full_name) return `Dr. ${doctor.full_name}`;
    if (doctor.user?.first_name && doctor.user?.last_name) return `Dr. ${doctor.user.first_name} ${doctor.user.last_name}`;
    if (doctor.user?.first_name) return `Dr. ${doctor.user.first_name}`;
    if (doctor.first_name && doctor.last_name) return `Dr. ${doctor.first_name} ${doctor.last_name}`;
    if (doctor.first_name) return `Dr. ${doctor.first_name}`;
    if (doctor.name) return `Dr. ${doctor.name}`;
    if (doctor.specialization) return `Dr. (${doctor.specialization})`;
    if (doctor.specialty) return `Dr. (${doctor.specialty})`;
    return `Doctor #${doctor.id}`;
};

export default function BookAppointmentScreen() {
    const navigation = useNavigation();

    // Form state
    const [doctorName, setDoctorName] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

    // UI state
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingDoctorDetails, setLoadingDoctorDetails] = useState<boolean>(false);
    const [showDateModal, setShowDateModal] = useState<boolean>(false);
    const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
    const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);

    // Doctors data
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState<boolean>(false);

    // Available slots
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

    // User data
    const [user, setUser] = useState<User | null>(null);

    // Initialize data
    useEffect(() => {
        loadUserData();
        fetchDoctors();

        // Set default date (today)
        const now = new Date();
        const formattedDate = now.toISOString().split('T')[0];
        setDate(formattedDate);

        // Set default time to next available slot within working hours, but we'll override once slots are loaded
        setTime('');
    }, []);

    // Load user data from AsyncStorage
    const loadUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    // ============================================
    // FETCH DOCTORS FROM BACKEND
    // ============================================
    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) {
                Alert.alert('Authentication Required', 'Please login again');
                navigation.goBack();
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/doctors/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            console.log('Doctors response:', response.data);

            let doctorsList: Doctor[] = [];
            if (Array.isArray(response.data)) {
                doctorsList = response.data;
            } else if (response.data?.results && Array.isArray(response.data.results)) {
                doctorsList = response.data.results;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                doctorsList = response.data.data;
            } else if (response.data?.doctors && Array.isArray(response.data.doctors)) {
                doctorsList = response.data.doctors;
            } else {
                console.warn('Unexpected doctors response format:', response.data);
                Alert.alert('Error', 'Unexpected data format from server');
                return;
            }

            if (doctorsList.length > 0) {
                console.log('First doctor object:', JSON.stringify(doctorsList[0], null, 2));
            }

            setDoctors(doctorsList);
            setFilteredDoctors(doctorsList);

            if (doctorsList.length === 0) {
                Alert.alert('Info', 'No doctors available at the moment');
            }
        } catch (error: any) {
            console.error('Error fetching doctors:', error);
            if (error.response?.status === 401) {
                Alert.alert('Session Expired', 'Please login again');
            } else {
                Alert.alert('Error', 'Failed to load doctors. Please try again.');
            }
        } finally {
            setLoadingDoctors(false);
        }
    };

    // ============================================
    // FETCH DOCTOR DETAILS BY ID
    // ============================================
    const fetchDoctorDetails = async (doctorId: number): Promise<Doctor | null> => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return null;

            const response = await axios.get(`${API_BASE_URL}/doctors/${doctorId}/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            console.log('Doctor details:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching doctor details:', error);
            return null;
        }
    };

    // ============================================
    // FETCH AVAILABLE SLOTS FOR SELECTED DOCTOR AND DATE
    // ============================================
    const fetchAvailableSlots = async (doctorId: number, selectedDate: string) => {
        setLoadingSlots(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const response = await axios.get(
                `${API_BASE_URL}/appointments/available-slots/${doctorId}/`,
                {
                    params: { date: selectedDate },
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            console.log('Available slots:', response.data);
            setAvailableSlots(response.data);
            // Clear previously selected time if it's no longer available
            setTime('');
        } catch (error) {
            console.error('Error fetching available slots:', error);
            setAvailableSlots([]);
            Alert.alert('Error', 'Failed to load available time slots.');
        } finally {
            setLoadingSlots(false);
        }
    };

    // When doctor or date changes, fetch available slots
    useEffect(() => {
        if (selectedDoctor && date) {
            fetchAvailableSlots(selectedDoctor.id, date);
        } else {
            setAvailableSlots([]);
            setTime('');
        }
    }, [selectedDoctor, date]);

    // Filter doctors based on search
    useEffect(() => {
        if (doctorName.trim() === '') {
            setFilteredDoctors(doctors);
        } else {
            const searchLower = doctorName.toLowerCase();
            const filtered = doctors.filter(doctor => {
                const displayName = getDoctorDisplayName(doctor).toLowerCase();
                const spec = (doctor.specialization || doctor.specialty || '').toLowerCase();
                const idMatch = doctor.id.toString().includes(searchLower);
                return displayName.includes(searchLower) || spec.includes(searchLower) || idMatch;
            });
            setFilteredDoctors(filtered);
        }
    }, [doctorName, doctors]);

    // Handle doctor selection
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

    // Generate date options (next 30 days)
    const generateDateOptions = (): Array<{ value: string; display: string }> => {
        const options: Array<{ value: string; display: string }> = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const formattedDate = date.toISOString().split('T')[0];
            const displayDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
            options.push({ value: formattedDate, display: displayDate });
        }
        return options;
    };

    // ============================================
    // BOOK APPOINTMENT
    // ============================================
    const handleBookAppointment = async () => {
        if (!selectedDoctor) {
            Alert.alert('Error', 'Please select a doctor');
            return;
        }
        if (!date) {
            Alert.alert('Error', 'Please select a date');
            return;
        }
        if (!time) {
            Alert.alert('Error', 'Please select a time slot');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Error', 'Please enter the reason for appointment');
            return;
        }

        setLoading(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) {
                Alert.alert('Error', 'Authentication required. Please login again.');
                navigation.goBack();
                return;
            }

            const appointmentData: AppointmentData = {
                doctor: selectedDoctor.id,
                appointment_date: date,
                appointment_time: time,
                reason: reason.trim(),
                symptoms: notes.trim(),
                duration_minutes: 30,
            };

            console.log('Sending appointment data:', appointmentData);

            const response = await axios.post(
                `${API_BASE_URL}/appointments/book/`,
                appointmentData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('Appointment response:', response.data);

            Alert.alert('Success', 'Appointment booked successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            console.error('Booking error:', error);

            if (error.response) {
                console.error('Error response status:', error.response.status);
                console.error('Error response data:', JSON.stringify(error.response.data, null, 2));

                const errorData = error.response.data;
                let errorMessage = 'Failed to book appointment.';

                if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.non_field_errors) {
                    errorMessage = Array.isArray(errorData.non_field_errors)
                        ? errorData.non_field_errors[0]
                        : errorData.non_field_errors;
                } else {
                    const firstKey = Object.keys(errorData)[0];
                    if (firstKey && errorData[firstKey]) {
                        const fieldError = errorData[firstKey];
                        errorMessage = `${firstKey}: ${Array.isArray(fieldError) ? fieldError[0] : fieldError}`;
                    } else {
                        errorMessage = JSON.stringify(errorData);
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

    // Render doctor item
    const renderDoctorItem = ({ item }: { item: Doctor }) => {
        const displayName = getDoctorDisplayName(item);
        return (
            <TouchableOpacity
                style={styles.doctorItem}
                onPress={() => handleSelectDoctor(item)}
                disabled={loadingDoctorDetails}
            >
                <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{displayName}</Text>
                    <Text style={styles.doctorSpecialization}>
                        {item.specialization || item.specialty || 'General'}
                    </Text>
                    {(item.hospital || item.clinic_address || item.clinic) && (
                        <Text style={styles.doctorHospital}>
                            🏥 {item.hospital || item.clinic_address || item.clinic}
                        </Text>
                    )}
                </View>
                <Text style={styles.selectText}>Select →</Text>
            </TouchableOpacity>
        );
    };

    // Render time slot item (from availableSlots)
    const renderTimeSlot = ({ item }: { item: string }) => (
        <TouchableOpacity
            style={[styles.timeOption, time === item && styles.selectedOption]}
            onPress={() => setTime(item)}
        >
            <Text style={[styles.timeOptionText, time === item && styles.selectedOptionText]}>
                {item}
            </Text>
        </TouchableOpacity>
    );

    // Date Selection Modal
    const renderDateModal = () => (
        <Modal
            visible={showDateModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDateModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Date</Text>
                        <TouchableOpacity onPress={() => setShowDateModal(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        {generateDateOptions().map((dateOption, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.dateOption, date === dateOption.value && styles.selectedOption]}
                                onPress={() => {
                                    setDate(dateOption.value);
                                    setShowDateModal(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.dateOptionText,
                                        date === dateOption.value && styles.selectedOptionText,
                                    ]}
                                >
                                    {dateOption.display}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Time Selection Modal – uses availableSlots
    const renderTimeModal = () => (
        <Modal
            visible={showTimeModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimeModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Time</Text>
                        <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingSlots ? (
                        <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
                    ) : availableSlots.length > 0 ? (
                        <FlatList
                            data={availableSlots}
                            renderItem={renderTimeSlot}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={styles.doctorsList}
                        />
                    ) : (
                        <Text style={styles.emptyText}>No available slots for this date.</Text>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>📅 Book Appointment</Text>

            <View style={styles.card}>
                {/* Doctor Selection */}
                <Text style={styles.label}>Select Doctor</Text>
                <TouchableOpacity
                    style={styles.doctorSelector}
                    onPress={() => setShowDoctorModal(true)}
                    disabled={loadingDoctorDetails}
                >
                    {loadingDoctorDetails ? (
                        <ActivityIndicator size="small" color="#4f46e5" />
                    ) : doctorName ? (
                        <Text style={styles.selectedDoctor}>{doctorName}</Text>
                    ) : (
                        <Text style={styles.placeholderText}>Tap to select a doctor</Text>
                    )}
                </TouchableOpacity>

                {/* Doctor Selection Modal */}
                <Modal
                    visible={showDoctorModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowDoctorModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Doctor</Text>
                                <TouchableOpacity onPress={() => setShowDoctorModal(false)}>
                                    <Text style={styles.closeButton}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search doctors by name or specialization..."
                                value={doctorName}
                                onChangeText={setDoctorName}
                                autoFocus={true}
                            />

                            {loadingDoctors ? (
                                <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
                            ) : (
                                <FlatList
                                    data={filteredDoctors}
                                    renderItem={renderDoctorItem}
                                    keyExtractor={(item) => item.id.toString()}
                                    contentContainerStyle={styles.doctorsList}
                                    ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Date Selection */}
                <Text style={styles.label}>Appointment Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDateModal(true)}>
                    <Text style={styles.dateText}>
                        {date
                            ? new Date(date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                              })
                            : 'Select Date'}
                    </Text>
                </TouchableOpacity>
                {renderDateModal()}

                {/* Time Selection */}
                <Text style={styles.label}>Appointment Time</Text>
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                        if (!selectedDoctor) {
                            Alert.alert('Info', 'Please select a doctor first.');
                            return;
                        }
                        if (!date) {
                            Alert.alert('Info', 'Please select a date first.');
                            return;
                        }
                        setShowTimeModal(true);
                    }}
                >
                    <Text style={styles.dateText}>{time ? `${time}` : 'Select Time'}</Text>
                </TouchableOpacity>
                {renderTimeModal()}

                {/* Reason for Visit */}
                <Text style={styles.label}>Reason for Visit</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Regular checkup, fever, headache..."
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={2}
                />

                {/* Additional Notes/Symptoms */}
                <Text style={styles.label}>Symptoms / Additional Notes</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your symptoms or add any additional information..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                />

                {/* Book Appointment Button */}
                <TouchableOpacity
                    style={[styles.bookButton, loading && styles.disabledButton]}
                    onPress={handleBookAppointment}
                    disabled={loading || loadingDoctorDetails || loadingSlots}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.bookButtonText}>Confirm Appointment</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fb',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#000',
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 15,
        color: '#333',
    },
    doctorSelector: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        height: 50,
    },
    selectedDoctor: {
        fontSize: 16,
        color: '#000',
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        height: 50,
        marginBottom: 10,
    },
    dateText: {
        fontSize: 16,
        color: '#000',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    bookButton: {
        backgroundColor: '#4f46e5',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 25,
    },
    disabledButton: {
        backgroundColor: '#a5b4fc',
    },
    bookButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },

    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    closeButton: {
        fontSize: 20,
        color: '#666',
        fontWeight: 'bold',
    },
    modalScroll: {
        maxHeight: 400,
    },

    // Doctor modal
    searchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        margin: 20,
        marginTop: 0,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    doctorsList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    doctorItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    doctorInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    doctorSpecialization: {
        fontSize: 14,
        color: '#4f46e5',
        marginBottom: 4,
    },
    doctorHospital: {
        fontSize: 12,
        color: '#666',
    },
    selectText: {
        fontSize: 14,
        color: '#4f46e5',
        fontWeight: '500',
    },
    loader: {
        padding: 40,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 16,
        padding: 40,
    },

    // Date/Time options
    dateOption: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    timeOption: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dateOptionText: {
        fontSize: 16,
        color: '#333',
    },
    timeOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOption: {
        backgroundColor: '#4f46e5',
    },
    selectedOptionText: {
        color: '#fff',
        fontWeight: '600',
    },
});