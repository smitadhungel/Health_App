  import { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { adminAPI, toArray } from '../services/api';
  import Badge from '../components/Badge';
  import {
    Search, CheckCircle, XCircle, User, Award,
    Stethoscope, ChevronDown, Filter
  } from 'lucide-react';

  export default function Doctors() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [rejectModal, setRejectModal] = useState(false);
    const [revokeModal, setRevokeModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [revokeReason, setRevokeReason] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
      const load = async () => {
        try {
          const res = await adminAPI.getAllDoctors();
          setDoctors(toArray(res.data));
        } catch {
          showToast('Failed to load doctors', 'error');
        } finally {
          setLoading(false);
        }
      };
      load();
    }, []);

    const handleApprove = async (doc) => {
      if (!window.confirm(`Approve Dr. ${doc.doctor_name}?`)) return;
      setActionLoading(doc.id);
      try {
        await adminAPI.approveDoctor(doc.id);
        setDoctors(prev => prev.map(d =>
          d.id === doc.id
            ? { ...d, is_verified: true, verification_status: 'APPROVED' }
            : d
        ));
        showToast(`Dr. ${doc.doctor_name} approved!`);
      } catch {
        showToast('Failed to approve doctor', 'error');
      } finally {
        setActionLoading(null);
      }
    };

    const openReject = (doc) => {
      setSelectedDoc(doc);
      setRejectReason('');
      setRejectModal(true);
    };

    const handleReject = async () => {
      if (!rejectReason.trim()) return;
      setActionLoading(selectedDoc.id);
      try {
        await adminAPI.rejectDoctor(selectedDoc.id, rejectReason);
        setDoctors(prev => prev.map(d =>
          d.id === selectedDoc.id
            ? { ...d, verification_status: 'REJECTED', is_verified: false }
            : d
        ));
        setRejectModal(false);
        showToast(`Dr. ${selectedDoc.doctor_name} rejected.`);
      } catch {
        showToast('Failed to reject doctor', 'error');
      } finally {
        setActionLoading(null);
      }
    };

    const openRevoke = (doc) => {
      setSelectedDoc(doc);
      setRevokeReason('');
      setRevokeModal(true);
    };

    const handleRevoke = async () => {
      if (!revokeReason.trim()) return;
      setActionLoading(selectedDoc.id);
      try {
        await adminAPI.revokeDoctor(selectedDoc.id, revokeReason);
        setDoctors(prev => prev.map(d =>
          d.id === selectedDoc.id
            ? { ...d, verification_status: 'REJECTED', is_verified: false, is_available: false }
            : d
        ));
        setRevokeModal(false);
        showToast(`Dr. ${selectedDoc.doctor_name}'s approval revoked.`);
      } catch {
        showToast('Failed to revoke doctor approval', 'error');
      } finally {
        setActionLoading(null);
      }
    };

    const filtered = doctors.filter(d => {
      const matchSearch =
        d.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase()) ||
        d.specialization_display?.toLowerCase().includes(search.toLowerCase());
      const status = d.verification_status || (d.is_verified ? 'APPROVED' : 'PENDING');
      const matchFilter =
        filter === 'all' ||
        (filter === 'pending' && status === 'PENDING') ||
        (filter === 'verified' && status === 'APPROVED') ||
        (filter === 'rejected' && status === 'REJECTED');
      return matchSearch && matchFilter;
    });

    return (
      <div className="space-y-5">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all
            ${toast.type === 'error' ? 'bg-red-500' : 'bg-brand-600'}`}>
            {toast.msg}
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search doctors by name, email, specialization..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'verified', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition
                  ${filter === f ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Total', count: doctors.length, color: 'bg-slate-100 text-slate-700' },
            { label: 'Pending', count: doctors.filter(d => (d.verification_status || 'PENDING') === 'PENDING').length, color: 'bg-amber-50 text-amber-700' },
            { label: 'Verified', count: doctors.filter(d => d.verification_status === 'APPROVED').length, color: 'bg-green-50 text-green-700' },
            { label: 'Rejected', count: doctors.filter(d => d.verification_status === 'REJECTED').length, color: 'bg-red-50 text-red-700' },
          ].map(c => (
            <div key={c.label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${c.color}`}>
              {c.label}: <span className="font-bold">{c.count}</span>
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
              <Stethoscope size={40} className="text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">No doctors found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Specialization</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">License</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/doctors/${doc.id}`)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                            {(doc.doctor_name || 'D')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{doc.doctor_name || '—'}</div>
                            <div className="text-xs text-slate-400">{doc.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{doc.specialization_display || '—'}</td>
                      <td className="px-5 py-4 text-slate-600 font-mono text-xs">{doc.license_number || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{doc.experience_years ? `${doc.experience_years} yrs` : '—'}</td>
                      <td className="px-5 py-4">
                        <Badge
                          label={
                            doc.verification_status === 'APPROVED' ? 'Verified' :
                            doc.verification_status === 'REJECTED' ? 'Rejected' : 'Pending'
                          }
                          variant={
                            doc.verification_status === 'APPROVED' ? 'success' :
                            doc.verification_status === 'REJECTED' ? 'danger' : 'warning'
                          }
                        />
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        {doc.verification_status === 'APPROVED' ? (
                          <button
                            onClick={() => openRevoke(doc)}
                            disabled={actionLoading === doc.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 text-orange-600 text-xs font-medium rounded-lg border border-orange-200 transition"
                          >
                            <XCircle size={13} />
                            Revoke
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(doc)}
                              disabled={actionLoading === doc.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
                            >
                              <CheckCircle size={13} />
                              Approve
                            </button>
                            <button
                              onClick={() => openReject(doc)}
                              disabled={actionLoading === doc.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition"
                            >
                              <XCircle size={13} />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-display font-bold text-slate-900 text-lg mb-1">Reject Doctor</h3>
              <p className="text-slate-500 text-sm mb-4">Dr. {selectedDoc?.doctor_name}</p>
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

        {/* Revoke Modal */}
        {revokeModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <XCircle size={20} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-lg leading-none">Revoke Approval</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Dr. {selectedDoc?.doctor_name}</p>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-700">
                ⚠️ This will immediately remove this doctor from the patient booking list and mark them as unavailable.
              </div>
              <textarea
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                placeholder="Enter reason for revoking approval (e.g. malpractice complaint, license suspended)..."
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