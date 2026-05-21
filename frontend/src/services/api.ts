import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
import { 
  User, 
  Doctor, 
  LoginResponse, 
  RegistrationResponse,
  Appointment,
  Medication,
  Document,
} from './types';


// const BASE_URL = 'http://192.168.254.255:8000/api';
    const BASE_URL = 'http://192.168.100.9:8000/api';
  //  const BASE_URL = 'http://192.168.1.249:8000/api';
  // const BASE_URL = 'http://192.168.1.74:8000/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});





api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    console.log('Interceptor - token present:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          // If your backend has token refresh endpoint, implement here
          // For now, just logout
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    }

    return Promise.reject(error);
  }
);



export const authAPI = {

  register: async (userData: {
    email: string;
    username: string;
    password: string;
    password2: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }): Promise<RegistrationResponse> => {
    const response = await api.post('/users/register/', userData);
    return response.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post('/users/login/', { email, password });
  
  if (response.data.access && response.data.refresh && response.data.user) {
    await AsyncStorage.setItem('access_token', response.data.access);
    await AsyncStorage.setItem('refresh_token', response.data.refresh);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
},

  logout: async (refreshToken: string): Promise<{message: string}> => {
    const response = await api.post('/users/logout/', { refresh: refreshToken });
    
    // Clear storage
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    
    return response.data;
  },

  // Get user profile (returns User)
  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile/');
    return response.data;
  },

  // Update profile (returns User)
  updateProfile: async (profileData: Partial<User>): Promise<User> => {
    const response = await api.put('/users/profile/update/', profileData);
    
    // Update stored user data
    if (response.data) {
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  },

  // Update user type (patient → doctor pending)
  updateUserType: async (user_type: 'patient' | 'doctor' | 'admin'): Promise<User> => {
    const response = await api.put('/users/profile/update/', { user_type });
    
    // Update stored user data
    if (response.data) {
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  },
};

// ============================================
// DOCTORS API
// ============================================

export const doctorsAPI = {
  // Create doctor profile
  createProfile: async (doctorData: {
    specialization: string;
    hospital?: string;
    license_number?: string;
    experience_years?: number;
    consultation_fee?: number;
  }): Promise<Doctor> => {
    const response = await api.post('/doctors/profile/create/', doctorData);
    return response.data;
  },

  // Get my doctor profile
  getMyProfile: async (): Promise<Doctor> => {
    const response = await api.get('/doctors/profile/me/');
    return response.data;
  },

  // Update doctor profile
  updateProfile: async (profileData: Partial<Doctor>): Promise<Doctor> => {
    const response = await api.put('/doctors/profile/update/', profileData);
    return response.data;
  },

  // Toggle availability
  toggleAvailability: async (): Promise<Doctor> => {
    const response = await api.put('/doctors/profile/toggle-availability/');
    return response.data;
  },

  createProfileFormData: (formData: FormData) =>
  api.post('/doctors/profile/create/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),
  // List all doctors
  list: async (params?: {
    specialization?: string;
    available?: boolean;
    search?: string;
  }): Promise<Doctor[]> => {
    const response = await api.get('/doctors/', { params });
    return response.data;
  },

  // Get doctor details
  getDetails: async (doctorId: number): Promise<Doctor> => {
    const response = await api.get(`/doctors/${doctorId}/`);
    return response.data;
  },

  // Add availability schedule
  // In api.ts, inside doctorsAPI object:

addAvailability: async (data: {
  day_of_week: number;        // integer 0-6
  start_time: string;         // "HH:MM"
  end_time: string;           // "HH:MM"
  slot_duration: number;      // minutes
  is_active: boolean;         // active status
}): Promise<any> => {
  const response = await api.post('/doctors/availability/add/', data);
  return response.data;
},
  // Get doctor availability
  getAvailability: async (doctorId: number): Promise<any[]> => {
    const response = await api.get(`/doctors/${doctorId}/availability/`);
    return response.data;
  },

  // Add review
  addReview: async (doctorId: number, rating: number, comment: string): Promise<any> => {
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
  }): Promise<Appointment> => {
    const response = await api.post('/appointments/book/', appointmentData);
    return response.data;
  },

  // Get my appointments
  // getMyAppointments: async (params?: {
  //   status?: string;
  //   filter?: 'upcoming' | 'past' | 'all';
  // }): Promise<Appointment[]> => {
  //   const response = await api.get('/appointments/my-appointments/', { params });
  //   return response.data;
  // },
  getMyAppointments: async (params?: {
  status?: string;
  filter?: 'upcoming' | 'past' | 'all';
}): Promise<Appointment[]> => {
  const response = await api.get('/appointments/my-appointments/', { params });
  const data = response.data;
  // ✅ Your backend returns { count, appointments: [...] }
  return Array.isArray(data) ? data : data.appointments ?? [];
},

  // Get appointment details
  getDetails: async (appointmentId: number): Promise<Appointment> => {
    const response = await api.get(`/appointments/${appointmentId}/`);
    return response.data;
  },

  // Update appointment
  update: async (appointmentId: number, updateData: Partial<Appointment>): Promise<Appointment> => {
    const response = await api.put(`/appointments/${appointmentId}/update/`, updateData);
    return response.data;
  },


  cancel: async (appointmentId: number): Promise<{message: string}> => {
    const response = await api.post(`/appointments/${appointmentId}/cancel/`);
    return response.data;
  },

  // Reschedule appointment
  reschedule: async (appointmentId: number, rescheduleData: {
    new_date: string;
    new_time: string;
  }): Promise<Appointment> => {
    const response = await api.post(`/appointments/${appointmentId}/reschedule/`, rescheduleData);
    return response.data;
  },


  getDoctorAppointments: async (params?: {
  status?: string;
  date?: string;
  patient?: number; 
}): Promise<Appointment[]> => {
  const response = await api.get('/appointments/doctor/appointments/', { params });
  const data = response.data;

  return Array.isArray(data) ? data : data.appointments ?? [];
},
 
  updateDoctorAppointment: async (appointmentId: number, updateData: Partial<Appointment>): Promise<Appointment> => {
    const response = await api.put(`/appointments/doctor/${appointmentId}/update/`, updateData);
    return response.data;
  },


  completeAppointment: async (appointmentId: number): Promise<Appointment> => {
    const response = await api.post(`/appointments/doctor/${appointmentId}/complete/`);
    return response.data;
  },

getAvailableSlots: async (doctorId: number, date: string): Promise<string[]> => {
  const response = await api.get(
    `/appointments/available-slots/${doctorId}/`,
    { params: { date } }
  );
  console.log('Available slots raw response:', response.data); // Debug log

  // If response.data is an object with a 'slots' array, return that
  if (response.data && typeof response.data === 'object' && Array.isArray(response.data.slots)) {
    return response.data.slots;
  }
  // If it's already an array, return it directly
  if (Array.isArray(response.data)) {
    return response.data;
  }
  // Fallback: log warning and return empty array
  console.warn('Unexpected available slots response:', response.data);
  return [];
},
};

// ============================================
// DOCUMENTS API
// ============================================

export const documentsAPI = {
  // Upload document
  upload: async (formData: FormData): Promise<Document> => {
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
  }): Promise<Document[]> => {
    const response = await api.get('/documents/my-documents/', { params });
    return response.data;
  },

  // Get document details
  getDetails: async (documentId: number): Promise<Document> => {
    const response = await api.get(`/documents/${documentId}/`);
    return response.data;
  },

  // Update document
  update: async (documentId: number, updateData: Partial<Document>): Promise<Document> => {
    const response = await api.put(`/documents/${documentId}/update/`, updateData);
    return response.data;
  },

  // Delete document
  delete: async (documentId: number): Promise<{message: string}> => {
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
  ): Promise<{message: string}> => {
    const response = await api.post(`/documents/${documentId}/share/`, shareData);
    return response.data;
  },

  // Share with doctor
  shareWithDoctor: async (documentId: number, doctorIds: number[]): Promise<{message: string}> => {
    const response = await api.post(`/documents/${documentId}/share-with-doctor/`, {
      doctor_ids: doctorIds,
    });
    return response.data;
  },

  // Unshare with doctor
  unshareWithDoctor: async (documentId: number, doctorId: number): Promise<{message: string}> => {
    const response = await api.post(`/documents/${documentId}/unshare-with-doctor/`, {
      doctor_id: doctorId,
    });
    return response.data;
  },

  // Get access logs
  getAccessLogs: async (documentId: number): Promise<any[]> => {
    const response = await api.get(`/documents/${documentId}/access-logs/`);
    return response.data;
  },

  // Get documents shared with doctor
  // In documentsAPI inside api.ts — update getSharedWithDoctor
getSharedWithDoctor: async (): Promise<any> => {
  const response = await api.get('/documents/doctor/shared-documents/');
  return response.data;
},

  // Get document via public token
  getByToken: async (token: string): Promise<Document> => {
    const response = await api.get(`/documents/shared/${token}/`);
    return response.data;
  },
};



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
  }): Promise<{ message: string; medication: Medication }> => {
    const response = await api.post('/medications/create/', medicationData);
    return response.data;
  },

  

