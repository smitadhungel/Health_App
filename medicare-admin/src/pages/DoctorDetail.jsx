import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Badge from '../components/Badge';
import {
  ArrowLeft, User, Award, Mail, Phone, MapPin,
  Star, Clock, CheckCircle, XCircle, Stethoscope,
  Calendar, FileText, Building2, Activity, Shield,
  DollarSign, BookOpen, Image as ImageIcon
} from 'lucide-react';

const DAY_MAP = {
  0: 'Monday', 1: 'Tuesday', 2: 'Wednesday',
  3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday'
};

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [revokeModal, setRevokeModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [licenseOpen, setLicenseOpen] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, availRes] = await Promise.allSettled([
          adminAPI.getDoctorDetails(id),
          adminAPI.getDoctorAvailability(id),
        ]);
        if (docRes.status === 'fulfilled') setDoctor(docRes.value.data);
        if (availRes.status === 'fulfilled') {
          const data = availRes.value.data;
          const list = Array.isArray(data) ? data : data?.results || data?.availability || [];
          // Sort by day_of_week integer
          setAvailability([...list].sort((a, b) => a.day_of_week - b.day_of_week));
        }
      } catch {
        showToast('Failed to load doctor details', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleApprove = async () => {
    if (!window.confirm(`Approve Dr. ${doctor.doctor_name}?`)) return;
    setActionLoading(true);
    try {
      await adminAPI.approveDoctor(id);
      setDoctor(prev => ({ ...prev, is_verified: true, verification_status: 'APPROVED' }));
      showToast(`Dr. ${doctor.doctor_name} approved successfully!`);
    } catch {
      showToast('Failed to approve doctor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await adminAPI.rejectDoctor(id, rejectReason);
      setRejectModal(false);
      navigate('/doctors');
    } catch {
      showToast('Failed to reject doctor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) return;
    setActionLoading(true);
    try {
      await adminAPI.revokeDoctor(id, revokeReason);
      setDoctor(prev => ({
        ...prev,
        verification_status: 'REJECTED',
        is_verified: false,
        is_available: false,
        rejection_reason: revokeReason,
      }));
      setRevokeModal(false);
      showToast('Doctor approval revoked successfully.');
    } catch {
      showToast('Failed to revoke approval', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const statusVariant = (s = '') => {
    const map = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger' };
    return map[s.toUpperCase()] || 'gray';
  };

  const statusLabel = (s = '') => {
    const map = { APPROVED: 'Approved', PENDING: 'Pending Review', REJECTED: 'Rejected' };
    return map[s.toUpperCase()] || s;
  };

  const photoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}/media/${path}`;
  };

  if (loading) return (
    <div className="space-y-4 max-w-4xl">
      <div className="h-10 w-32 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );

  if (!doctor) return (
    <div className="flex flex-col items-center py-20 text-center">
      <Stethoscope size={40} className="text-slate-200 mb-3" />
      <p className="text-slate-500 font-medium">Doctor not found</p>
      <button onClick={() => navigate('/doctors')} className="mt-4 text-brand-600 text-sm font-medium">
        ← Back to Doctors
      </button>
    </div>
  );

  const isPending = doctor.verification_status === 'PENDING';
  const fullName = doctor.doctor_name || `${doctor.user?.first_name || ''} ${doctor.user?.last_name || ''}`.trim() || 'Unknown';

  return (
    <div className="space-y-5 max-w-4xl pb-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-brand-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate('/doctors')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition"
      >
        <ArrowLeft size={16} /> Back to Doctors
      </button>

      {/* ── Header card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar / profile photo */}
          <div className="shrink-0">
            {doctor.profile_photo ? (
              <img
                src={photoUrl(doctor.profile_photo)}
                alt={fullName}
                className="w-20 h-20 rounded-2xl object-cover border border-slate-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold text-3xl">
                {fullName[0]?.toUpperCase() || 'D'}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display font-bold text-slate-900 text-2xl">Dr. {fullName}</h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  {doctor.specialization_display || doctor.specialization || '—'}
                  {doctor.qualification ? ` · ${doctor.qualification}` : ''}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {doctor.user?.email || doctor.email || '—'}
                </p>
              </div>

              {/* Approve / Reject buttons */}
              {isPending && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    onClick={() => { setRejectReason(''); setRejectModal(true); }}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
              {/* Revoke button — only for approved doctors */}
              {doctor.verification_status === 'APPROVED' && (
                <button
                  onClick={() => { setRevokeReason(''); setRevokeModal(true); }}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 text-orange-600 text-sm font-semibold rounded-xl border border-orange-200 transition shrink-0"
                >
                  <XCircle size={16} /> Revoke Approval
                </button>
              )}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge
                label={statusLabel(doctor.verification_status)}
                variant={statusVariant(doctor.verification_status)}
              />
              <Badge
                label={doctor.is_available ? 'Available' : 'Unavailable'}
                variant={doctor.is_available ? 'brand' : 'gray'}
              />
              {doctor.rating > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <Star size={11} fill="currentColor" /> {Number(doctor.rating).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { icon: Mail,        label: 'Email',            value: doctor.user?.email || doctor.email },
          { icon: Phone,       label: 'Phone',            value: doctor.user?.phone_number || doctor.phone_number },
          { icon: Award,       label: 'License Number',   value: doctor.license_number },
          { icon: BookOpen,    label: 'Qualification',    value: doctor.qualification },
          { icon: Clock,       label: 'Experience',       value: doctor.experience_years != null ? `${doctor.experience_years} years` : null },
          { icon: DollarSign,  label: 'Consultation Fee', value: doctor.consultation_fee ? `Rs. ${Number(doctor.consultation_fee).toLocaleString()}` : null },
          { icon: Building2,   label: 'Clinic Address',   value: doctor.clinic_address },
          { icon: Activity,    label: 'Rating',           value: doctor.rating != null ? `${Number(doctor.rating).toFixed(2)} / 5.00` : null },
          { icon: User,        label: 'Total Patients',   value: doctor.total_patients != null ? String(doctor.total_patients) : null },
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

      {/* ── Bio ── */}
      {doctor.bio && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} className="text-slate-400" />
            <h3 className="font-display font-bold text-slate-900 text-sm">About / Bio</h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">{doctor.bio}</p>
        </div>
      )}

      {/* ── Rejection reason ── */}
      {doctor.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={15} className="text-red-500" />
            <h3 className="font-display font-bold text-red-700 text-sm">Rejection Reason</h3>
          </div>
          <p className="text-red-600 text-sm leading-relaxed">{doctor.rejection_reason}</p>
        </div>
      )}

      {/* ── License photo ── */}
      {doctor.license_photo && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-slate-400" />
              <h3 className="font-display font-bold text-slate-900 text-sm">License Document</h3>
            </div>
            <button
              onClick={() => setLicenseOpen(true)}
              className="text-xs text-brand-600 font-medium hover:text-brand-700 transition"
            >
              View full size
            </button>
          </div>
          <img
            src={photoUrl(doctor.license_photo)}
            alt="License"
            onClick={() => setLicenseOpen(true)}
            className="max-w-xs rounded-xl border border-slate-100 object-contain cursor-pointer hover:opacity-90 transition"
          />
        </div>
      )}

      {/* ── Availability schedule ── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Calendar size={15} className="text-slate-400" />
          <h3 className="font-display font-bold text-slate-900 text-sm">Weekly Availability</h3>
          <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {availability.length} day{availability.length !== 1 ? 's' : ''} set
          </span>
        </div>

        {availability.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Calendar size={32} className="text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm">No availability schedule set yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {availability.map((slot, i) => {
              const dayName = typeof slot.day_of_week === 'number'
                ? DAY_MAP[slot.day_of_week]
                : slot.day_of_week;
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition">
                  <div className="w-28 shrink-0">
                    <span className="text-sm font-semibold text-slate-900">{dayName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Clock size={13} className="text-slate-400" />
                    {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                  </div>
                  <div className="text-xs text-slate-400 mx-auto">
                    {slot.slot_duration} min slots
                  </div>
                  <Badge
                    label={slot.is_active ? 'Active' : 'Inactive'}
                    variant={slot.is_active ? 'success' : 'gray'}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Timestamps ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} className="text-slate-400" />
          <h3 className="font-display font-bold text-slate-900 text-sm">Record Information</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Created At',   value: doctor.created_at },
            { label: 'Updated At',   value: doctor.updated_at },
            { label: 'Verified At',  value: doctor.verified_at },
            { label: 'Verified By',  value: doctor.verified_by ? `Admin #${doctor.verified_by}` : null },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-slate-400 font-medium mb-1">{label}</div>
              <div className="text-sm font-semibold text-slate-700">
                {value ? new Date(value).toLocaleString() : <span className="text-slate-300">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── License full size modal ── */}
      {licenseOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setLicenseOpen(false)}
        >
          <img
            src={photoUrl(doctor.license_photo)}
            alt="License full size"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLicenseOpen(false)}
            className="absolute top-5 right-5 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition"
          >
            <XCircle size={24} />
          </button>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-display font-bold text-slate-900 text-lg mb-1">Reject Doctor</h3>
            <p className="text-slate-500 text-sm mb-4">Dr. {fullName}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason (will be visible to the doctor)..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revoke Modal ── */}
      {revokeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <XCircle size={20} className="text-orange-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-lg leading-none">Revoke Approval</h3>
                <p className="text-slate-500 text-sm mt-0.5">Dr. {fullName}</p>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-700">
               This will immediately remove this doctor from the patient booking list and mark them as unavailable.
            </div>
            <textarea
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="Enter reason for revoking (e.g. malpractice complaint, license suspended)..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRevokeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={!revokeReason.trim() || actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}