import { useState, useEffect } from 'react';
import { appointmentAPI, toArray } from '../services/api';
import Badge from '../components/Badge';
import { Search, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const statusVariant = (s = '') => {
  const map = { booked: 'info', completed: 'success', cancelled: 'danger', rescheduled: 'warning', pending: 'warning' };
  return map[s.toLowerCase()] || 'gray';
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await appointmentAPI.getAll();
        setAppointments(toArray(res.data));
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCancel = async (appt) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await appointmentAPI.cancel(appt.id);
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
      showToast('Appointment cancelled.');
    } catch {
      showToast('Failed to cancel appointment.', 'error');
    }
  };

  const handleComplete = async (appt) => {
    if (!window.confirm('Mark this appointment as completed?')) return;
    try {
      await appointmentAPI.complete(appt.id);
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'completed' } : a));
      showToast('Appointment marked as completed.');
    } catch {
      showToast('Failed to update appointment.', 'error');
    }
  };

  const statuses = ['all', 'booked', 'completed', 'cancelled', 'rescheduled'];

  const filtered = appointments.filter(a => {
    const matchSearch =
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || a.status?.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-brand-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient or doctor name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium capitalize transition
                ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: appointments.length, bg: 'bg-slate-100 text-slate-700' },
          { label: 'Booked', count: appointments.filter(a => a.status === 'booked').length, bg: 'bg-blue-50 text-blue-700' },
          { label: 'Completed', count: appointments.filter(a => a.status === 'completed').length, bg: 'bg-green-50 text-green-700' },
          { label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length, bg: 'bg-red-50 text-red-700' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
            <div className="text-2xl font-display font-bold">{s.count}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Calendar size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{appt.patient_name || appt.patient || '—'}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{appt.doctor_name || appt.doctor || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{appt.appointment_date || appt.date || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{appt.appointment_time || appt.time || '—'}</td>
                    <td className="px-5 py-4">
                      <Badge label={appt.status || 'Booked'} variant={statusVariant(appt.status)} />
                    </td>
                    <td className="px-5 py-4">
                      {appt.status === 'booked' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleComplete(appt)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg border border-green-200 transition"
                          >
                            <CheckCircle size={12} /> Complete
                          </button>
                          <button
                            onClick={() => handleCancel(appt)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition"
                          >
                            <XCircle size={12} /> Cancel
                          </button>
                        </div>
                      )}
                      {appt.status !== 'booked' && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}