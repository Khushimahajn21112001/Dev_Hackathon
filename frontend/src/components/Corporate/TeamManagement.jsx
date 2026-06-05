import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';
import { 
  Users, 
  Plus, 
  Edit2, 
  Activity, 
  Shield, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ToggleLeft, 
  ToggleRight,
  Trash2
} from 'lucide-react';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTeamLead, setEditTeamLead] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [showEditModal, setShowEditModal] = useState(false);

  const [supportUsers, setSupportUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editSelectedMembers, setEditSelectedMembers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [teamsRes, leadsRes, supportRes] = await Promise.all([
        axios.get('http://localhost:5000/api/tickets/teams'),
        axios.get('http://localhost:5000/api/tickets/team-leads'),
        axios.get('http://localhost:5000/api/tickets/support-users')
      ]);
      setTeams(teamsRes.data.teams || []);
      setTeamLeads(leadsRes.data.leads || []);
      setSupportUsers(supportRes.data.users || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to fetch teams and team leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setError('');
      setSuccess('');
      const response = await axios.post('http://localhost:5000/api/tickets/teams', {
        name,
        description,
        teamLead: teamLead || null,
        members: selectedMembers
      });

      if (response.data.success) {
        setSuccess('Team created successfully!');
        setName('');
        setDescription('');
        setTeamLead('');
        setSelectedMembers([]);
        setShowCreateModal(false);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.response?.data?.message || 'Failed to create team.');
    }
  };

  const handleOpenEditModal = (team) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditTeamLead(team.teamLead?._id || '');
    setEditStatus(team.status || 'Active');
    setEditSelectedMembers(team.members ? team.members.map(m => m._id) : []);
    setShowEditModal(true);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editingTeam) return;

    try {
      setError('');
      setSuccess('');
      const response = await axios.put(`http://localhost:5000/api/tickets/teams/${editingTeam._id}`, {
        name: editName,
        description: editDescription,
        teamLead: editTeamLead || null,
        status: editStatus,
        members: editSelectedMembers
      });

      if (response.data.success) {
        setSuccess('Team updated successfully!');
        setShowEditModal(false);
        setEditingTeam(null);
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error updating team:', err);
      setError(err.response?.data?.message || 'Failed to update team.');
    }
  };

  const handleToggleStatus = async (team) => {
    const newStatus = team.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await axios.patch(`http://localhost:5000/api/tickets/teams/${team._id}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling team status:', err);
      setError('Failed to update team status.');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this division? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await axios.delete(`http://localhost:5000/api/tickets/teams/${teamId}`);
      if (response.data.success) {
        setSuccess('Division deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting team:', err);
      setError('Failed to delete division.');
    }
  };

  // Stats
  const totalTeams = teams.length;
  const activeTeams = teams.filter(t => t.status === 'Active').length;
  const inactiveTeams = teams.filter(t => t.status === 'Inactive').length;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Team Management Console</h1>
              <p className="text-sm text-slate-400 mt-1.5">
                Create new tactical response groups, designate leaders, and monitor division rosters.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition duration-150"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-xs font-semibold hidden sm:inline">Sync Registry</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 p-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition duration-150 shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Plus className="h-4.5 w-4.5" />
                <span className="text-xs font-bold">Create Team</span>
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Divisions</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{totalTeams}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Activity className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Divisions</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{activeTeams}</p>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Shield className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Inactive Divisions</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{inactiveTeams}</p>
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

          {/* Teams Registry List Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-indigo-400" />
                  Active Registry ({totalTeams})
                </h3>
                <p className="text-xs text-slate-400 mt-1">Real-time status check on active divisions and leads.</p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-950 rounded-xl border border-slate-850 animate-pulse" />
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No support teams have been provisioned yet. Use the control panel to add a team.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800 text-sm">
                    <thead>
                      <tr className="text-slate-400 font-semibold text-left">
                        <th className="pb-3 font-semibold">Team Name</th>
                        <th className="pb-3 font-semibold">Description</th>
                        <th className="pb-3 font-semibold">Team Lead</th>
                        <th className="pb-3 font-semibold text-center">Members</th>
                        <th className="pb-3 font-semibold text-center">Status</th>
                        <th className="pb-3 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-350">
                      {teams.map((team) => (
                        <tr key={team._id} className="hover:bg-slate-850/30 transition-colors">
                          <td className="py-3.5 font-bold text-white max-w-[120px] truncate">{team.name}</td>
                          <td className="py-3.5 text-slate-400 max-w-[180px] truncate" title={team.description}>
                            {team.description || <span className="text-slate-600 italic">No description</span>}
                          </td>
                          <td className="py-3.5 text-indigo-400 font-medium">
                            {team.teamLead?.username || <span className="text-slate-500 italic">Unassigned</span>}
                          </td>
                          <td className="py-3.5 text-center font-semibold text-slate-200">{team.totalMembers}</td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              team.status === 'Active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {team.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(team)}
                                className="p-1.5 bg-slate-950 border border-slate-850 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition duration-150"
                                title="Edit Team Details"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(team)}
                                className={`p-1.5 border rounded-lg transition duration-150 ${
                                  team.status === 'Active'
                                    ? 'bg-emerald-950/20 border-emerald-900 text-emerald-400 hover:bg-emerald-950/40'
                                    : 'bg-red-950/20 border-red-900 text-red-400 hover:bg-red-950/40'
                                }`}
                                title={team.status === 'Active' ? 'Deactivate Team' : 'Activate Team'}
                              >
                                {team.status === 'Active' ? <ToggleRight className="h-4.5 w-4.5" /> : <ToggleLeft className="h-4.5 w-4.5" />}
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(team._id)}
                                className="p-1.5 bg-red-950/20 border border-red-900 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition duration-150"
                                title="Delete Division"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </main>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Create Support Team
            </h3>
            <p className="text-xs text-slate-400 mt-1">Spin up a new technical resolution division.</p>

            <form onSubmit={handleCreateTeam} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Operations Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Briefly describe this team's scope of service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Lead</label>
                <select
                  value={teamLead}
                  onChange={(e) => setTeamLead(e.target.value)}
                  className="block w-full px-3 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Assign Team Lead (Optional) --</option>
                  {teamLeads.filter(lead => lead.status === 'Active' || lead.status === undefined).map(lead => (
                    <option key={lead._id} value={lead._id}>{lead.username} ({lead.name || 'No Name'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team Members (Support Users)</label>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !selectedMembers.includes(val)) {
                      setSelectedMembers([...selectedMembers, val]);
                    }
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Add Support User --</option>
                  {supportUsers
                    .filter(user => !selectedMembers.includes(user._id) && !user.team)
                    .map(user => (
                      <option key={user._id} value={user._id}>
                        {user.username} {user.name ? `(${user.name})` : ''}
                      </option>
                    ))
                  }
                </select>

                {selectedMembers.length > 0 && (
                  <div className="mt-3 bg-slate-950 border border-slate-850 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                    {selectedMembers.map(memberId => {
                      const memberObj = supportUsers.find(u => u._id === memberId);
                      if (!memberObj) return null;
                      return (
                        <div key={memberId} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                          <span className="font-semibold text-slate-200">
                            {memberObj.username} {memberObj.name ? `(${memberObj.name})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedMembers(selectedMembers.filter(id => id !== memberId))}
                            className="text-red-400 hover:text-red-300 font-bold transition px-2 py-0.5 hover:bg-red-500/10 rounded-md"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg active:scale-95 transition-all duration-150"
                >
                  Provision Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <h3 className="text-lg font-bold text-slate-100">Modify Division Profile</h3>
            <p className="text-xs text-slate-400 mt-1">Update division profile, leader status, and overall activation.</p>

            <form onSubmit={handleUpdateTeam} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows="3"
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Lead</label>
                <select
                  value={editTeamLead}
                  onChange={(e) => setEditTeamLead(e.target.value)}
                  className="block w-full px-3 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Assign Team Lead (Optional) --</option>
                  {teamLeads.filter(lead => lead.status === 'Active' || lead.status === undefined).map(lead => (
                    <option key={lead._id} value={lead._id}>{lead.username} ({lead.name || 'No Name'})</option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team Members (Support Users)</label>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !editSelectedMembers.includes(val)) {
                      setEditSelectedMembers([...editSelectedMembers, val]);
                    }
                  }}
                  className="block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-350 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Add Support User --</option>
                  {supportUsers
                    .filter(user => !editSelectedMembers.includes(user._id) && (!user.team || user.team === editingTeam?._id))
                    .map(user => (
                      <option key={user._id} value={user._id}>
                        {user.username} {user.name ? `(${user.name})` : ''}
                      </option>
                    ))
                  }
                </select>

                {editSelectedMembers.length > 0 && (
                  <div className="mt-3 bg-slate-950 border border-slate-850 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                    {editSelectedMembers.map(memberId => {
                      const memberObj = supportUsers.find(u => u._id === memberId);
                      if (!memberObj) return null;
                      return (
                        <div key={memberId} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                          <span className="font-semibold text-slate-200">
                            {memberObj.username} {memberObj.name ? `(${memberObj.name})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditSelectedMembers(editSelectedMembers.filter(id => id !== memberId))}
                            className="text-red-400 hover:text-red-300 font-bold transition px-2 py-0.5 hover:bg-red-500/10 rounded-md"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTeam(null);
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

export default TeamManagement;
