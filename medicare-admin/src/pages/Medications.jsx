import { useState, useEffect } from 'react';
import { medicationAPI, toArray } from '../services/api';
import Badge from '../components/Badge';
import { Pill, CheckCircle, Search } from 'lucide-react';

export default function Medications() {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await medicationAPI.getRefillRequests();
        setRefills(toArray(res.data));
      } catch {
        setRefills([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApprove = async (refill) => {
    setActionLoading(refill.id);
    try {
      await medicationAPI.approveRefill(refill.id);
      setRefills(prev => prev.map(r => r.id === refill.id ? { ...r, status: 'approved' } : r));
      showToast('Refill request approved!');
    } catch {
      showToast('Failed to approve refill.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = refills.filter(r =>
    r.medication_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.patient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg
          ${toast.type === 'error' ? 'bg-red-500' : 'bg-brand-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by medication or patient..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-slate-900">Refill Requests</h2>
          <p className="text-slate-400 text-xs mt-0.5">Pending medication refill approvals</p>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Pill size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No refill requests</p>
            <p className="text-slate-400 text-sm mt-1">All caught up!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Medication</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(refill => (
                  <tr key={refill.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Pill size={15} className="text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{refill.medication_name || '—'}</div>
                          <div className="text-xs text-slate-400">{refill.dosage || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{refill.patient_name || refill.patient || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{refill.created_at ? new Date(refill.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <Badge
                        label={refill.status || 'Pending'}
                        variant={refill.status === 'approved' ? 'success' : refill.status === 'rejected' ? 'danger' : 'warning'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      {refill.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(refill)}
                          disabled={actionLoading === refill.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
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