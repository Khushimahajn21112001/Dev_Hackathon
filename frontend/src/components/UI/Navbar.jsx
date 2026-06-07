import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Terminal, Bell } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'Role';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 text-white h-16 flex items-center justify-between px-6 z-30 sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center">
          <Terminal className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          Aegis<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Support</span>
        </span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-900 animate-pulse"></span>
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-800"></div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-2 rounded-full flex items-center justify-center border border-slate-600/50 shadow-inner">
            <User className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-slate-100 leading-tight">{username}</p>
            <p className="text-xs text-slate-400 leading-tight">{role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/60 hover:bg-red-950/50 hover:text-red-200 border border-slate-700/60 hover:border-red-800/60 rounded-xl text-sm text-slate-300 transition-all duration-200 btn-press"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
