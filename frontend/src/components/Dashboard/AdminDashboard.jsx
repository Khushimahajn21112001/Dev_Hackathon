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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });

  const [teamChartData, setTeamChartData] = useState([]);
  const [priorityChartData, setPriorityChartData] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

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

      const total = allTickets.length;
      const open = allTickets.filter(t => t.status === 'Open' || t.status === 'Assigned').length;
      const inProgress = allTickets.filter(t => t.status === 'In Progress').length;
      const closed = allTickets.filter(t => t.status === 'Closed').length;

      setStats({ total, open, inProgress, closed });

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

  const navigateToTicketsWithFilters = (filters) => {
    if (filters.status !== undefined) setStatusFilter(filters.status);
    if (filters.priority !== undefined) setPriorityFilter(filters.priority);
    if (filters.team !== undefined) setTeamFilter(filters.team);
    setActiveTab('tickets');
    setSelectedTicket(null);
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

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const title = ticket.ticketTitle || '';
      const desc = ticket.issueDescription || '';
      const num = ticket.ticketNumber || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = title.toLowerCase().includes(query) ||
                            desc.toLowerCase().includes(query) ||
                            num.toLowerCase().includes(query);

      const matchesStatus = !statusFilter ? true :
                            statusFilter === 'Open' ? (ticket.status === 'Open' || ticket.status === 'Assigned') :
                            ticket.status === statusFilter;

      const matchesPriority = !priorityFilter ? true : ticket.priority === priorityFilter;

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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
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
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <LayoutDashboard className="h-6 w-6 text-indigo-400" />
                    </div>
                    Admin Command Desk
                  </h1>
                  <p className="text-sm text-slate-400 mt-2 ml-[52px]">
                    Real-time operations dashboard with ticket routing and re-assignment controls.
                  </p>
                </div>

                <button
                  onClick={() => fetchDashboardData()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-200 btn-press"
                  title="Reload Dashboard"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-semibold">Refresh</span>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 bg-slate-900/60 border border-slate-800/60 rounded-xl max-w-sm backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'tickets'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Tickets
                </button>
              </div>

              {activeTab === 'dashboard' ? (
                <div className="space-y-8">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      { name: 'Total Tickets', value: stats.total, type: 'Total', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', borderHover: 'hover:border-indigo-500/40', shadow: 'hover:shadow-indigo-500/5' },
                      { name: 'Open', value: stats.open, type: 'Open', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', borderHover: 'hover:border-blue-500/40', shadow: 'hover:shadow-blue-500/5' },
                      { name: 'In Progress', value: stats.inProgress, type: 'In Progress', icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10', borderHover: 'hover:border-amber-500/40', shadow: 'hover:shadow-amber-500/5' },
                      { name: 'Closed', value: stats.closed, type: 'Closed', icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderHover: 'hover:border-emerald-500/40', shadow: 'hover:shadow-emerald-500/5' },
                    ].map((stat, idx) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleStatCardClick(stat.type)}
                          className={`bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 flex items-center gap-4 cursor-pointer relative overflow-hidden transition-all duration-300 card-hover ${stat.borderHover} hover:shadow-xl ${stat.shadow}`}
                        >
                          <div className={`p-3.5 rounded-xl ${stat.bg} transition-transform duration-300 group-hover:scale-110`}>
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

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team Workload */}
                    <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-lg">
                      <div className="mb-5">
                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Team-Wise Workload</h3>
                        <p className="text-xs text-slate-500 mt-1">Click any bar to filter tickets by team.</p>
                      </div>
                      <div className="h-72">
                        {teamChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}
                                cursor={{ fill: '#1e293b', opacity: 0.3 }}
                              />
                              <Bar
                                dataKey="value"
                                fill="url(#barGradient)"
                                radius={[8, 8, 0, 0]}
                                cursor="pointer"
                                onClick={(data) => handleTeamClick(data.name)}
                              />
                              <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#818cf8" />
                                  <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-500">No data available</div>
                        )}
                      </div>
                    </div>

                    {/* Priority Breakdown */}
                    <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-lg">
                      <div className="mb-5">
                        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Priority Breakdown</h3>
                        <p className="text-xs text-slate-500 mt-1">Click segments to filter by status and priority.</p>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priorityChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '12px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)' }}
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
                              radius={[6, 6, 0, 0]}
                              onClick={(data) => handlePriorityClick(data.name, 'Closed')}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TICKETS SECTION */
                <div className="space-y-6">
                  {/* Filter Panel */}
                  <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 shadow-lg space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wider">
                        <Filter className="h-4 w-4 text-indigo-400" />
                        Filter Controls
                      </div>
                      {(searchQuery || statusFilter || priorityFilter || teamFilter) && (
                        <button
                          onClick={handleClearFilters}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-200"
                        >
                          <X className="h-3.5 w-3.5" />
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="relative">
                        <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search tickets..."
                          className="w-full bg-slate-950/60 text-slate-300 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all duration-200 placeholder-slate-500"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-slate-950/60 text-slate-300 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none cursor-pointer transition-all duration-200"
                      >
                        <option value="">All Statuses</option>
                        <option value="Open">Open / Unassigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Closed">Closed</option>
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-full bg-slate-950/60 text-slate-300 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none cursor-pointer transition-all duration-200"
                      >
                        <option value="">All Priorities</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>

                      <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="w-full bg-slate-950/60 text-slate-300 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none cursor-pointer transition-all duration-200"
                      >
                        <option value="">All Teams</option>
                        <option value="Unassigned">Unassigned</option>
                        {teams.map(t => (
                          <option key={t._id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Active Filter Tags */}
                    {(statusFilter || priorityFilter || teamFilter || searchQuery) && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {statusFilter && (
                          <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Status: {statusFilter}
                            <X className="h-3 w-3 cursor-pointer hover:text-white transition-colors" onClick={() => setStatusFilter('')} />
                          </span>
                        )}
                        {priorityFilter && (
                          <span className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Priority: {priorityFilter}
                            <X className="h-3 w-3 cursor-pointer hover:text-white transition-colors" onClick={() => setPriorityFilter('')} />
                          </span>
                        )}
                        {teamFilter && (
                          <span className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Team: {teamFilter}
                            <X className="h-3 w-3 cursor-pointer hover:text-white transition-colors" onClick={() => setTeamFilter('')} />
                          </span>
                        )}
                        {searchQuery && (
                          <span className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Search: "{searchQuery}"
                            <X className="h-3 w-3 cursor-pointer hover:text-white transition-colors" onClick={() => setSearchQuery('')} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ticket List */}
                  <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-bold text-slate-200">
                        Incident Registry <span className="text-slate-500 font-normal">({filteredTickets.length} items)</span>
                      </h2>
                      <span className="text-xs text-slate-500 hidden sm:block">Click a ticket for details</span>
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
    </div>
  );
};

export default AdminDashboard;
