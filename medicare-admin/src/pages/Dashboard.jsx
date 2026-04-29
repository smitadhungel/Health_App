import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, toArray } from '../services/api';
import Badge from '../components/Badge';
import {
  Users, UserCheck, Clock, CheckCircle,
  ArrowRight, Activity, TrendingUp, Shield
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminAPI.getAllDoctors();
        const doctors = toArray(res.data);
        const pending = doctors.filter(d => !d.is_verified);
        const verified = doctors.filter(d => d.is_verified);
        setStats({ total: doctors.length, verified: verified.length, pending: pending.length });
        setPendingDoctors(pending.slice(0, 5));
        setVerifiedDoctors(verified.slice(0, 5));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const StatCard = ({ label, value, icon: Icon, color, sub }) => {
    const colors = {
      brand: { bg: 'bg-brand-50', icon: 'text-brand-600', border: 'border-brand-100' },
      amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
      green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100' },
    };
    const c = colors[color] || colors.brand;
    return (
      <div className={`bg-white rounded-2xl border ${c.border} p-5 hover:shadow-md transition-shadow duration-200`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg} mb-4`}>
          <Icon size={22} className={c.icon} />
        </div>
        <div className="text-3xl font-display font-bold text-slate-900 mb-1">
          {loading ? <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" /> : value}
        </div>
        <div className="text-sm font-medium text-slate-600">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      </div>
    );
  };

  const DoctorRow = ({ doc, showApprove }) => (
    <div
      onClick={() => navigate(`/doctors`)}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition group"
    >
      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
        {(doc.doctor_name || 'D')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate">{doc.doctor_name || 'Unknown'}</div>
        <div className="text-xs text-slate-400 truncate">{doc.specialization_display || '—'}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showApprove
          ? <Badge label="Pending" variant="warning" />
          : <Badge label="Verified" variant="success" />
        }
        <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-teal-300 opacity-5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-brand-400 text-sm font-medium mb-1">Welcome back </p>
            <h1 className="font-display text-2xl font-bold text-white mb-1">MediCare Admin</h1>
            <p className="text-brand-300 text-sm">Here's what's happening on your platform today.</p>
          </div>
          <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-brand-700 items-center justify-center">
            <Shield size={26} className="text-brand-300" />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Doctors" value={stats.total} icon={UserCheck} color="brand" sub="Registered on platform" />
        <StatCard label="Pending Approvals" value={stats.pending} icon={Clock} color="amber" sub="Awaiting verification" />
        <StatCard label="Verified Doctors" value={stats.verified} icon={CheckCircle} color="green" sub="Active on platform" />
      </div>

      {/* Doctors panels */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Pending */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-900 text-sm">Pending Verifications</h2>
                <p className="text-slate-400 text-xs">{stats.pending} doctors waiting</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/doctors')}
              className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:text-brand-700 transition bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : pendingDoctors.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <CheckCircle size={24} className="text-green-500" />
                </div>
                <p className="text-slate-600 font-medium text-sm">All clear!</p>
                <p className="text-slate-400 text-xs mt-1">No pending verifications</p>
              </div>
            ) : (
              pendingDoctors.map(doc => <DoctorRow key={doc.id} doc={doc} showApprove />)
            )}
          </div>
        </div>

        {/* Verified */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-900 text-sm">Verified Doctors</h2>
                <p className="text-slate-400 text-xs">{stats.verified} active doctors</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/doctors')}
              className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:text-brand-700 transition bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-3">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : verifiedDoctors.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                  <Users size={24} className="text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium text-sm">No verified doctors yet</p>
              </div>
            ) : (
              verifiedDoctors.map(doc => <DoctorRow key={doc.id} doc={doc} showApprove={false} />)
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/doctors')}
          className="group bg-white border border-slate-100 hover:border-brand-200 hover:shadow-md rounded-2xl p-5 text-left transition-all duration-200 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center transition-colors shrink-0">
            <UserCheck size={22} className="text-brand-600" />
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-slate-900 text-sm">Manage Doctors</div>
            <div className="text-slate-400 text-xs mt-0.5">Approve, reject and view all doctors</div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        <button
          onClick={() => navigate('/patients')}
          className="group bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md rounded-2xl p-5 text-left transition-all duration-200 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors shrink-0">
            <Users size={22} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-display font-bold text-slate-900 text-sm">View Patients</div>
            <div className="text-slate-400 text-xs mt-0.5">Browse all registered patients</div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      </div>

    </div>
  );
}