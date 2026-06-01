import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, User, Zap, ArrowRight, Shield } from 'lucide-react';
import LoadingSpinner from './UI/LoadingSpinner';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });
      const { token, role, username: returnedUser } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', returnedUser);
      try {
        const userId = atob(token);
        localStorage.setItem('userId', userId);
      } catch (e) {
        console.error('Error decoding token for userId', e);
      }
      if (role === 'Admin') navigate('/admin/dashboard');
      else if (role === 'Corporate User') navigate('/corporate/dashboard');
      else if (role === 'Support User') navigate('/support/tickets');
      else if (role === 'Team Lead') navigate('/team-lead/dashboard');
      else setError('Unknown role assigned');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden relative font-['Inter',sans-serif]">

      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-indigo-700/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-violet-700/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-700/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />

        {/* Content */}
        <div className="relative z-10 max-w-md text-center space-y-8 animate-slide-up">
          {/* Logo mark */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/30 rounded-2xl blur-xl animate-glow-pulse" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-2xl">
                <Zap className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-black tracking-tight text-white leading-tight">
              Aegis<span className="gradient-text">Support</span>
            </h1>
            <p className="mt-3 text-slate-400 text-base leading-relaxed">
              AI-powered enterprise IT support platform — resolve faster, learn smarter.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['AI Ticket Analysis', 'Smart Routing', 'Knowledge Base', 'Live Chat'].map((feat) => (
              <span
                key={feat}
                className="px-3 py-1 text-xs font-medium rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300"
              >
                {feat}
              </span>
            ))}
          </div>

          {/* Role badges */}
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {[
              { role: 'Admin', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { role: 'Team Lead', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { role: 'Support User', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { role: 'Corporate User', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            ].map(({ role, color, bg }) => (
              <div key={role} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${bg}`}>
                <Shield className={`h-3.5 w-3.5 ${color}`} />
                <span className={`text-xs font-semibold ${color}`}>{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Mobile ambient blobs */}
        <div className="lg:hidden absolute top-0 left-0 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="lg:hidden absolute bottom-0 right-0 w-64 h-64 bg-violet-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10 animate-scale-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Aegis<span className="gradient-text">Support</span>
            </span>
          </div>

          {/* Card */}
          <div className="glass rounded-2xl shadow-2xl overflow-hidden">
            {/* Card top accent line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />

            <div className="px-8 py-8">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
                <p className="text-sm text-slate-400 mt-1">Sign in to your workspace</p>
              </div>

              {/* Error alert */}
              {error && (
                <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/70 text-red-300 text-sm rounded-xl flex items-center gap-2.5 animate-shake">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 border border-slate-700/80 rounded-xl bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-sm input-glow"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-11 py-3 border border-slate-700/80 rounded-xl bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 text-sm input-glow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white btn-gradient shadow-lg shadow-indigo-500/25 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none mt-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <p className="text-center text-xs text-slate-500">
                  Secured by <span className="text-indigo-400 font-semibold">AegisSupport</span> · Enterprise IT Platform
                </p>
              </div>
            </div>
          </div>

          {/* Version tag */}
          <p className="text-center text-xs text-slate-600 mt-4">v1.0.0 — AI-Powered Support</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
