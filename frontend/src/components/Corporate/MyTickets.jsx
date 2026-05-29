import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
  Calendar,
  Users,
  Tag,
  Clock,
  CheckSquare,
  XCircle,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const colors = {
    Open: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Pending User Confirmation': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    Closed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap ${colors[status] || colors.Open}`}>
      {status}
    </span>
  );
};

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Reopen Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [selectedTicketForReopen, setSelectedTicketForReopen] = useState(null);
  const [reopenRemarks, setReopenRemarks] = useState('');
  const [reopenError, setReopenError] = useState('');

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, searchQuery, page]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page);
      params.append('limit', limit);

      const res = await axios.get(
        `http://localhost:5000/api/corporate/my-tickets/${userId}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data;
      setTickets(data.tickets || data || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || (data.tickets || data || []).length) / limit) || 1);
      setTotalCount(data.total || data.totalCount || (data.tickets || data || []).length);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResolution = async (ticketId) => {
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/corporate/tickets/${ticketId}/confirm-resolution`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        fetchTickets();
      }
    } catch (err) {
      console.error('Error confirming resolution:', err);
      setError('Failed to confirm resolution. Please try again.');
    }
  };

  const handleReopenIssue = async () => {
    if (!reopenRemarks.trim()) {
      setReopenError('Please provide remarks explaining why the issue is not resolved.');
      return;
    }
    try {
      setReopenError('');
      const response = await axios.patch(
        `http://localhost:5000/api/corporate/tickets/${selectedTicketForReopen._id}/reopen`,
        { userId, remarks: reopenRemarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setIsReopenModalOpen(false);
        setSelectedTicketForReopen(null);
        setReopenRemarks('');
        fetchTickets();
      }
    } catch (err) {
      console.error('Error reopening ticket:', err);
      setReopenError('Failed to reopen ticket. Please try again.');
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/corporate/tickets/${ticketId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        fetchTickets();
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
      setError('Failed to delete ticket. Please try again.');
    }
  };

  const categories = useMemo(() => {
    const cats = new Set();
    tickets.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [tickets]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const truncate = (str, max = 50) => {
    if (!str) return 'N/A';
    return str.length > max ? str.slice(0, max) + '...' : str;
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  // Loading skeleton
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {[...Array(10)].map((_, i) => (
        <td key={i} className="px-4 py-4 border-b border-slate-800">
          <div className={`h-4 bg-slate-800 rounded ${i === 2 ? 'w-32' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20">
              <FileText className="h-5 w-5 text-indigo-400" />
            </div>
            My Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-12">
            {totalCount} ticket{totalCount !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => fetchTickets()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 animate-slide-up">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 min-w-[220px] relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by ticket number or title..."
              className="w-full bg-slate-800 text-slate-300 text-sm rounded-lg pl-9 pr-4 py-2 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none placeholder-slate-500 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 mb-4 text-sm text-red-300 animate-slide-up">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '50ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Assigned Team</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Assigned To</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Created On</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Last Updated</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center animate-scale-up">
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-4">
                        <Inbox className="h-10 w-10 text-slate-600" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-300">No tickets found</h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-sm">
                        {searchQuery || statusFilter || categoryFilter
                          ? 'No tickets match your current filters. Try adjusting your search criteria.'
                          : "You haven't raised any tickets yet. Go to Raise Request to create your first ticket."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, index) => (
                  <React.Fragment key={ticket._id || index}>
                  <tr
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors duration-150"
                  >
                    <td className="px-4 py-4 text-sm font-mono font-semibold text-indigo-400 whitespace-nowrap">
                      {ticket.ticketNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200 font-medium max-w-[200px]">
                      <span className="truncate block" title={ticket.ticketTitle}>
                        {truncate(ticket.ticketTitle, 40)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400 max-w-[200px]">
                      <span className="truncate block" title={ticket.issueDescription}>
                        {truncate(ticket.issueDescription, 50)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-0.5">
                        <Tag className="h-3 w-3 text-slate-500" />
                        {ticket.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={ticket.status || 'Open'} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        {ticket.assignedTeam ? (ticket.assignedTeam.name || ticket.assignedTeam) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm whitespace-nowrap">
                      {ticket.assignedTo ? (
                        <span className="text-slate-300">{ticket.assignedTo.username || ticket.assignedTo}</span>
                      ) : (
                        <span className="text-slate-600 italic">NA</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {formatDate(ticket.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {formatDate(ticket.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteTicket(ticket._id)}
                        className="p-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/50 rounded-lg transition-colors duration-200"
                        title="Delete Ticket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Resolution Panel for Pending User Confirmation */}
                  {ticket.status === 'Pending User Confirmation' && (
                    <tr className="bg-slate-850/50 border-b border-slate-800/60">
                      <td colSpan="10" className="px-4 py-4">
                        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 ml-4">
                          <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            Support has provided a resolution
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Root Cause</p>
                              <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                {ticket.rootCause || 'Not provided'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Resolution Steps</p>
                              <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800 whitespace-pre-line">
                                {ticket.resolutionSteps || 'Not provided'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                            <p className="text-xs text-slate-400">
                              Please try the steps above and confirm if your issue is resolved.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setSelectedTicketForReopen(ticket);
                                  setIsReopenModalOpen(true);
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition"
                              >
                                Still Facing Issue
                              </button>
                              <button
                                onClick={() => handleConfirmResolution(ticket._id)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2"
                              >
                                <CheckSquare className="h-4 w-4" />
                                Issue Resolved
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && tickets.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3.5 border-t border-slate-800 bg-slate-800/30">
            <p className="text-sm text-slate-400">
              Showing <span className="font-medium text-slate-300">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium text-slate-300">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-medium text-slate-300">{totalCount}</span> tickets
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg border border-slate-700 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                        page === pageNum
                          ? 'bg-indigo-600 text-white border border-indigo-500'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg border border-slate-700 transition-all duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reopen Remark Modal */}
      {isReopenModalOpen && selectedTicketForReopen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                <h3 className="text-base font-bold text-slate-100">Still Facing Issue</h3>
              </div>
              <button
                onClick={() => {
                  setIsReopenModalOpen(false);
                  setSelectedTicketForReopen(null);
                  setReopenRemarks('');
                  setReopenError('');
                }}
                className="text-slate-500 hover:text-slate-300 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {reopenError && (
                <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{reopenError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Please describe what is still not working *
                </label>
                <textarea
                  rows="4"
                  placeholder="Provide details about the ongoing issue..."
                  value={reopenRemarks}
                  onChange={(e) => {
                    setReopenRemarks(e.target.value);
                    setReopenError('');
                  }}
                  className="w-full px-4 py-3 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsReopenModalOpen(false);
                    setSelectedTicketForReopen(null);
                    setReopenRemarks('');
                    setReopenError('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReopenIssue}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow transition"
                >
                  Submit Remarks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
