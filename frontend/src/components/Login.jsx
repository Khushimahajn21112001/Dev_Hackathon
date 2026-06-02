import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, User, Terminal } from 'lucide-react';
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

      const { token, role, username: returnedUser, userId, team } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', returnedUser);
      if (userId) localStorage.setItem('userId', userId);
      if (team) localStorage.setItem('teamId', team.toString());

      // Redirect based on role
      if (role === 'Admin') {
        navigate('/admin/dashboard');
      } else if (role === 'Corporate User') {
        navigate('/corporate/dashboard');
      } else if (role === 'Support User') {
        navigate('/support/tickets');
      } else if (role === 'Team Lead') {
        navigate('/team-lead/dashboard');
      } else {
        setError('Unknown role assigned');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none animate-float"></div>
      <div className="absolute bottom-[-10%] right-[15%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-blue-900/10 rounded-full blur-[80px] pointer-events-none animate-float" style={{ animationDelay: '3s' }}></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 animate-slide-down">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center animate-pulse-glow">
            <Terminal className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold tracking-tight text-white">
            Aegis<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Support</span>
          </span>
        </div>
        <h2 className="mt-8 text-center text-3xl font-extrabold text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          AI-Powered IT Support Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 animate-slide-up">
        <div className="glass py-8 px-4 shadow-2xl shadow-indigo-950/20 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 bg-red-950/60 border border-red-800/60 text-red-200 text-sm rounded-xl flex items-center justify-center gap-2 animate-shake">
              <div className="h-2 w-2 rounded-full bg-red-400 shrink-0"></div>
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. corporate"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-700/60 rounded-xl bg-slate-950/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3.5 border border-slate-700/60 rounded-xl bg-slate-950/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors duration-200 p-1 rounded-lg hover:bg-slate-800/50"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/25 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Visual separator */}
          <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-xs text-slate-500">
              Secured with enterprise-grade encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
