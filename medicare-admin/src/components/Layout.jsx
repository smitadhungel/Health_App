import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu} from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  // Helper function to determine title based on dynamic routes
  const getPageTitle = (path) => {
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/doctors')) return 'Doctor Management';
    if (path.startsWith('/patients')) return 'Patient Management';
    if (path.startsWith('/appointments')) return 'Appointments';
    if (path.startsWith('/medications')) return 'Medications';
    if (path.startsWith('/documents')) return 'Documents';
    return 'MediCare Admin';
  };

  const title = getPageTitle(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Component */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition text-slate-600"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-display text-xl font-bold text-slate-900">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* <button className="relative p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
            </button> */}
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* This renders the PatientDetail component */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}