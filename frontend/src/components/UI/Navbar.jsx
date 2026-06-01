import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Zap, Bell } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'Role';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const roleColor = {
    'Admin': 'text-red-400 bg-red-500/10 border-red-500/20',
    'Team Lead': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'Support User': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'Corporate User': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  const chipClass = roleColor[role] || 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';

  return (
    <header className="h-16 flex items-center justify-between px-6 z-30 sticky top-0 shrink-0 border-b border-slate-800/80"
      style={{ background: 'rgba(2, 6, 23, 0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/40 rounded-xl blur-md" />
          <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
        </div>
        <span className="text-lg font-black tracking-tight text-white select-none">
          Aegis<span className="gradient-text">Support</span>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Bell */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 badge-pulse" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800" />

        {/* User chip */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-sm font-semibold text-slate-100 leading-tight">{username}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border mt-0.5 ${chipClass}`}>
              {role}
            </span>
          </div>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
            <User className="h-4 w-4 text-indigo-400" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-red-950/50 hover:text-red-300 border border-slate-700/80 hover:border-red-900/60 rounded-xl text-slate-400 text-sm font-medium transition-all duration-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
