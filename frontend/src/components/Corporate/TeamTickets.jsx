import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck, 
  ArrowRight, 
  X 
} from 'lucide-react';
import AssignTicketModal from './AssignTicketModal';

const TeamTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Assignment Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const userId = localStorage.getItem('userId');

  const fetchTickets = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/team-lead/tickets?userId=${userId}`);
      setTickets(response.data.tickets || []);
      setTeamMembers(response.data.teamMembers || []);
      setTeam(response.data.team || null);
    } catch (err) {
      console.error('Error fetching team tickets:', err);
      setError('Failed to fetch tactical team ticket logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [userId]);

  const handleOpenAssignModal = (ticket) => {
    setSelectedTicket(ticket);
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignment = async (agentId) => {
    if (!selectedTicket) return;

    try {
      setError('');
      setSuccess('');
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/team-lead/tickets/${selectedTicket._id}/assign`,
        { assignedToId: agentId }
      );

      if (response.data.success) {
        setSuccess(`Incident successfully delegated to agent.`);
        setIsAssignModalOpen(false);
        setSelectedTicket(null);
        fetchTickets();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error assigning ticket:', err);
      setError(err.response?.data?.message || 'Failed to delegate incident.');
    }
  };

  // Filtered tickets
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
                            statusFilter === 'Unassigned' ? (!ticket.assignedTo) : 
                            ticket.status === statusFilter;

      const matchesPriority = !priorityFilter ? true : ticket.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
  };

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans animate-fade-in text-slate-100 bg-slate-950 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-2">
            <FileText className="h-7 w-7 text-indigo-400" />
            <span>Division Incidents Dispatch</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Overviewing division <span className="text-indigo-400 font-bold">{team ? team.name : 'Tactical Division'}</span>. Route cases to qualified support agents.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition duration-150"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold">Sync Feed</span>
        </button>
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

      {/* Filter Controls Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-350 uppercase tracking-wider">
            <Filter className="h-4.5 w-4.5 text-indigo-400" />
            Registry Filtering Panel
          </div>
          {(searchQuery || statusFilter || priorityFilter) && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, desc, or TICK#..."
              className="w-full bg-slate-950 text-slate-350 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* Status Select */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 text-slate-350 border border-slate-850 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Unassigned">Unassigned Backlog</option>
              <option value="Assigned">Assigned (General)</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Select */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-950 text-slate-350 border border-slate-850 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Incident table list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Incident Feed Ledger ({filteredTickets.length} cases)</h3>
          <p className="text-xs text-slate-400 mt-1">Review critical issues and balance workload by routing cases.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-950 rounded-xl border border-slate-850 animate-pulse" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-20 text-center text-slate-550 text-xs italic">
            No logged incidents matching the active filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-left">
              <thead>
                <tr className="text-slate-400 font-semibold pb-3 text-left">
                  <th className="pb-3 font-semibold">Case ID</th>
                  <th className="pb-3 font-semibold">Title & Summary</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-center">Priority</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold">Assigned Agent</th>
                  <th className="pb-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="py-4 font-mono font-bold text-slate-400 text-xs">{ticket.ticketNumber}</td>
                    <td className="py-4 pr-4">
                      <div className="font-bold text-white max-w-[200px] truncate">{ticket.ticketTitle}</div>
                      <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-[280px]" title={ticket.issueDescription}>
                        {ticket.issueDescription}
                      </div>
                    </td>
                    <td className="py-4 text-slate-400">{ticket.category}</td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        ticket.priority === 'High' 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                          : ticket.priority === 'Medium' 
                          ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                          : 'bg-green-500/10 border-green-500/20 text-green-400'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        ticket.status === 'Closed' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : ticket.status === 'In Progress' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 text-indigo-400 font-semibold">
                      {ticket.assignedTo?.username || <span className="text-red-400 italic">Unassigned Backlog</span>}
                    </td>
                    <td className="py-4 text-center">
                      {ticket.status === 'Closed' ? (
                        <span className="text-xs text-slate-500 italic">Closed Ledger</span>
                      ) : ticket.assignedTo ? (
                        <button
                          onClick={() => handleOpenAssignModal(ticket)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-350 hover:text-white text-xs font-semibold transition"
                        >
                          Reassign
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAssignModal(ticket)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
                        >
                          Assign
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      <AssignTicketModal
        isOpen={isAssignModalOpen}
        ticket={selectedTicket}
        teamMembers={teamMembers}
        onConfirm={handleConfirmAssignment}
        onCancel={() => {
          setIsAssignModalOpen(false);
          setSelectedTicket(null);
        }}
      />
    </div>
  );
};

export default TeamTickets;
