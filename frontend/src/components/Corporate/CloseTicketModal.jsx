import React, { useState, useEffect } from 'react';
import { BookOpen, X, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">Resolve & Close Incident Ledger</h3>
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
              Diagnosed Root Cause
            </label>
            <textarea
              required
              rows="3"
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
              Resolution Steps Taken
            </label>
            <textarea
              required
              rows="4"
              placeholder="Itemize the exact actions performed to resolve the incident..."
              value={steps}
              onChange={(e) => {
                setSteps(e.target.value);
                setError('');
              }}
              className="block w-full px-4 py-2.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* KB Sync Checkbox */}
          <div className="flex items-start gap-3 bg-slate-950/65 p-4 rounded-xl border border-slate-850/65">
            <input
              id="reusable"
              type="checkbox"
              checked={reusable}
              onChange={(e) => setReusable(e.target.checked)}
              className="mt-1 h-4.5 w-4.5 text-indigo-650 border-slate-800 rounded bg-slate-955 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <label htmlFor="reusable" className="font-bold text-slate-205 cursor-pointer">
                Publish to Resolution Knowledge Base (AI Learn Sync)
              </label>
              <p className="text-[10px] text-slate-500 mt-1">
                Checking this box registers this resolution profile inside our enterprise catalog, enabling our AI models to immediately auto-resolve duplicate issues in the future.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-semibold rounded-xl transition duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg active:scale-95 transition-all duration-150"
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
