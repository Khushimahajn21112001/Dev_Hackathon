import React from 'react';
import { Calendar, Clock, User, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';

const TicketList = ({ tickets, onSelectTicket, loading }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-blue-500/5';
      case 'Assigned':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-purple-500/5';
      case 'In Progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-amber-500/5';
      case 'Closed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-emerald-500/5';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/25';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-red-400 bg-red-500/8 border-red-500/20';
      case 'Medium':
        return 'text-yellow-400 bg-yellow-500/8 border-yellow-500/20';
      case 'Low':
        return 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20';
      default:
        return 'text-slate-400 bg-slate-500/8 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="relative">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-800 border-t-indigo-500" />
          <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-md" />
        </div>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-800/80 border border-slate-700 mb-4">
          <ShieldAlert className="h-7 w-7 text-slate-500" />
        </div>
        <p className="font-bold text-slate-300 text-base">No tickets found</p>
        <p className="text-sm text-slate-500 mt-1">There are currently no tickets matching this criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket, index) => (
        <div
          key={ticket._id}
          onClick={() => onSelectTicket(ticket)}
          className="card-hover group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/70 hover:border-indigo-500/25 p-5 rounded-2xl cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.02] to-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="space-y-2.5 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-950/80 border border-slate-700/80 rounded-lg text-indigo-300 shadow-sm">
                {ticket.ticketNumber}
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold shadow-sm ${getStatusStyle(ticket.status)}`}>
                {ticket.status}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${getPriorityStyle(ticket.priority)}`}>
                <Clock className="h-2.5 w-2.5" />
                {ticket.priority}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors duration-200 line-clamp-1">
              {ticket.ticketTitle || ticket.issueDescription}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span>{ticket.raisedBy?.username || 'System'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              {ticket.assignedTo && (
                <div className="flex items-center gap-1.5 text-indigo-400/80">
                  <UserCheck className="h-3 w-3" />
                  <span>{ticket.assignedTo?.username || ticket.assignedTo}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end relative z-10">
            <div className="p-2 bg-slate-800/60 border border-slate-700/60 rounded-xl group-hover:bg-indigo-600/15 group-hover:text-indigo-400 group-hover:border-indigo-500/30 text-slate-500 transition-all duration-200 group-hover:shadow-sm">
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketList;
