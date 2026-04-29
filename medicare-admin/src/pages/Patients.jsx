import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { Search, Users, Mail, Phone, User } from 'lucide-react';
import Badge from '../components/Badge';

// NOTE: Update this to your actual patients list endpoint when available
// Currently uses profile endpoint as placeholder
export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Replace with your actual patients list API endpoint
    const load = async () => {
      try {
        // TODO: Replace with real patients list endpoint e.g. /api/users/patients/
        const res = await userAPI.getProfile();
        const data = res.data;
        // Wrap single user in array for now
        setPatients(Array.isArray(data) ? data : [data]);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search patients by name or email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Info banner */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
        <strong>Note:</strong> Connect your patient list API endpoint in <code className="bg-blue-100 px-1 rounded">src/pages/Patients.jsx</code> to see all registered patients.
      </div> */}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No patients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                          {(p.name || p.username || 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{p.name || p.username || '—'}</div>
                          <div className="text-xs text-slate-400">ID: {p.id || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{p.email || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{p.phone || p.phone_number || '—'}</td>
                    <td className="px-5 py-4 text-slate-600 capitalize">{p.gender || '—'}</td>
                    <td className="px-5 py-4">
                      <Badge label={p.is_active !== false ? 'Active' : 'Inactive'} variant={p.is_active !== false ? 'success' : 'gray'} />
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
