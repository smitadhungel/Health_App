import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Badge from '../components/Badge';
import {
  ArrowLeft, User, Award, Mail, Phone, MapPin,
  Star, Clock, CheckCircle, XCircle, Stethoscope, Calendar
} from 'lucide-react';

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getDoctorDetails(id);
        setDoctor(res.data);
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
      setDoctor(prev => ({ ...prev, is_verified: true }));
      showToast(`Dr. ${doctor.doctor_name} approved!`);
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
      showToast('Doctor rejected.');
    } catch {
      showToast('Failed to reject doctor', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-60 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Stethoscope size={40} className="text-slate-200 mb-3" />
        <p className="text-slate-500 font-medium">Doctor not found</p>
        <button onClick={() => navigate('/doctors')} className="mt-4 text-brand-600 text-sm font-medium">
          ← Back to Doctors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg
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

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold text-2xl shrink-0">
              {(doctor.doctor_name || 'D')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-xl">{doctor.doctor_name || '—'}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{doctor.specialization_display || '—'}</p>
              <div className="mt-2">
                <Badge
                  label={doctor.is_verified ? 'Verified' : 'Pending Verification'}
                  variant={doctor.is_verified ? 'success' : 'warning'}
                />
              </div>
            </div>
          </div>

          {!doctor.is_verified && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => { setRejectReason(''); setRejectModal(true); }}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-medium rounded-xl border border-red-200 transition"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: Mail, label: 'Email', value: doctor.email },
          { icon: Phone, label: 'Phone', value: doctor.phone_number || doctor.phone || '—' },
          { icon: Award, label: 'License Number', value: doctor.license_number || '—' },
          { icon: Clock, label: 'Experience', value: doctor.experience_years ? `${doctor.experience_years} years` : '—' },
          { icon: MapPin, label: 'Location', value: doctor.location || doctor.city || '—' },
          { icon: Star, label: 'Rating', value: doctor.average_rating ? `${doctor.average_rating} / 5` : 'No ratings yet' },
          { icon: Calendar, label: 'Consultation Fee', value: doctor.consultation_fee ? `Rs. ${doctor.consultation_fee}` : '—' },
          { icon: User, label: 'Available', value: doctor.is_available ? 'Yes' : 'No' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <Icon size={17} className="text-slate-500" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">{label}</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">{value || '—'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bio */}
      {doctor.bio && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-display font-bold text-slate-900 text-sm mb-2">About</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{doctor.bio}</p>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-display font-bold text-slate-900 text-lg mb-1">Reject Doctor</h3>
            <p className="text-slate-500 text-sm mb-4">Dr. {doctor.doctor_name}</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
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
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}