import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  LayoutDashboard, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  Users, 
  Activity, 
  TrendingUp, 
  UserCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TeamLeadDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = localStorage.getItem('userId');

  const fetchDashboardData = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`http://localhost:5000/api/team-lead/tickets?userId=${userId}`);
      setTickets(response.data.tickets || []);
      setTeamMembers(response.data.teamMembers || []);
      setTeam(response.data.team || null);
    } catch (err) {
      console.error('Error fetching lead dashboard:', err);
      setError('Failed to retrieve team ticket logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  // Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const unassigned = tickets.filter(t => t.status === 'Open' || (t.status === 'Assigned' && !t.assignedTo)).length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const closed = tickets.filter(t => t.status === 'Closed').length;

    return { total, unassigned, inProgress, closed };
  }, [tickets]);

  // Chart telemetry (priority-wise load)
  const priorityChartData = useMemo(() => {
    const priorityMap = {
      Low: 0,
      Medium: 0,
      High: 0
    };
    tickets.forEach(t => {
      const p = t.priority || 'Medium';
      if (priorityMap[p] !== undefined) {
        priorityMap[p]++;
      }
    });
    return Object.keys(priorityMap).map(key => ({
      name: key,
      Tickets: priorityMap[key]
    }));
  }, [tickets]);

  // Latest tickets
  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [tickets]);

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans animate-fade-in text-slate-100 bg-slate-950 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <LayoutDashboard className="h-6 w-6 text-indigo-400" />
            </div>
            <span>Lead Telemetry Desk</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 ml-[52px]">
            Overviewing division <span className="text-indigo-400 font-bold">{team ? team.name : 'Tactical Division'}</span>. Live workload feeds, agent rosters, and action lists.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-200 btn-press"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold">Sync Workload</span>
        </button>
      </div>

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { name: 'Total Division Cases', value: stats.total, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', borderHover: 'hover:border-indigo-500/40' },
          { name: 'Unassigned Backlog', value: stats.unassigned, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', borderHover: 'hover:border-blue-500/40' },
          { name: 'In Progress Cases', value: stats.inProgress, icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', borderHover: 'hover:border-amber-500/40' },
          { name: 'Resolved Cases', value: stats.closed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderHover: 'hover:border-emerald-500/40' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate('/team-lead/tickets')}
              className={`bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 flex items-center gap-4 cursor-pointer relative overflow-hidden transition-all duration-300 card-hover ${stat.borderHover}`}
            >
              <div className={`p-3.5 rounded-xl ${stat.bg}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">{stat.value}</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5">
                <Icon className={`h-20 w-20 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telemetry Graph */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              Workload Concentration by Priority
            </h3>
            <p className="text-xs text-slate-500 mt-1">Critical breakdowns showing case severity distribution.</p>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}
                  cursor={{ fill: '#1e293b', opacity: 0.2 }}
                />
                <Bar dataKey="Tickets" fill="url(#leadBarGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="leadBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Division Agent Roster */}
        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-lg space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Division Roster ({teamMembers.length})
            </h3>
            <p className="text-xs text-slate-500 mt-1">Active support agents assigned to this team.</p>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                No active support agents enrolled in this division yet.
              </div>
            ) : (
              teamMembers.map(member => {
                // count tickets assigned to this member
                const count = tickets.filter(t => t.assignedTo?._id === member._id).length;
                return (
                  <div key={member._id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8.5 w-8.5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-slate-700 shrink-0">
                        {member.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{member.username}</p>
                        <p className="text-[10px] text-slate-500 truncate">{member.email || 'No email registered'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                      <UserCheck className="h-3 w-3 text-emerald-450" />
                      <span className="text-[10px] font-bold text-slate-300">{count} Active</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Latest Incidents */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-indigo-400" />
              Recent Incidents Feed
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Chronological summary of recently directed division requests.</p>
          </div>
          <button
            onClick={() => navigate('/team-lead/tickets')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Manage All Incidents →
          </button>
        </div>

        {recentTickets.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs italic">
            No tickets currently logged in your team's division queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {recentTickets.map((ticket, index) => (
              <div key={ticket._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{ticket.ticketNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      ticket.priority === 'High' 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : ticket.priority === 'Medium' 
                        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      ticket.status === 'Closed' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : ticket.status === 'In Progress' 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{ticket.ticketTitle}</h4>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-[10px] text-slate-500">Assigned To</p>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">
                    {ticket.assignedTo?.username || <span className="text-red-400 italic">Unassigned Backlog</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLeadDashboard;
