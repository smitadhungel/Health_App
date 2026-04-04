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
  doctor_name:string;
  specialization_display:string;
}

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    created_at: string;
    role_display: string;
  };
  tokens: {
    access: string;
    refresh: string;
  };
  message: string;
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
  doctor_name:string
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
  title: string;
  category: string;
  category_display: string;
  description?: string;
  document_date: string | null;
  file: string;
  file_extension: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
  uploaded_by: number;
  uploaded_by_name: string;
  is_shared: boolean;
}

// src/types/medication.ts
export interface Medication {
  id: number;
  name: string;
  generic_name?: string;
  form: string;
  form_display: string;
  dosage: string;
  frequency: string;
  frequency_display: string;
  start_date: string;
  end_date?: string;
  duration_days?: number;
  instructions?: string;
  prescribed_by_name?: string;
  is_refill_needed?: boolean;
  next_dose_time?: {
    time: string;
    date: string;
  };
}

export interface Schedule {
  id: number;
  time: string;
  dosage_count: number;
  notes?: string;
}

export interface LogPayload {
  scheduled_date: string;
  scheduled_time: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED';
  actual_time?: string;
  dosage_taken?: number;
  notes?: string;
}

export interface Stats {
  active_medications: number;
  doses_taken_today: number;
  doses_missed_today: number;
  adherence_rate: number;
}

export interface TodaysDose {
  scheduled_time: string;
  medication_name: string;
  status: string;
  status_display: string;
  medication: number;
  scheduled_date: string;
}