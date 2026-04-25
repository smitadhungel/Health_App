export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Landing:undefined;
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
  Documents: undefined;
  DocumentDetails: { documentId: number };
  MyAppointments: undefined;
  AppointmentDetails: { appointmentId: number }; 
  DoctorRegistration: undefined;
  PlaceDetails: undefined;
  Prescriptions: undefined;
  PrescriptionDetail: { prescriptionId: number };
};

export type DoctorStackParamList = {
  DoctorsDashboard: undefined;
  AppointmentDetails: { appointmentId: number };
  DoctorDetails: { doctorId: number } | undefined;
  SetAvailability: undefined;
  AppointmentsCalendar: { date?: string };
  PatientDetails: { patientId: number };
  SharedDocuments: undefined;
  WritePrescription: {
    patientId: number;
    patientName: string;
    documentId?: number;
    documentTitle?: string;
  };
  DoctorPrescriptions: undefined;
  PrescriptionDetail: { prescriptionId: number };
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  PendingDoctors: undefined;
};

export type RootStackParamList = AuthStackParamList &
  PatientStackParamList &
  DoctorStackParamList &
  AdminStackParamList;