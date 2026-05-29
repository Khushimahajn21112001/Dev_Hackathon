import React, { useState, useEffect } from 'react';
import { BookOpen, X, AlertCircle } from 'lucide-react';

const ProvideResolutionModal = ({ isOpen, ticket, onConfirm, onCancel }) => {
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

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Provide Resolution</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition duration-150"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Ticket context preview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80">
            <span className="text-[10px] font-mono font-bold text-slate-500">{ticket.ticketNumber}</span>
            <h4 className="text-xs font-bold text-slate-350 leading-relaxed mt-1 line-clamp-1">{ticket.ticketTitle}</h4>
          </div>

          {/* Validation alerts */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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

          {/* KB Sync — always enabled, no user action required */}
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all duration-150"
            >
              Submit Resolution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProvideResolutionModal;
