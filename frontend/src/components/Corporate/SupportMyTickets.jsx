import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  CheckSquare, 
  X, 
  Calendar 
} from 'lucide-react';
import ProvideResolutionModal from './ProvideResolutionModal';

const SupportMyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);

  const userId = localStorage.getItem('userId');

  const fetchTickets = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`http://localhost:5000/api/support/tickets?userId=${userId}`);
      setTickets(response.data.tickets || []);
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError('Failed to retrieve assigned ticket registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [userId]);

  const handleMarkInProgress = async (ticketId) => {
    try {
      setError('');
      setSuccess('');
      const response = await axios.patch(
        `http://localhost:5000/api/support/tickets/${ticketId}/start`,
        { supportUserId: userId }
      );

      if (response.data.success) {
        setSuccess('Case is now marked In Progress. Resolve ASAP!');
        const updatedTicket = response.data.ticket;
        fetchTickets();
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket(updatedTicket);
        }
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error marking in progress:', err);
      setError('Failed to update case status.');
    }
  };

  const handleOpenResolutionModal = (ticket) => {
    setSelectedTicket(ticket);
    setIsResolutionModalOpen(true);
  };

  const handleProvideResolution = async ({ rootCause, resolutionSteps, internalNote, reusableFix }) => {
    if (!selectedTicket) return;

    try {
      setError('');
      setSuccess('');
      const response = await axios.patch(
        `http://localhost:5000/api/support/tickets/${selectedTicket._id}/provide-resolution`,
        { rootCause, resolutionSteps, internalNote, reusableFix, supportUserId: userId }
      );

      if (response.data.success) {
        setSuccess(`Resolution provided. Awaiting corporate user confirmation.`);
        setIsResolutionModalOpen(false);
        setSelectedTicket(null);
        fetchTickets();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error providing resolution:', err);
      setError('Failed to provide resolution.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
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

      const matchesStatus = !statusFilter ? true : ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const assigned = tickets.filter(t => t.status === 'Assigned' || t.status === 'Open').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const closed = tickets.filter(t => t.status === 'Closed').length;

    return { total, assigned, inProgress, closed };
  }, [tickets]);

  return (
    <div className="p-6 md:p-8 space-y-8 font-sans animate-fade-in text-slate-100 bg-slate-950 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <FileText className="h-6 w-6 text-indigo-400" />
            </div>
            <span>Agent Resolution Desk</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 ml-[52px]">
            Manage your personal workload, progress incidents, and sync closed tickets to the knowledge base.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-200 btn-press"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold">Sync Registry</span>
        </button>
      </div>

      {/* Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        {[
          { name: 'Total Cases Assigned', value: stats.total, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { name: 'Assigned (New)', value: stats.assigned, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { name: 'In Progress', value: stats.inProgress, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { name: 'Resolved / Closed', value: stats.closed, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 shadow-md flex items-center gap-4 card-hover">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <FileText className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900 text-red-205 text-sm rounded-xl flex items-center gap-2 animate-shake">
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

      {/* Filter panel */}
      <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-5 shadow-lg space-y-4 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-indigo-400" />
            Registry Filtering Panel
          </div>
          {(searchQuery || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
              }}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors duration-200"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case #, title or description..."
              className="w-full bg-slate-950/60 text-slate-300 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all duration-200 placeholder-slate-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/60 text-slate-300 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none cursor-pointer transition-all duration-200"
            >
              <option value="">All Case Statuses</option>
              <option value="Assigned">Assigned / Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-lg space-y-4 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-bold text-white">Active Case Queue Registry ({filteredTickets.length} cases)</h3>
          <p className="text-xs text-slate-400 mt-1">Review parameters and initiate progress or submit resolution learning.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-950 rounded-xl border border-slate-850 animate-pulse" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs italic">
            You do not have any logged incidents registered under this queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-left">
              <thead>
                <tr className="text-slate-400 font-semibold pb-3 text-left">
                  <th className="pb-3 font-semibold">Incident #</th>
                  <th className="pb-3 font-semibold">Incident Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold text-center">Priority</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold">Assigned By</th>
                  <th className="pb-3 font-semibold">Created On</th>
                  <th className="pb-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-850/20 transition-colors">
                    <td className="py-4 font-mono font-bold text-slate-450 text-xs">{ticket.ticketNumber}</td>
                    <td className="py-4 pr-4 font-bold text-white max-w-[220px] truncate" title={ticket.ticketTitle}>{ticket.ticketTitle}</td>
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
                          : ticket.status === 'Pending User Confirmation'
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                          : ticket.status === 'In Progress' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 text-indigo-400 font-semibold">
                      {ticket.assignedTeam?.name || <span className="text-slate-550 italic">Direct Routing</span>}
                    </td>
                    <td className="py-4 text-slate-455 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {formatDate(ticket.createdAt)}
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenResolutionModal(ticket)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow active:scale-95"
                          title="Show Details & Actions"
                        >
                          Show More
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
 
      {/* Provide Resolution Modal */}
      <ProvideResolutionModal
        isOpen={isResolutionModalOpen}
        ticket={selectedTicket}
        onConfirm={handleProvideResolution}
        onStartWork={handleMarkInProgress}
        onCancel={() => {
          setIsResolutionModalOpen(false);
          setSelectedTicket(null);
        }}
      />
    </div>
  );
};

export default SupportMyTickets;
