import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';
import TicketList from '../TicketList';
import TicketDetail from '../TicketDetail';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  Clock,
  Award,
  Plus,
  Check,
  FileText,
  Filter,
  Search,
  RefreshCw,
  X
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'tickets'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });

  // Chart Data State
  const [teamChartData, setTeamChartData] = useState([]);
  const [priorityChartData, setPriorityChartData] = useState([]);

  // Ticket Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  // Team Modal State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [msg, setMsg] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, teamsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/tickets', { params: { role: 'Admin' } }),
        axios.get('http://localhost:5000/api/tickets/teams')
      ]);

      const allTickets = ticketsRes.data.tickets || [];
      setTickets(allTickets);
      setTeams(teamsRes.data.teams || []);

      // Calculate Stats
      const total = allTickets.length;
      const open = allTickets.filter(t => t.status === 'Open' || t.status === 'Assigned').length;
      const inProgress = allTickets.filter(t => t.status === 'In Progress').length;
      const closed = allTickets.filter(t => t.status === 'Closed').length;

      setStats({ total, open, inProgress, closed });

      // Group Tickets by Team for Bar Chart
      const teamCounts = {};
      teamsRes.data.teams.forEach(team => {
        teamCounts[team.name] = 0;
      });
      teamCounts['Unassigned'] = 0;

      allTickets.forEach(t => {
        const tName = t.assignedTeam?.name || 'Unassigned';
        teamCounts[tName] = (teamCounts[tName] || 0) + 1;
      });

      const teamData = Object.keys(teamCounts).map(key => ({
        name: key,
        value: teamCounts[key]
      }));
      setTeamChartData(teamData);

      // Stacked Bar Chart for Priority-wise tickets by Status
      const priorityMap = {
        Low: { name: 'Low', Open: 0, 'In Progress': 0, Closed: 0 },
        Medium: { name: 'Medium', Open: 0, 'In Progress': 0, Closed: 0 },
        High: { name: 'High', Open: 0, 'In Progress': 0, Closed: 0 }
      };

      allTickets.forEach(t => {
        const prio = t.priority || 'Medium';
        if (!priorityMap[prio]) return;

        if (t.status === 'Closed') {
          priorityMap[prio].Closed++;
        } else if (t.status === 'In Progress') {
          priorityMap[prio]['In Progress']++;
        } else {
          priorityMap[prio].Open++;
        }
      });

      setPriorityChartData(Object.values(priorityMap));

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (window.location.pathname.includes('tickets')) {
      setActiveTab('tickets');
    } else {
      setActiveTab('dashboard');
    }
  }, [window.location.pathname]);

  const [teamLeads, setTeamLeads] = useState([]);
  const [selectedTeamLead, setSelectedTeamLead] = useState('');

  // Fetch team leads when modal opens
  useEffect(() => {
    if (showTeamModal) {
      (async () => {
        try {
          const res = await axios.get('http://localhost:5000/api/team-leads');
          setTeamLeads(res.data.leads || []);
        } catch (e) {
          console.error('Failed to fetch team leads', e);
        }
      })();
    }
  }, [showTeamModal]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      // Create team via admin endpoint, include optional teamLead
      await axios.post('http://localhost:5000/api/admin/teams', {
        name: newTeamName,
        teamLead: selectedTeamLead || undefined,
      });

      setMsg('Support Team Division provisioned successfully!');
      setNewTeamName('');
      setSelectedTeamLead('');
      fetchDashboardData();
      setTimeout(() => {
        setMsg('');
        setShowTeamModal(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // --------------------------------------------------------------------------
  // Navigation & Filtering via Graph Clicks
  // --------------------------------------------------------------------------
  const navigateToTicketsWithFilters = (filters) => {
    if (filters.status !== undefined) setStatusFilter(filters.status);
    if (filters.priority !== undefined) setPriorityFilter(filters.priority);
    if (filters.team !== undefined) setTeamFilter(filters.team);
    setActiveTab('tickets');
    setSelectedTicket(null); // Return to list view
  };

  const handleStatCardClick = (statusType) => {
    if (statusType === 'Total') {
      navigateToTicketsWithFilters({ status: '', priority: '', team: '' });
    } else if (statusType === 'Open') {
      navigateToTicketsWithFilters({ status: 'Open', priority: '', team: '' });
    } else if (statusType === 'In Progress') {
      navigateToTicketsWithFilters({ status: 'In Progress', priority: '', team: '' });
    } else if (statusType === 'Closed') {
      navigateToTicketsWithFilters({ status: 'Closed', priority: '', team: '' });
    }
  };

  const handleTeamClick = (teamName) => {
    navigateToTicketsWithFilters({ team: teamName === 'Unassigned' ? 'Unassigned' : teamName });
  };

  const handlePriorityClick = (priority, status) => {
    navigateToTicketsWithFilters({ priority, status });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setTeamFilter('');
  };

  // Filter tickets dynamically for the Ticket List view
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Search Query
      const title = ticket.ticketTitle || '';
      const desc = ticket.issueDescription || '';
      const num = ticket.ticketNumber || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = title.toLowerCase().includes(query) ||
                            desc.toLowerCase().includes(query) ||
                            num.toLowerCase().includes(query);

      // Status
      const matchesStatus = !statusFilter ? true :
                            statusFilter === 'Open' ? (ticket.status === 'Open' || ticket.status === 'Assigned') :
                            ticket.status === statusFilter;

      // Priority
      const matchesPriority = !priorityFilter ? true : ticket.priority === priorityFilter;

      // Team
      let matchesTeam = true;
      if (teamFilter) {
        if (teamFilter === 'Unassigned') {
          matchesTeam = !ticket.assignedTeam;
        } else {
          matchesTeam = ticket.assignedTeam?.name === teamFilter;
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesTeam;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, teamFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              userRole="Admin"
              onBack={() => setSelectedTicket(null)}
              onUpdate={(updated) => {
                setSelectedTicket(updated);
                fetchDashboardData();
              }}
            />
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Premium Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Admin Command Desk</h1>
                  <p className="text-sm text-slate-400 mt-1.5">
                    Real-time visual operations dashboard, ticket routing controls, and re-assignment hub.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchDashboardData()}
                    className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition duration-150"
                    title="Reload Dashboard"
                  >
                    <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowTeamModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all duration-150"
                  >
                    <Plus className="h-4 w-4" />
                    Provision Division
                  </button>
                </div>
              </div>

              {/* Tab Navigation System */}
              <div className="flex gap-2 p-1 bg-slate-900/60 border border-slate-800 rounded-xl max-w-sm">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'tickets'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Tickets Section
                </button>
              </div>

              {activeTab === 'dashboard' ? (
                /* ================================================================== */
                /* DASHBOARD VIEW                                                     */
                /* ================================================================== */
                <div className="space-y-8">
                  {/* Interactive Analytics Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { name: 'Total Tickets Raised', value: stats.total, type: 'Total', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', hoverBorder: 'hover:border-indigo-500/30' },
                      { name: 'Open Tickets', value: stats.open, type: 'Open', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', hoverBorder: 'hover:border-blue-500/30' },
                      { name: 'In Progress Tickets', value: stats.inProgress, type: 'In Progress', icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', hoverBorder: 'hover:border-amber-500/30' },
                      { name: 'Closed Tickets', value: stats.closed, type: 'Closed', icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10', hoverBorder: 'hover:border-emerald-500/30' },
                    ].map((stat, idx) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleStatCardClick(stat.type)}
                          className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center gap-4 cursor-pointer relative overflow-hidden transition-all duration-200 active:scale-98 ${stat.hoverBorder}`}
                        >
                          <div className={`p-3.5 rounded-xl ${stat.bg}`}>
                            <Icon className={`h-6 w-6 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.name}</p>
                            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stat.value}</p>
                          </div>
                          <div className="absolute right-3 bottom-3 text-[10px] text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Click to filter →</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visualizations Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Team-wise Tickets Bar Chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Team-Wise Workload</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Click any team bar to view and assign their specific tickets.</p>
                      </div>
                      <div className="h-72">
                        {teamChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '12px' }}
                                cursor={{ fill: '#1e293b', opacity: 0.3 }}
                              />
                              <Bar
                                dataKey="value"
                                fill="#6366f1"
                                radius={[6, 6, 0, 0]}
                                cursor="pointer"
                                onClick={(data) => handleTeamClick(data.name)}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-500">No chart telemetry available</div>
                        )}
                      </div>
                    </div>

                    {/* Priority-wise Tickets by Status Stacked Bar Chart */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Priority Breakdown By Status</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Click a stacked bar segment to filter tickets by status and priority.</p>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priorityChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9', borderRadius: '12px' }}
                              cursor={{ fill: '#1e293b', opacity: 0.3 }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                            <Bar
                              dataKey="Open"
                              stackId="priority"
                              fill="#3b82f6"
                              cursor="pointer"
                              radius={[0, 0, 0, 0]}
                              onClick={(data) => handlePriorityClick(data.name, 'Open')}
                            />
                            <Bar
                              dataKey="In Progress"
                              stackId="priority"
                              fill="#f59e0b"
                              cursor="pointer"
                              radius={[0, 0, 0, 0]}
                              onClick={(data) => handlePriorityClick(data.name, 'In Progress')}
                            />
                            <Bar
                              dataKey="Closed"
                              stackId="priority"
                              fill="#10b981"
                              cursor="pointer"
                              radius={[4, 4, 0, 0]}
                              onClick={(data) => handlePriorityClick(data.name, 'Closed')}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ================================================================== */
                /* TICKETS SECTION                                                    */
                /* ================================================================== */
                <div className="space-y-6">
                  {/* Interactive Filtering Panel */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-350 uppercase tracking-wider">
                        <Filter className="h-4 w-4 text-indigo-400" />
                        Ticket List Filter Controls
                      </div>
                      {(searchQuery || statusFilter || priorityFilter || teamFilter) && (
                        <button
                          onClick={handleClearFilters}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          <X className="h-3.5 w-3.5" />
                          Clear All Filters
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search title, description or #..."
                          className="w-full bg-slate-950 text-slate-300 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition"
                        />
                      </div>

                      {/* Status Dropdown */}
                      <div>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full bg-slate-950 text-slate-300 border border-slate-850 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="">All Statuses</option>
                          <option value="Open">Open / Unassigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>

                      {/* Priority Dropdown */}
                      <div>
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="w-full bg-slate-950 text-slate-300 border border-slate-850 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="">All Priorities</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                      {/* Assigned Team Dropdown */}
                      <div>
                        <select
                          value={teamFilter}
                          onChange={(e) => setTeamFilter(e.target.value)}
                          className="w-full bg-slate-950 text-slate-300 border border-slate-850 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="">All Teams</option>
                          <option value="Unassigned">Unassigned (General Queue)</option>
                          {teams.map(t => (
                            <option key={t._id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    {(statusFilter || priorityFilter || teamFilter || searchQuery) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {statusFilter && (
                          <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Status: {statusFilter}
                            <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setStatusFilter('')} />
                          </span>
                        )}
                        {priorityFilter && (
                          <span className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Priority: {priorityFilter}
                            <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setPriorityFilter('')} />
                          </span>
                        )}
                        {teamFilter && (
                          <span className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Team: {teamFilter}
                            <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setTeamFilter('')} />
                          </span>
                        )}
                        {searchQuery && (
                          <span className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Query: "{searchQuery}"
                            <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setSearchQuery('')} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Incident Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-slate-200">Incident Registry ({filteredTickets.length} items)</h2>
                      <span className="text-xs text-slate-500">Select any ticket to view live chats or update assignments.</span>
                    </div>
                    <TicketList
                      tickets={filteredTickets}
                      loading={loading}
                      onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Provision Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <h3 className="text-lg font-bold text-slate-100">Provision Support Division</h3>
            <p className="text-xs text-slate-400 mt-1">Spin up a new technical resolution division across the enterprise</p>

            {msg && (
              <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-900 text-emerald-200 text-xs rounded-xl flex items-center justify-center">
                {msg}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Division Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Operations Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Assign Team Lead (Optional)</label>
                <select
                  value={selectedTeamLead}
                  onChange={(e) => setSelectedTeamLead(e.target.value)}
                  className="block w-full px-3.5 py-2.5 mt-1 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a Lead...</option>
                  {teamLeads.map(lead => (
                    <option key={lead._id} value={lead._id}>{lead.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg active:scale-95 transition-all duration-150"
                >
                  Provision Division
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
