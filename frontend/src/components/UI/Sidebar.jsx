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
  BookOpen
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

  const activeLink = 'flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 transition-all duration-200';
  const inactiveLink = 'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-l-2 border-transparent transition-all duration-200';

  const roleLinks = links[role] || [];
  // Roles that need a Logout button in the links list or at the bottom
  const needsLogout = ['Team Lead', 'Support User', 'Corporate User'].includes(role);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-6 px-4 z-20 shrink-0 font-sans">
      <div className="space-y-6">
        {/* User Role Card */}
        <div className="px-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20">
              <User className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">{username}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="h-3 w-3 text-indigo-400" />
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider truncate">{role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          {roleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => (isActive ? activeLink : inactiveLink)}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{link.name}</span>
              </NavLink>
            );
          })}

          {/* Add logout directly to the navigation flow if requested role */}
          {needsLogout && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-red-950/30 hover:text-red-300 border-l-2 border-transparent transition-all duration-200 mt-2"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Logout</span>
            </button>
          )}
        </nav>
      </div>

      <div className="px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-xs text-slate-500 flex flex-col gap-1">
        <p className="font-semibold text-slate-400">Aegis AI Support</p>
        <p>V1.0.0 • Local Database</p>
      </div>
    </aside>
  );
};

export default Sidebar;
