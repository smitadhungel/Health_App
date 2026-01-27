// ============================================
// src/services/api.ts
// API Service for Django Backend Communication
// ============================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONFIGURATION
// ============================================

// Change this to your backend URL
// For Android Emulator: http://10.0.2.2:8000
// For iOS Simulator: http://localhost:8000
// For Physical Device: http://YOUR_COMPUTER_IP:8000
const BASE_URL = 'http://192.168.1.5:8000/api';

// ============================================
// AXIOS INSTANCE
// ============================================

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR (Add JWT Token)
// ============================================

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR (Handle Token Refresh)
// ============================================

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          await AsyncStorage.setItem('access_token', access);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        // You can dispatch a logout action here
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  // Register new user
  register: async (userData: {
    email: string;
    username: string;
    password: string;
    password2: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    role?: string;
  }) => {
    const response = await api.post('/users/register/', userData);
    return response.data;
  },

  // Login
  login: async (email: string, password: string) => {
    const response = await api.post('/users/login/', { email, password });
    return response.data;
  },

  // Logout
  logout: async (refreshToken: string) => {
    const response = await api.post('/users/logout/', { refresh: refreshToken });
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile/');
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData: any) => {
    const response = await api.put('/users/profile/update/', profileData);
    return response.data;
  },
};

// ============================================
// DOCTORS API
// ============================================

export const doctorsAPI = {
  // List all doctors
  list: async (params?: {
    specialization?: string;
    available?: boolean;
    verified?: boolean;
    search?: string;
  }) => {
    const response = await api.get('/doctors/', { params });
    return response.data;
  },

  // Get doctor details
  getDetails: async (doctorId: number) => {
    const response = await api.get(`/doctors/${doctorId}/`);
    return response.data;
  },

  // Get doctor availability
  getAvailability: async (doctorId: number) => {
    const response = await api.get(`/doctors/${doctorId}/availability/`);
    return response.data;
  },

  // Add review
  addReview: async (doctorId: number, rating: number, comment: string) => {
    const response = await api.post(`/doctors/${doctorId}/review/`, {
      rating,
      comment,
    });
    return response.data;
  },
};

// ============================================
// APPOINTMENTS API
// ============================================

export const appointmentsAPI = {
  // Book appointment
  book: async (appointmentData: {
    doctor: number;
    appointment_date: string;
    appointment_time: string;
    duration_minutes?: number;
    reason: string;
    symptoms?: string;
  }) => {
    const response = await api.post('/appointments/book/', appointmentData);
    return response.data;
  },

  // Get my appointments
  getMyAppointments: async (params?: {
    status?: string;
    filter?: 'upcoming' | 'past' | 'all';
  }) => {
    const response = await api.get('/appointments/my-appointments/', { params });
    return response.data;
  },

  // Get appointment details
  getDetails: async (appointmentId: number) => {
    const response = await api.get(`/appointments/${appointmentId}/`);
    return response.data;
  },

  // Cancel appointment
  cancel: async (appointmentId: number) => {
    const response = await api.post(`/appointments/${appointmentId}/cancel/`);
    return response.data;
  },

  // Reschedule appointment
  reschedule: async (
    appointmentId: number,
    newDate: string,
    newTime: string
  ) => {
    const response = await api.post(`/appointments/${appointmentId}/reschedule/`, {
      new_date: newDate,
      new_time: newTime,
    });
    return response.data;
  },

  // Get available slots
  getAvailableSlots: async (doctorId: number, date: string) => {
    const response = await api.get(
      `/appointments/available-slots/${doctorId}/`,
      { params: { date } }
    );
    return response.data;
  },
};

// ============================================
// DOCUMENTS API
// ============================================

export const documentsAPI = {
  // Upload document
  upload: async (formData: FormData) => {
    const response = await api.post('/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get my documents
  getMyDocuments: async (params?: {
    category?: string;
    search?: string;
  }) => {
    const response = await api.get('/documents/my-documents/', { params });
    return response.data;
  },

  // Get document details
  getDetails: async (documentId: number) => {
    const response = await api.get(`/documents/${documentId}/`);
    return response.data;
  },

  // Delete document
  delete: async (documentId: number) => {
    const response = await api.delete(`/documents/${documentId}/delete/`);
    return response.data;
  },

  // Share document
  share: async (
    documentId: number,
    shareData: {
      share_method: 'EMAIL' | 'WHATSAPP' | 'LINK';
      email?: string;
      phone?: string;
      expires_in_days?: number;
    }
  ) => {
    const response = await api.post(`/documents/${documentId}/share/`, shareData);
    return response.data;
  },

  // Share with doctor
  shareWithDoctor: async (documentId: number, doctorIds: number[]) => {
    const response = await api.post(`/documents/${documentId}/share-with-doctor/`, {
      doctor_ids: doctorIds,
    });
    return response.data;
  },
};

// ============================================
// MEDICATIONS API
// ============================================

export const medicationsAPI = {
  // Create medication
  create: async (medicationData: {
    name: string;
    generic_name?: string;
    form: string;
    dosage: string;
    frequency: string;
    start_date: string;
    end_date?: string;
    duration_days?: number;
    instructions?: string;
    schedules?: Array<{
      time: string;
      dosage_count: number;
      notes?: string;
    }>;
  }) => {
    const response = await api.post('/medications/create/', medicationData);
    return response.data;
  },

  // Get my medications
  getMyMedications: async (params?: {
    active?: boolean;
    expired?: boolean;
    refill?: boolean;
  }) => {
    const response = await api.get('/medications/my-medications/', { params });
    return response.data;
  },

  // Get medication details
  getDetails: async (medicationId: number) => {
    const response = await api.get(`/medications/${medicationId}/`);
    return response.data;
  },

  // Log medication
  log: async (
    medicationId: number,
    logData: {
      scheduled_date: string;
      scheduled_time: string;
      status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED';
      actual_time?: string;
      dosage_taken?: number;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/medications/${medicationId}/log/`, logData);
    return response.data;
  },

  // Get today's doses
  getTodaysDoses: async () => {
    const response = await api.get('/medications/todays-doses/');
    return response.data;
  },

  // Get medication stats
  getStats: async () => {
    const response = await api.get('/medications/stats/');
    return response.data;
  },

  // Request refill
  requestRefill: async (refillData: {
    medication: number;
    quantity: number;
    pharmacy_name?: string;
    notes?: string;
  }) => {
    const response = await api.post('/medications/refill/request/', refillData);
    return response.data;
  },
};

// ============================================
// EXPORT
// ============================================

export default api;