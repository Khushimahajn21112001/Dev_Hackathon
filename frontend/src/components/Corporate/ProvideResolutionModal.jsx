import React, { useState, useEffect } from 'react';
import { BookOpen, X, AlertCircle, Play, CheckSquare, Calendar } from 'lucide-react';

const ProvideResolutionModal = ({ isOpen, ticket, onConfirm, onStartWork, onCancel }) => {
  const [rootCause, setRootCause] = useState('');
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [reusableFix, setReusableFix] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRootCause(ticket?.rootCause || '');
      setResolutionSteps(ticket?.resolutionSteps || '');
      setInternalNote(ticket?.internalNote || '');
      setReusableFix(ticket?.reusableFix !== undefined ? ticket.reusableFix : true);
      setError('');
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rootCause.trim()) {
      setError('Please document the root cause.');
      return;
    }
    if (!resolutionSteps.trim()) {
      setError('Please list the troubleshooting resolution steps taken.');
      return;
    }
    onConfirm({ rootCause, resolutionSteps, internalNote, reusableFix });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40 shrink-0 gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="h-5.5 w-5.5 text-indigo-400 shrink-0" />
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-white whitespace-nowrap truncate">Incident Details & Resolution</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition duration-150 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Ticket Information Section */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-850/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                  {ticket.ticketNumber}
                </span>
                <h4 className="text-lg font-bold text-white mt-2 leading-snug">{ticket.ticketTitle}</h4>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  ticket.priority === 'High' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : ticket.priority === 'Medium' 
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                  {ticket.priority} Priority
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-b border-slate-800/60 py-4">
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Category</span>
                <span className="text-slate-200 font-medium">{ticket.category || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Raised By</span>
                <span className="text-slate-200 font-medium">
                  {ticket.raisedBy?.name || ticket.raisedBy?.username || 'Unknown'} ({ticket.raisedBy?.email || 'N/A'})
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Assigned Team</span>
                <span className="text-slate-200 font-medium">{ticket.assignedTeam?.name || 'Direct Routing'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Created On</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {formatDate(ticket.createdAt)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px] mb-2">Full Issue Description</span>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm text-slate-350 whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
                {ticket.issueDescription}
              </div>
            </div>
          </div>

          {/* Validation alerts */}
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action / Resolution Area */}
          <div className="border-t border-slate-800/80 pt-6">
            {(ticket.status === 'Open' || ticket.status === 'Assigned') && (
              <div className="text-center py-6 bg-slate-950 rounded-xl border border-slate-850 p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  You must start progress on this ticket before providing a resolution.
                </p>
                <button
                  type="button"
                  onClick={() => onStartWork(ticket._id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg transition active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  Start Work (Mark In Progress)
                </button>
              </div>
            )}

            {ticket.status === 'In Progress' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
                  <CheckSquare className="h-4.5 w-4.5 text-indigo-400" />
                  Resolution Documentation
                </h4>
                
                {/* Root cause */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Diagnosed Root Cause *
                  </label>
                  <textarea
                    required
                    rows="2"
                    placeholder="Detail the root technical driver behind this failure..."
                    value={rootCause}
                    onChange={(e) => {
                      setRootCause(e.target.value);
                      setError('');
                    }}
                    className="block w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Resolution Steps */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Resolution Steps Taken *
                  </label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Itemize the exact actions performed to resolve the incident..."
                    value={resolutionSteps}
                    onChange={(e) => {
                      setResolutionSteps(e.target.value);
                      setError('');
                    }}
                    className="block w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Internal Note */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Internal Note (Optional)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Any notes for other support agents..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* KB Sync — always enabled */}
                <div className="flex items-center gap-3 bg-indigo-950/30 p-4 rounded-xl border border-indigo-800/40">
                  <div className="shrink-0 h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                  <div className="text-xs">
                    <p className="font-bold text-indigo-300">
                      Auto-Publish to Resolution Knowledge Base
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      This resolution will be automatically saved to the enterprise KB, enabling the AI to auto-resolve similar issues in the future.
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all duration-150 flex items-center gap-1.5"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </form>
            )}

            {(ticket.status === 'Closed' || ticket.status === 'Pending User Confirmation') && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                  Provided Resolution Details
                </h4>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5">
                  <div>
                    <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Root Cause</span>
                    <p className="text-sm text-slate-200 mt-0.5">{ticket.rootCause}</p>
                  </div>
                  <div className="border-t border-slate-850 pt-3">
                    <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Resolution Steps</span>
                    <p className="text-sm text-slate-200 mt-0.5 whitespace-pre-wrap">{ticket.resolutionSteps}</p>
                  </div>
                  {ticket.internalNote && (
                    <div className="border-t border-slate-850 pt-3">
                      <span className="text-slate-500 block font-semibold uppercase tracking-wider text-[10px]">Internal Note</span>
                      <p className="text-sm text-slate-350 mt-0.5 italic">"{ticket.internalNote}"</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl transition duration-150"
                  >
                    Close View
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvideResolutionModal;
