import React from 'react';
import { Calendar, Clock, User, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';

const TicketList = ({ tickets, onSelectTicket, loading }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Assigned':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'In Progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Closed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-red-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Low':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <ShieldAlert className="h-10 w-10 mx-auto text-slate-500 mb-3" />
        <p className="font-semibold text-slate-300">No tickets found</p>
        <p className="text-sm mt-1">There are currently no tickets matching this description.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {tickets.map((ticket) => (
        <div
          key={ticket._id}
          onClick={() => onSelectTicket(ticket)}
          className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/30 p-5 rounded-2xl shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">
                {ticket.ticketNumber}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusStyle(ticket.status)}`}>
                {ticket.status}
              </span>
              <span className={`text-xs flex items-center gap-1 font-semibold ${getPriorityStyle(ticket.priority)}`}>
                <Clock className="h-3.5 w-3.5" />
                {ticket.priority} Priority
              </span>
            </div>

            <h3 className="text-base font-semibold text-slate-200 group-hover:text-indigo-400 transition duration-150 line-clamp-1">
              {ticket.ticketTitle || ticket.issueDescription}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>Raised by: {ticket.raisedBy?.username || 'System'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              {ticket.assignedTo && (
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Agent: {ticket.assignedTo?.username || ticket.assignedTo}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="p-2 bg-slate-950/80 border border-slate-800/85 rounded-xl group-hover:bg-indigo-600/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 text-slate-400 transition-all duration-200">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketList;
