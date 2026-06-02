import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, User, Terminal, Shield, Zap, Brain, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
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

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Routing',
      description: 'Intelligent ticket classification and team assignment using Gemini AI'
    },
    {
      icon: Zap,
      title: 'Instant Resolution',
      description: 'Knowledge base matching for instant self-service solutions'
    },
    {
      icon: Users,
      title: 'Smart Team Management',
      description: 'Automated workload balancing across support divisions'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based access with encrypted authentication'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans overflow-hidden">
      
      {/* ============================================ */}
      {/* LEFT SIDE - Project Info & Branding          */}
      {/* ============================================ */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-slate-950 to-purple-950/60"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] animate-float" style={{ animationDelay: '4s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full justify-between">
          
          {/* Logo & Brand */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3.5 rounded-2xl shadow-xl shadow-indigo-500/30 flex items-center justify-center animate-pulse-glow">
                <Terminal className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Aegis<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Support</span>
                </h1>
                <p className="text-sm text-slate-400 font-medium">AI-Powered IT Support Platform</p>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="flex-1 flex flex-col justify-center py-8">
            <div className="max-w-lg">
              <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
                Resolve IT issues
                <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
                  faster with AI
                </span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-10">
                Streamline your support workflow with intelligent ticket routing, 
                AI-powered resolutions, and real-time team collaboration.
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="group p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all duration-300 cursor-default"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors duration-300 shrink-0">
                          <Icon className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-200 mb-0.5">{feature.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Illustration / Stats */}
          <div className="relative">
            <div className="flex items-center gap-6">
              {/* Animated Ticket Flow Illustration */}
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl backdrop-blur-sm">
                <div className="flex -space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center border-2 border-slate-900 text-xs font-bold text-white">A</div>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center border-2 border-slate-900 text-xs font-bold text-white">S</div>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-slate-900 text-xs font-bold text-white">T</div>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-300">Multi-Role Access</p>
                  <p className="text-[10px] text-slate-500">Admin, Support, Team Lead, Corporate</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Auto Resolution</p>
                  <p className="text-[10px] text-slate-500">KB-powered instant fixes</p>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-16 right-8 px-4 py-2 bg-slate-900/70 border border-slate-700/50 rounded-full backdrop-blur-sm animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-medium text-slate-300">AI Engine Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* RIGHT SIDE - Login Form                      */}
      {/* ============================================ */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 relative">
        
        {/* Subtle background for right side */}
        <div className="absolute inset-0 bg-slate-950"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.05),transparent_60%)]"></div>
        
        {/* Mobile Logo (hidden on desktop) */}
        <div className="lg:hidden flex items-center gap-3 mb-10 relative z-10">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Aegis<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Support</span>
          </span>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-slate-400">
              Sign in to access your support dashboard
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/60 border border-red-800/60 text-red-200 text-sm rounded-xl flex items-center gap-3 animate-shake">
              <div className="h-2 w-2 rounded-full bg-red-400 shrink-0 animate-pulse"></div>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-700/60 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all duration-200 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                  className="block w-full pl-12 pr-12 py-3.5 border border-slate-700/60 rounded-xl bg-slate-900/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all duration-200 sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
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

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/25 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8 pt-8 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Secured with enterprise-grade encryption</span>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-400 font-medium">Protected</span>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default Login;
