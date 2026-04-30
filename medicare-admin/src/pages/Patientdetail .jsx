import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Badge from '../components/Badge';
import {
  ArrowLeft, User, Mail, Phone, Calendar,
  Shield, Clock, Image as ImageIcon, UserX,
  UserCheck, Hash, AtSign
} from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getPatientDetails(id);
        setPatient(res.data);
      } catch {
        showToast('Failed to load patient details', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const photoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}/media/${path}`;
  };

  /* ─── Age helper ─── */
  const calcAge = (dob) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  /* ─── Loading skeleton ─── */
  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      <div className="h-10 w-32 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );

  if (!patient) return (
    <div className="flex flex-col items-center py-20 text-center">
      <User size={40} className="text-slate-200 mb-3" />
      <p className="text-slate-500 font-medium">Patient not found</p>
      <button
        onClick={() => navigate('/patients')}
        className="mt-4 text-brand-600 text-sm font-medium"
      >
        ← Back to Patients
      </button>
    </div>
  );

  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
    || patient.username || 'Unknown';
  const age = calcAge(patient.date_of_birth);

  return (
    <div className="space-y-5 max-w-3xl pb-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-brand-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition"
      >
        <ArrowLeft size={16} /> Back to Patients
      </button>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">

          {/* Avatar */}
          <div className="shrink-0">
            {patient.profile_picture ? (
              <img
                src={photoUrl(patient.profile_picture)}
                alt={fullName}
                onClick={() => setAvatarOpen(true)}
                className="w-20 h-20 rounded-2xl object-cover border border-slate-100 cursor-pointer hover:opacity-90 transition"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-display font-bold text-3xl">
                {fullName[0]?.toUpperCase() || 'P'}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display font-bold text-slate-900 text-2xl">{fullName}</h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  @{patient.username || '—'}
                  {age != null ? ` · ${age} years old` : ''}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{patient.email || '—'}</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                label={patient.is_active !== false ? 'Active' : 'Inactive'}
                variant={patient.is_active !== false ? 'success' : 'gray'}
              />
              <Badge
                label={patient.role_display || patient.role || 'Patient'}
                variant="brand"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { icon: Hash,     label: 'User ID',       value: patient.id != null ? `#${patient.id}` : null },
          { icon: AtSign,   label: 'Username',       value: patient.username },
          { icon: Mail,     label: 'Email',          value: patient.email },
          { icon: Phone,    label: 'Phone Number',   value: patient.phone_number },
          { icon: Calendar, label: 'Date of Birth',  value: patient.date_of_birth
              ? `${new Date(patient.date_of_birth).toLocaleDateString()}${age != null ? ` (${age} yrs)` : ''}`
              : null },
          { icon: User,     label: 'Role',           value: patient.role_display || patient.role },
        ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <Icon size={16} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-400 font-medium">{label}</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5 break-words">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Account status card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} className="text-slate-400" />
          <h3 className="font-display font-bold text-slate-900 text-sm">Account Status</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Account',
              value: patient.is_active !== false ? 'Active' : 'Inactive',
              color: patient.is_active !== false ? 'text-green-600' : 'text-slate-400',
              dot:   patient.is_active !== false ? 'bg-green-500' : 'bg-slate-300',
            },
            {
              label: 'Email Verified',
              value: patient.is_email_verified ? 'Verified' : 'Not Verified',
              color: patient.is_email_verified ? 'text-green-600' : 'text-amber-600',
              dot:   patient.is_email_verified ? 'bg-green-500' : 'bg-amber-400',
            },
            {
              label: 'Staff Access',
              value: patient.is_staff ? 'Staff' : 'Regular User',
              color: 'text-slate-600',
              dot:   patient.is_staff ? 'bg-brand-500' : 'bg-slate-300',
            },
          ].map(({ label, value, color, dot }) => (
            <div key={label}>
              <div className="text-xs text-slate-400 font-medium mb-1.5">{label}</div>
              <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Profile picture preview ── */}
      {patient.profile_picture && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-slate-400" />
              <h3 className="font-display font-bold text-slate-900 text-sm">Profile Picture</h3>
            </div>
            <button
              onClick={() => setAvatarOpen(true)}
              className="text-xs text-brand-600 font-medium hover:text-brand-700 transition"
            >
              View full size
            </button>
          </div>
          <img
            src={photoUrl(patient.profile_picture)}
            alt="Profile"
            onClick={() => setAvatarOpen(true)}
            className="w-24 h-24 rounded-2xl object-cover border border-slate-100 cursor-pointer hover:opacity-90 transition"
          />
        </div>
      )}

      {/* ── Record timestamps ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-slate-400" />
          <h3 className="font-display font-bold text-slate-900 text-sm">Record Information</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Joined At',    value: patient.created_at },
            { label: 'Last Updated', value: patient.updated_at },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-slate-400 font-medium mb-1">{label}</div>
              <div className="text-sm font-semibold text-slate-700">
                {value
                  ? new Date(value).toLocaleString()
                  : <span className="text-slate-300">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Avatar full-size modal ── */}
      {avatarOpen && patient.profile_picture && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setAvatarOpen(false)}
        >
          <img
            src={photoUrl(patient.profile_picture)}
            alt="Profile full size"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setAvatarOpen(false)}
            className="absolute top-5 right-5 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition"
          >
            <UserX size={24} />
          </button>
        </div>
      )}
    </div>
  );
}