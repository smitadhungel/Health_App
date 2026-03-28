import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type PatientStackParamList = {
  PatientHome: undefined;
  Medications: undefined;
  AddMedication: { medicationId?: number };
  MedicationDetail: { medicationId: number };
  TodayDoses: undefined;
  RequestRefill: { medicationId: number; medicationName: string };
  BookAppointment: undefined;
  UploadDocument: undefined;
  Documents:undefined;
  DocumentDetails: { documentId: number };
  MyAppointments: undefined;
  DoctorRegistration: undefined;
  PlaceDetails:undefined;
};


export type DoctorStackParamList = {
  DoctorsDashboard: undefined;
  AppointmentDetails: { appointmentId: number };   // <-- add this
  DoctorDetails: { doctorId: number } | undefined;
  SetAvailability: undefined;
  AppointmentsCalendar: { date?: string };
  PatientDetails: { patientId: number };
};

// You can also define a combined type if needed
export type RootStackParamList = AuthStackParamList & PatientStackParamList & DoctorStackParamList;