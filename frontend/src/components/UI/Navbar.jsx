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
    <header className="bg-slate-900 border-b border-slate-800 text-white h-16 flex items-center justify-between px-6 z-30 sticky top-0">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center">
          <Terminal className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          Aegis<span className="text-indigo-400">Support</span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-white transition duration-150 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-900"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="bg-slate-800 p-2 rounded-full flex items-center justify-center border border-slate-700">
            <User className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-slate-100">{username}</p>
            <p className="text-xs text-slate-400">{role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-red-950/40 hover:text-red-200 border border-slate-700 hover:border-red-900 rounded-lg text-sm transition duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