getMyMedications: async (params?: {
  active?: boolean;
  expired?: boolean;
  refill?: boolean;
}): Promise<Medication[]> => {
  // ✅ Always request only active, non-expired meds unless caller says otherwise
  const queryParams = {
    active: true,
    expired: false,
    ...params,
  };
  const response = await api.get('/medications/my-medications/', { params: queryParams });
  const data = response.data;
  // ✅ Unwrap { count, medications: [...] } shape from backend
  return Array.isArray(data) ? data : data.medications ?? [];
},

  // Get medication details
  getDetails: async (medicationId: number): Promise<Medication> => {
    const response = await api.get(`/medications/${medicationId}/`);
    return response.data;
  },

  // Update medication
  update: async (medicationId: number, updateData: Partial<Medication>): Promise<Medication> => {
    const response = await api.put(`/medications/${medicationId}/update/`, updateData);
    return response.data;
  },

  // Deactivate medication
  delete: async (medicationId: number): Promise<{message: string}> => {
    const response = await api.delete(`/medications/${medicationId}/delete/`);
    return response.data;
  },

  // Add schedule
  addSchedule: async (
    medicationId: number,
    scheduleData: {
      time: string;
      dosage_count: number;
      notes?: string;
    }
  ): Promise<any> => {
    const response = await api.post(`/medications/${medicationId}/add-schedule/`, scheduleData);
    return response.data;
  },

  // Get schedules
  getSchedules: async (medicationId: number): Promise<any[]> => {
    const response = await api.get(`/medications/${medicationId}/schedules/`);
    return response.data;
  },

  // Log dose
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
  ): Promise<any> => {
    const response = await api.post(`/medications/${medicationId}/log/`, logData);
    return response.data;
  },

  // Get logs
  getLogs: async (medicationId: number): Promise<any[]> => {
    const response = await api.get(`/medications/${medicationId}/logs/`);
    return response.data;
  },

  // Get today's doses
  getTodaysDoses: async (): Promise<any[]> => {
    const response = await api.get('/medications/todays-doses/');
    return response.data;
  },

  // Request refill
  requestRefill: async (refillData: {
    medication: number;
    quantity: number;
    pharmacy_name?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await api.post('/medications/refill/request/', refillData);
    return response.data;
  },

  // Get my refill requests
  getMyRefillRequests: async (): Promise<any[]> => {
    const response = await api.get('/medications/refill/my-requests/');
    return response.data;
  },

  // Get doctor's refill requests
  getDoctorRefillRequests: async (): Promise<any[]> => {
    const response = await api.get('/medications/refill/doctor-requests/');
    return response.data;
  },

  // Approve refill request
  approveRefill: async (requestId: number): Promise<any> => {
    const response = await api.post(`/medications/refill/${requestId}/approve/`);
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<any> => {
    const response = await api.get('/medications/stats/');
    return response.data;
  },

 updateLog: async (
    logId: number,
    updateData: {
      status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED';
      notes?: string;
    }
  ): Promise<any> => {
    const response = await api.patch(`/medications/logs/${logId}/update/`, updateData);
    return response.data;
  },
};



export const patientsAPI = {
  // Derives unique patients from doctor's appointments
  getMyPatients: async (): Promise<User[]> => {
    const response = await api.get('/appointments/doctor/appointments/');
    const data = response.data;
    const appointments: Appointment[] = Array.isArray(data) ? data : data.appointments ?? [];

    // Build unique patient list from appointments
    const seen = new Map<number, User>();
    appointments.forEach((apt) => {
      const patientId = typeof apt.patient === 'object'
        ? (apt.patient as any)?.id
        : apt.patient;

      if (patientId && !seen.has(patientId)) {
        seen.set(patientId, {
          id: patientId,
          first_name: apt.patient_name?.split(' ')[0] ?? '',
          last_name:  apt.patient_name?.split(' ').slice(1).join(' ') ?? '',
          email: (apt as any).patient_email ?? '',
          phone_number: (apt as any).patient_phone ?? '',
          last_appointment: apt.appointment_date,
        } as any);
      }
    });

    return Array.from(seen.values());
  },
};



export const prescriptionsAPI = {
  // Doctor creates prescription
  create: async (data: {
    patient: number;
    related_document?: number;
    diagnosis: string;
    notes?: string;
    medications: {
      medicine_name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }[];
  }): Promise<any> => {
    const response = await api.post('/documents/prescriptions/create/', data);
    return response.data;
  },

  // Patient gets their prescriptions
  getMyPrescriptions: async (): Promise<any> => {
    const response = await api.get('/documents/prescriptions/my/');
    return response.data;
  },

  // Doctor gets prescriptions they issued
  getDoctorPrescriptions: async (): Promise<any> => {
    const response = await api.get('/documents/prescriptions/doctor/');
    return response.data;
  },

  // Get single prescription detail
  getDetail: async (prescriptionId: number): Promise<any> => {
    const response = await api.get(`/documents/prescriptions/${prescriptionId}/`);
    return response.data;
  },

  // Doctor updates prescription
  update: async (prescriptionId: number, data: any): Promise<any> => {
    const response = await api.patch(`/documents/prescriptions/${prescriptionId}/update/`, data);
    return response.data;
  },
};

// Doctor admin verification API

export const adminAPI = {
  getPendingDoctors: async (): Promise<any> => {
    const response = await api.get('/doctors/admin/pending/');
    return response.data;
  },

  approveDoctor: async (doctorId: number): Promise<any> => {
    const response = await api.post(`/doctors/${doctorId}/verify/`, {
      action: 'APPROVE'
    });
    return response.data;
  },

  rejectDoctor: async (doctorId: number, reason: string): Promise<any> => {
    const response = await api.post(`/doctors/${doctorId}/verify/`, {
      action: 'REJECT',
      reason
    });
    return response.data;
  },
};


export const chatAPI = {
  sendMessage: async (
    message: string,
    history: { role: 'user' | 'assistant'; text: string }[]
  ): Promise<string> => {
    const response = await api.post('/chat/message/', { message, history });
    const reply = response.data?.reply;
    if (!reply) throw new Error('Empty response from server');
    return reply;
  },
};
export default api;