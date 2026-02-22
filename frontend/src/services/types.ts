// services/types.ts
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  user_type: 'patient' | 'doctor' | 'admin'; // This matches your backend
  is_active?: boolean;
  date_joined?: string;
}

export interface Doctor {
  id: number;
  user: User;
  specialization: string;
  hospital?: string;
  license_number?: string;
  experience_years?: number;
  consultation_fee?: number;
  available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegistrationResponse {
  message?: string;
  user?: User;
  tokens?: {
    access: string;
    refresh: string;
  };
}

export interface Appointment {
  id: number;
  patient: User;
  doctor: Doctor;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  symptoms: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: number;
  name: string;
  generic_name?: string;
  form: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  duration_days?: number;
  instructions?: string;
  patient: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  name: string;
  file_url: string;
  document_type: 'prescription' | 'lab_report' | 'scan' | 'other';
  uploaded_at: string;
  patient: number;
  uploaded_by?: number;
  is_shared?: boolean;
}