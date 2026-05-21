import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, toArray } from '../services/api';
import Badge from '../components/Badge';
import {
  Search, Users, Mail, Phone, User,
  Calendar, ArrowRight, UserX, UserCheck
} from 'lucide-react';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
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
        const res = await adminAPI.getAllPatients();
        setPatients(toArray(res.data));
      } catch {
        showToast('Failed to load patients', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = patients.filter(p => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    const matchSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone_number?.includes(search);

    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && p.is_active !== false) ||
      (filter === 'inactive' && p.is_active === false);

    return matchSearch && matchFilter;
  });

  const activeCount   = patients.filter(p => p.is_active !== false).length;
  const inactiveCount = patients.filter(p => p.is_active === false).length;

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
            placeholder="Search patients by name, email, phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition
                ${filter === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total',    count: patients.length, color: 'bg-slate-100 text-slate-700' },
          { label: 'Active',   count: activeCount,     color: 'bg-green-50 text-green-700' },
          { label: 'Inactive', count: inactiveCount,   color: 'bg-red-50 text-red-700' },
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
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No patients found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date of Birth</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p, i) => {
                  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username || '—';
                  const initials = fullName[0]?.toUpperCase() || 'P';
                  return (
                    <tr
                      key={p.id || i}
                      className="hover:bg-slate-50 transition cursor-pointer group"
                      onClick={() => navigate(`/patients/${p.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{fullName}</div>
                            <div className="text-xs text-slate-400">@{p.username || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{p.email || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{p.phone_number || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {p.date_of_birth
                          ? new Date(p.date_of_birth).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between">
                          <Badge
                            label={p.is_active !== false ? 'Active' : 'Inactive'}
                            variant={p.is_active !== false ? 'success' : 'gray'}
                          />
                          <ArrowRight
                            size={14}
                            className="text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all ml-3"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}