import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';
import { 
  UserPlus, 
  Users, 
  Shield, 
  Mail, 
  Lock, 
  Activity, 
  Edit2, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Tag
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Support User');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState('Active');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, teamsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users'),
        axios.get('http://localhost:5000/api/tickets/teams')
      ]);
      setUsers(usersRes.data.users || []);
      setTeams(teamsRes.data.teams || []);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to fetch users and teams.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    try {
      setError('');
      setSuccess('');
      const response = await axios.post('http://localhost:5000/api/admin/users', {
        username,
        password,
        name,
        email,
        role,
        team: (role === 'Team Lead' || role === 'Support User') && team ? team : null,
        status
      });

      setSuccess('User created successfully!');
      setUsername('');
      setPassword('');
      setName('');
      setEmail('');
      setRole('Support User');
      setTeam('');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword(''); // Keep empty if not updating
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role);
    setEditTeam(user.team?._id || '');
    setEditStatus(user.status || 'Active');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setError('');
      setSuccess('');
      const response = await axios.put(`http://localhost:5000/api/admin/users/${editingUser._id}`, {
        username: editUsername,
        password: editPassword || undefined,
        name: editName,
        email: editEmail,
        role: editRole,
        team: (editRole === 'Team Lead' || editRole === 'Support User') && editTeam ? editTeam : null,
        status: editStatus
      });

      setSuccess('User updated successfully!');
      setShowEditModal(false);
      setEditingUser(null);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const response = await axios.patch(`http://localhost:5000/api/admin/users/${user._id}/status`);
      fetchData();
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Failed to update user status.');
    }
  };

  // Stats
  const totalUsers = users.length;
  const supportUsers = users.filter(u => u.role === 'Support User').length;
  const teamLeads = users.filter(u => u.role === 'Team Lead').length;
  const corporateUsers = users.filter(u => u.role === 'Corporate User').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">User Management Console</h1>
              <p className="text-sm text-slate-400 mt-1.5">
                Provision new employee logins, assign system roles, and associate agents with technical teams.
              </p>
            </div>
            <div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition duration-150"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs font-semibold">Sync Registry</span>
              </button>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{totalUsers}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Team Leads</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{teamLeads}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Support Agents</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{supportUsers}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <UserPlus className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Corporate Users</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{corporateUsers}</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 text-red-200 text-sm rounded-xl flex items-center gap-2 animate-shake">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-900 text-emerald-200 text-sm rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create User Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5 h-fit font-sans">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
                  Provision User Account
                </h3>
                <p className="text-xs text-slate-400 mt-1">Spin up a new technical or corporate login credential.</p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jdoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full px-4 py-2.5 mt-1.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-2.5 mt-1.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Lock className="h-4 w-4 text-slate-650 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-4 py-2.5 mt-1.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="e.g. jdoe@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-2.5 mt-1.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Mail className="h-4 w-4 text-slate-650 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-3 py-2.5 mt-1.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Support User">Support User</option>
                    <option value="Corporate User">Corporate User</option>
                  </select>
                </div>

                {(role === 'Team Lead' || role === 'Support User') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Team</label>
                    <select
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      className="block w-full px-3 py-2.5 mt-1.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- No Assigned Team --</option>
                      {teams.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex justify-center py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg active:scale-98 transition-all duration-150"
                >
                  Create User Login
                </button>
              </form>
            </div>

            {/* Users List Roster */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-indigo-400" />
                  Credentials Registry ({totalUsers})
                </h3>
                <p className="text-xs text-slate-400 mt-1">Audit log profiles, role statuses, and system routing groups.</p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-950 rounded-xl border border-slate-850 animate-pulse" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No accounts found. Use the control panel to register credentials.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800 text-sm">
                    <thead>
                      <tr className="text-slate-400 font-semibold text-left">
                        <th className="pb-3 font-semibold">User</th>
                        <th className="pb-3 font-semibold">Role</th>
                        <th className="pb-3 font-semibold">Assigned Team</th>
                        <th className="pb-3 font-semibold text-center">Status</th>
                        <th className="pb-3 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-350">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-850/30 transition-colors">
                          <td className="py-3.5 max-w-[150px]">
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{u.username}</p>
                              <p className="text-xs text-slate-500 truncate">{u.name || 'No Name'} • {u.email || 'No Email'}</p>
                            </div>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-200">
                              <Shield className="h-3.5 w-3.5 text-indigo-400" />
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 whitespace-nowrap text-slate-350 font-medium">
                            {u.team?.name ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-0.5">
                                <Tag className="h-3 w-3 text-slate-500" />
                                {u.team.name}
                              </span>
                            ) : (
                              <span className="text-slate-650 italic">None</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              u.status === 'Active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {u.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="p-1.5 bg-slate-950 border border-slate-850 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition duration-150"
                                title="Edit User Profile"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 border rounded-lg transition duration-150 ${
                                  u.status === 'Active'
                                    ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400 hover:bg-emerald-950/40'
                                    : 'bg-red-950/20 border-red-900 text-red-400 hover:bg-red-950/40'
                                }`}
                                title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                              >
                                {u.status === 'Active' ? <ToggleRight className="h-4.5 w-4.5" /> : <ToggleLeft className="h-4.5 w-4.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <h3 className="text-lg font-bold text-slate-100">Modify User Account</h3>
            <p className="text-xs text-slate-400 mt-1">Update login details, system roles, and overall status.</p>

            <form onSubmit={handleUpdateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password (leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">System Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="block w-full px-3 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Support User">Support User</option>
                  <option value="Corporate User">Corporate User</option>
                </select>
              </div>

              {(editRole === 'Team Lead' || editRole === 'Support User') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Team</label>
                  <select
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                    className="block w-full px-3 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- No Assigned Team --</option>
                    {teams.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="block w-full px-3 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg active:scale-95 transition-all duration-150"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
