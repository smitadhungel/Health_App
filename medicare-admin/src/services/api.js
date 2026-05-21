import axios from 'axios';


//  const BASE_URL = 'http://192.168.100.32:8000/';

   const BASE_URL = 'http://192.168.1.249:8000/';
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Helper to safely extract array from any response shape
export const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.doctors && Array.isArray(data.doctors)) return data.doctors;
  if (data?.appointments && Array.isArray(data.appointments)) return data.appointments;
  return [];
};

export const authAPI = {
  login: (data) => api.post('/api/users/login/', data),
  logout: () => api.post('/api/users/logout/'),
};

export const adminAPI = {
  getAllDoctors: () => api.get('/api/doctors/'),
  getPendingDoctors: () => api.get('/api/doctors/?verification_status=PENDING'),
  getVerifiedDoctors: () => api.get('/api/doctors/?verification_status=APPROVED'),
  approveDoctor: (id) => api.post(`/api/doctors/${id}/verify/`, { action: 'APPROVE' }),
  rejectDoctor: (id, reason) => api.post(`/api/doctors/${id}/verify/`, { action: 'REJECT', reason }),
  revokeDoctor: (id, reason) => api.post(`/api/doctors/${id}/verify/`, { action: 'REVOKE', reason }),
  getDoctorDetails: (id) => api.get(`/api/doctors/${id}/`),
  getDoctorAvailability: (id) => api.get(`/api/doctors/${id}/availability/`),
  getAllPatients:     () => api.get('/api/users/users/'),
  getPatientDetails: (id) => api.get(`/api/users/users/${id}/`),
};

export const appointmentAPI = {
  getAll: () => api.get('/api/appointments/doctor/appointments/'),
  getDetails: (id) => api.get(`/api/appointments/${id}/`),
  cancel: (id) => api.post(`/api/appointments/${id}/cancel/`),
  complete: (id) => api.post(`/api/appointments/doctor/${id}/complete/`),
};

export const medicationAPI = {
  getRefillRequests: () => api.get('/api/medications/refill/doctor-requests/'),
  approveRefill: (id) => api.post(`/api/medications/refill/${id}/approve/`),
  getStats: () => api.get('/api/medications/stats/'),
};

export const documentAPI = {
  getAll: () => api.get('/api/documents/my-documents/'),
  getSharedDocs: () => api.get('/api/documents/doctor/shared-documents/'),
};

export const userAPI = {
  getProfile: () => api.get('/api/users/profile/'),
  updateProfile: (data) => api.put('/api/users/profile/update/', data),
};

export const publicAPI = {
  getStats: () => api.get('/api/users/stats/'),
};

export default api;