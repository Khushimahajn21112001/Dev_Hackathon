import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, User, UserCheck, ShieldClose, Award, CheckCircle, FileSpreadsheet, History, FileText, CheckSquare, AlertTriangle, X } from 'lucide-react';
import ChatBox from './ChatBox';

const TicketDetail = ({ ticket, onBack, onUpdate, userRole }) => {
  const [learningModal, setLearningModal] = useState(false);
  const [rootCause, setRootCause] = useState('');
  const [stepsInput, setStepsInput] = useState('');
  const [reusable, setReusable] = useState('Yes');
  const [closing, setClosing] = useState(false);

  const [logs, setLogs] = useState([]);
  const [forceCloseModal, setForceCloseModal] = useState(false);
  const [forceCloseReason, setForceCloseReason] = useState('');
  const [forceClosing, setForceClosing] = useState(false);

  const [teams, setTeams] = useState([]);
  const [supportUsers, setSupportUsers] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(ticket?.assignedTeam?._id || '');

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    // Sync selectedTeamId if ticket prop changes
    setSelectedTeamId(ticket?.assignedTeam?._id || '');
  }, [ticket?._id]);

  useEffect(() => {
    if (userRole === 'Admin') {
      const fetchData = async () => {
        try {
          const [teamsRes, usersRes] = await Promise.all([
            axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/tickets/teams'),
            axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/admin/users'),
          ]);
          setTeams(teamsRes.data.teams || []);
          // Keep only Support Users — they carry a populated team field
          const allUsers = usersRes.data.users || [];
          setSupportUsers(allUsers.filter(u => u.role === 'Support User'));
        } catch (err) {
          console.error('Error fetching assignment options:', err);
        }
      };
      fetchData();
    }
  }, [userRole]);

  useEffect(() => {
    if (ticket?._id) {
      axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tickets/${ticket._id}/logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => setLogs(res.data.logs || []))
      .catch(err => console.error("Error fetching logs", err));
    }
  }, [ticket?._id]);

  const handlePickTicket = async () => {
    try {
      const response = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tickets/pick/${ticket._id}`, {
        supportUserId: userId,
      });
      onUpdate(response.data.ticket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTeam = async (teamId) => {
    setSelectedTeamId(teamId);
    try {
      const res = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tickets/assign/${ticket._id}`, {
        assignedTeamId: teamId
      });
      onUpdate(res.data.ticket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      const res = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tickets/assign/${ticket._id}`, {
        assignedToId: agentId
      });
      onUpdate(res.data.ticket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    setClosing(true);

    try {
      const response = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/support/tickets/${ticket._id}/provide-resolution`, {
        rootCause,
        resolutionSteps: stepsInput.trim(),
        reusableFix: reusable === 'Yes',
        supportUserId: userId,
      });
      setLearningModal(false);
      onUpdate(response.data.ticket);
    } catch (err) {
      console.error(err);
    } finally {
      setClosing(false);
    }
  };

  const handleForceClose = async (e) => {
    e.preventDefault();
    setForceClosing(true);
    try {
      const response = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/tickets/${ticket._id}/force-close`, {
        forceCloseReason,
        adminUserId: userId
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setForceCloseModal(false);
      onUpdate(response.data.ticket);
      
      // Refresh logs
      axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/tickets/${ticket._id}/logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setLogs(res.data.logs || []));
    } catch (err) {
      console.error(err);
    } finally {
      setForceClosing(false);
    }
  };

  // Determine chat recipient
  let recipientId = null;
  if (userRole === 'Corporate User' && ticket.assignedTo) {
    recipientId = ticket.assignedTo._id || ticket.assignedTo;
  } else if (userRole === 'Support User' && ticket.raisedBy) {
    recipientId = ticket.raisedBy._id || ticket.raisedBy;
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl self-start transition duration-150"
        >
          ← Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Case Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-bold px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400">
                {ticket.ticketNumber}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                ticket.status === 'Closed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                ticket.status === 'Pending User Confirmation' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                ticket.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
              }`}>
                {ticket.status}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-100 mt-4 leading-relaxed">
              {ticket.ticketTitle || ticket.issueDescription}
            </h2>
            {ticket.ticketTitle && (
              <p className="text-sm text-slate-400 mt-2 italic leading-relaxed">
                Description: {ticket.issueDescription}
              </p>
            )}

            <div className="mt-6 border-t border-slate-800 pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Raised By</p>
                  <p className="text-slate-200 font-medium">{ticket.raisedBy?.username || 'Corporate User'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Created On</p>
                  <p className="text-slate-200 font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <UserCheck className="h-4.5 w-4.5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Assigned Agent</p>
                  <p className="text-slate-200 font-medium">
                    {ticket.assignedTo?.username || 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons (moved from top) */}
            <div className="flex gap-2.5 mt-6 pt-6 border-t border-slate-800">
              {userRole === 'Support User' && ticket.status === 'Open' && (
                <button
                  onClick={handlePickTicket}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-150"
                >
                  Pick Up Ticket
                </button>
              )}

              {(userRole === 'Support User' || userRole === 'Admin') && (ticket.status === 'Open' || ticket.status === 'Assigned' || ticket.status === 'In Progress') && (
                <button
                  onClick={() => setLearningModal(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all duration-150 flex items-center gap-2"
                >
                  <CheckSquare className="h-4.5 w-4.5" />
                  Provide Resolution
                </button>
              )}

              {userRole === 'Admin' && ticket.status !== 'Closed' && (
                <button
                  onClick={() => setForceCloseModal(true)}
                  className="px-4 py-2.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-400 text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all duration-150 flex items-center gap-2"
                >
                  <ShieldClose className="h-4 w-4" />
                  Force Close
                </button>
              )}
            </div>
          </div>

          {/* Resolution Details Panel */}
          {(ticket.rootCause || (ticket.resolutionSteps && ticket.resolutionSteps.length > 0) || ticket.forceClosed) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                Resolution Details
              </h3>
              
              {ticket.forceClosed ? (
                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4">
                  <p className="text-xs text-red-400 font-semibold mb-1 uppercase tracking-wider">Force Closed by Admin</p>
                  <p className="text-sm text-slate-300">{ticket.forceCloseReason}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Root Cause</p>
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-sm text-slate-300">
                      {ticket.rootCause || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Resolution Steps</p>
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 whitespace-pre-line">
                      {ticket.resolutionSteps 
                        ? (Array.isArray(ticket.resolutionSteps) ? ticket.resolutionSteps.join('\n') : ticket.resolutionSteps)
                        : 'Not specified'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Chat Panel */}
          {userRole !== 'Admin' && (ticket.status === 'Assigned' || ticket.status === 'In Progress' || ticket.status === 'Closed') && (
            <ChatBox ticketId={ticket._id} recipientId={recipientId} />
          )}
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            
            {userRole !== 'Admin' && (
              <>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">System Metadata</h3>

                <div className="space-y-3 text-xs text-slate-400">
                  <div className="flex justify-between py-2 border-b border-slate-800/80">
                    <span className="font-medium text-slate-500">Route Category</span>
                    <span className="font-semibold text-slate-300">{ticket.category || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/80">
                    <span className="font-medium text-slate-500">Assigned Team</span>
                    <span className="font-semibold text-slate-300">{ticket.assignedTeam?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-slate-500">Priority Tier</span>
                    <span className="font-semibold text-yellow-400">{ticket.priority || 'Medium'}</span>
                  </div>
                </div>
              </>
            )}

            {userRole === 'Admin' ? (
              <div className={`space-y-4 ${userRole !== 'Admin' ? 'pt-3 border-t border-slate-850' : ''}`}>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Assign Operations</h4>
                
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Assign to Team</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => handleAssignTeam(e.target.value)}
                    className="w-full bg-slate-950 text-slate-350 rounded-xl px-3 py-2 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teams.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Assign to Remote User</label>
                  <select
                    value={ticket.assignedTo?._id || ''}
                    onChange={(e) => handleAssignAgent(e.target.value)}
                    disabled={!selectedTeamId}
                    className="w-full bg-slate-950 text-slate-355 rounded-xl px-3 py-2 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!selectedTeamId ? '— Select a team first —' : '— Unassigned —'}
                    </option>
                    {supportUsers
                      .filter(u => selectedTeamId && u.team && (u.team._id === selectedTeamId || u.team === selectedTeamId))
                      .map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name || u.username} ({u.username})
                        </option>
                      ))
                    }
                  </select>
                  {selectedTeamId && supportUsers.filter(u => u.team && (u.team._id === selectedTeamId || u.team === selectedTeamId)).length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">No remote users found in this team.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Close & Learn Modal */}
      {learningModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3">
              <div className="bg-emerald-600/15 p-2 rounded-xl border border-emerald-500/20">
                <Award className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Enter Resolutions</h3>
                <p className="text-xs text-slate-400">Enter ticket resolution details</p>
              </div>
            </div>

            <form onSubmit={handleSaveResolution} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Root Cause</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken cookies on authentication redirect"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolution Steps (one per line)</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Step 1: Open browser developer settings&#10;Step 2: Clear cookies for all Jira.com domain&#10;Step 3: Reload browser"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Can this fix be reused? (AI learn)</label>
                <div className="flex gap-4 mt-2">
                  {['Yes', 'No'].map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="reusable"
                        value={option}
                        checked={reusable === option}
                        onChange={(e) => setReusable(e.target.value)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-800 bg-slate-950"
                      />
                      {option === 'Yes' ? 'Yes (Sync to KB)' : 'No (Local Fix Only)'}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setLearningModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all duration-150"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Close Modal */}
      {forceCloseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-600/15 p-2 rounded-xl border border-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Force Close Ticket</h3>
                <p className="text-xs text-slate-400">Administratively close this ticket</p>
              </div>
            </div>

            <form onSubmit={handleForceClose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reason for Force Close</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this ticket is being force closed..."
                  value={forceCloseReason}
                  onChange={(e) => setForceCloseReason(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setForceCloseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forceClosing}
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-500/25 active:scale-95 transition-all duration-150"
                >
                  Confirm Force Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
