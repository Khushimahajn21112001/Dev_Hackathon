import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquarePlus, FileText, Bell, LogOut, Shield, User } from 'lucide-react';

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

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-6 px-4 z-20 shrink-0">
      {/* Top Section */}
      <div className="space-y-6">
        {/* User Info */}
        <div className="px-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20">
              <User className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">{username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="h-3 w-3 text-indigo-400" />
                <p className="text-xs font-medium text-indigo-400 truncate">{role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  isActive
                    ? 'flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-400 transition-all duration-200'
                    : 'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-l-2 border-transparent transition-all duration-200'
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {item.name}
              </NavLink>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:bg-red-950/30 hover:text-red-300 border-l-2 border-transparent transition-all duration-200 mt-2"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-950/50 rounded-xl border border-slate-800/50 text-xs text-slate-500 flex flex-col gap-1">
        <p className="font-semibold text-slate-400">Aegis AI Support</p>
        <p>V1.0.0 • Corporate Portal</p>
      </div>
    </aside>
  );
};

export default CorporateSidebar;
