import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquarePlus,
  Bell,
  LogOut,
  Shield,
  User,
  Layers,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'Corporate User';
  const username = localStorage.getItem('username') || 'User';

  const links = {
    Admin: [
      { path: '/admin/dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin/teams', name: 'Team Management', icon: Layers },
      { path: '/admin/users', name: 'User Management', icon: Users },
      { path: '/admin/tickets', name: 'Manage Tickets', icon: FileText },
      { path: '/admin/resolution-kb', name: 'Resolution KB', icon: BookOpen },
    ],
    'Team Lead': [
      { path: '/team-lead/dashboard', name: 'Team Dashboard', icon: LayoutDashboard },
      { path: '/team-lead/tickets', name: 'Team Tickets', icon: FileText },
    ],
    'Support User': [
      { path: '/support/tickets', name: 'My Tickets', icon: FileText },
      { path: '/support/notifications', name: 'Notifications', icon: Bell },
    ],
    'Corporate User': [
      { path: '/corporate/raise-request', name: 'New Issue', icon: MessageSquarePlus },
      { path: '/corporate/my-tickets', name: 'My Tickets', icon: FileText },
      { path: '/corporate/notifications', name: 'Notifications', icon: Bell },
    ],
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const roleLinks = links[role] || [];
  const needsLogout = ['Team Lead', 'Support User', 'Corporate User'].includes(role);

  const roleColor = {
    'Admin': 'text-red-400',
    'Team Lead': 'text-amber-400',
    'Support User': 'text-blue-400',
    'Corporate User': 'text-emerald-400',
  };

  const avatarInitials = username.substring(0, 2).toUpperCase();

  return (
    <aside className="w-64 flex flex-col justify-between py-5 px-3 z-20 shrink-0 border-r border-slate-800/80"
      style={{ background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(12px)' }}
    >
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
                <Shield className={`h-3 w-3 ${roleColor[role] || 'text-indigo-400'}`} />
                <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${roleColor[role] || 'text-indigo-400'}`}>
                  {role}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav section label */}
        <div className="px-2">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] px-2 mb-2">Navigation</p>
          <nav className="flex flex-col gap-0.5">
            {roleLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    isActive
                      ? 'nav-active-glow flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-indigo-300 transition-all duration-200 group'
                      : 'nav-inactive flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200 group'
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="flex-1">{link.name}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-500/60 shrink-0" />}
                    </>
                  )}
                </NavLink>
              );
            })}

            {needsLogout && (
              <button
                onClick={handleLogout}
                className="nav-inactive flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl text-slate-500 hover:bg-red-950/30 hover:text-red-300 hover:border-l-red-500/40 transition-all duration-200 mt-3 w-full text-left"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-1 px-3.5 py-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
        <p className="text-xs font-bold text-slate-400">Aegis AI Support</p>
        <p className="text-[10px] text-slate-600 mt-0.5">v1.0.0 · Enterprise Platform</p>
      </div>
    </aside>
  );
};

export default Sidebar;
