import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquarePlus, FileText, Bell, LogOut, Shield, User, ChevronRight } from 'lucide-react';

const CorporateSidebar = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'Corporate User';

  const menuItems = [
    { path: '/corporate/raise-request', name: 'Raise Request', icon: MessageSquarePlus },
    { path: '/corporate/my-tickets', name: 'My Tickets', icon: FileText },
    { path: '/corporate/notifications', name: 'Notifications', icon: Bell },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const avatarInitials = username.substring(0, 2).toUpperCase();

  return (
    <aside className="w-64 flex flex-col justify-between py-5 px-3 z-20 shrink-0 border-r border-slate-800/80"
      style={{ background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(12px)' }}
    >
      {/* Top Section */}
      <div className="space-y-5">
        {/* User Card */}
        <div className="mx-1 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800/80 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/25 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-sm shrink-0 shadow-inner">
              {avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">{username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="h-3 w-3 text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">{role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-2">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] px-2 mb-2">Navigation</p>
          <nav className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isActive
                      ? 'nav-active-glow flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-indigo-300 transition-all duration-200 group'
                      : 'nav-inactive flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200 group'
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="flex-1">{item.name}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-500/60 shrink-0" />}
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="nav-inactive flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-slate-500 hover:bg-red-950/30 hover:text-red-300 hover:border-l-red-500/40 transition-all duration-200 mt-3 w-full text-left"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-1 px-3.5 py-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
        <p className="text-xs font-bold text-slate-400">Aegis AI Support</p>
        <p className="text-[10px] text-slate-600 mt-0.5">v1.0.0 · Corporate Portal</p>
      </div>
    </aside>
  );
};

export default CorporateSidebar;
