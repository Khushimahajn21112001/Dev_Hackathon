import React, { useState, useEffect } from 'react';
import { UserCheck, X, AlertCircle } from 'lucide-react';

const AssignTicketModal = ({ isOpen, ticket, teamMembers, onConfirm, onCancel }) => {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (ticket) {
      setSelectedAgentId(ticket.assignedTo?._id || '');
      setError('');
    }
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAgentId) {
      setError('Please select an agent to delegate this case to.');
      return;
    }
    onConfirm(selectedAgentId);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up border border-slate-700/50">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-slate-800/80">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
                <UserCheck className="h-4 w-4 text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Delegate Technical Incident</h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Ticket context */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-400/80">{ticket.ticketNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                ticket.priority === 'High'
                  ? 'bg-red-500/10 border-red-500/25 text-red-400'
                  : ticket.priority === 'Medium'
                  ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
                  : 'bg-green-500/10 border-green-500/25 text-green-400'
              }`}>
                {ticket.priority} priority
              </span>
            </div>
            <h4 className="text-xs font-bold text-white leading-relaxed line-clamp-1">{ticket.ticketTitle}</h4>
            <p className="text-[10px] text-slate-500 line-clamp-2">{ticket.issueDescription}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 text-red-300 text-xs rounded-xl flex items-center gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Agent selection */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Technical Agent
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => { setSelectedAgentId(e.target.value); setError(''); }}
              className="block w-full px-3 py-2.5 mt-2 border border-slate-700/70 rounded-xl bg-slate-950/60 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 cursor-pointer transition-all duration-200 input-glow"
            >
              <option value="">-- Choose Agent to Assign --</option>
              {teamMembers.map(member => (
                <option key={member._id} value={member._id}>
                  {member.username} ({member.name || member.username})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all duration-150 border border-slate-700/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 btn-gradient text-white text-xs font-bold rounded-xl active:scale-95 transition-all duration-150"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignTicketModal;
