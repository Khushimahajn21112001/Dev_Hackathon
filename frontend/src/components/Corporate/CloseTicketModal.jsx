import React, { useState, useEffect } from 'react';
import { BookOpen, X, AlertCircle, Sparkles } from 'lucide-react';

const CloseTicketModal = ({ isOpen, ticket, onConfirm, onCancel }) => {
  const [rootCause, setRootCause] = useState('');
  const [steps, setSteps] = useState('');
  const [reusable, setReusable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRootCause('');
      setSteps('');
      setReusable(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rootCause.trim()) {
      setError('Please document the root cause for future reference.');
      return;
    }
    if (!steps.trim()) {
      setError('Please list the troubleshooting resolution steps taken.');
      return;
    }
    onConfirm({ rootCause, steps, reusable });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up border border-slate-700/50">
        {/* Header with gradient accent */}
        <div className="relative px-6 py-4 border-b border-slate-800/80">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
                <BookOpen className="h-4 w-4 text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Resolve & Close Incident</h3>
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
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono font-bold text-indigo-400/80">{ticket.ticketNumber}</span>
            <h4 className="text-xs font-bold text-slate-300 leading-relaxed mt-1 line-clamp-1">{ticket.ticketTitle}</h4>
          </div>

          {/* Validation alerts */}
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 text-red-300 text-xs rounded-xl flex items-center gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Root cause */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Diagnosed Root Cause
            </label>
            <textarea
              required
              rows="3"
              placeholder="Detail the root technical driver behind this failure..."
              value={rootCause}
              onChange={(e) => { setRootCause(e.target.value); setError(''); }}
              className="block w-full px-4 py-2.5 border border-slate-700/70 rounded-xl bg-slate-950/60 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 resize-none transition-all duration-200 input-glow"
            />
          </div>

          {/* Resolution Steps */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Resolution Steps Taken
            </label>
            <textarea
              required
              rows="4"
              placeholder="Itemize the exact actions performed to resolve the incident..."
              value={steps}
              onChange={(e) => { setSteps(e.target.value); setError(''); }}
              className="block w-full px-4 py-2.5 border border-slate-700/70 rounded-xl bg-slate-950/60 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 resize-none transition-all duration-200 input-glow"
            />
          </div>

          {/* KB Sync Checkbox */}
          <div className="flex items-start gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
            <input
              id="reusable"
              type="checkbox"
              checked={reusable}
              onChange={(e) => setReusable(e.target.checked)}
              className="mt-1 h-4 w-4 text-indigo-600 border-slate-700 rounded bg-slate-950 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <label htmlFor="reusable" className="font-bold text-slate-200 cursor-pointer flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                Publish to Resolution Knowledge Base
              </label>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Registers this resolution profile in the enterprise catalog, enabling AI auto-resolve for duplicate issues.
              </p>
            </div>
          </div>

          {/* Action buttons */}
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
              Resolve & Close Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseTicketModal;
