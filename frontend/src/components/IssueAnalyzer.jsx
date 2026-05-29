import React, { useState } from 'react';
import axios from 'axios';
import { Send, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import LoadingSpinner from './UI/LoadingSpinner';

const IssueAnalyzer = ({ onTicketCreated }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSolved(false);

    const userId = localStorage.getItem('userId');

    try {
      const response = await axios.post('http://localhost:5000/api/issues/analyze', {
        description,
        raisedBy: userId,
      });

      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolved = () => {
    setSolved(true);
    // Simple reset after success message
    setTimeout(() => {
      setDescription('');
      setResult(null);
      setSolved(false);
    }, 4000);
  };

  const handleCreateAnyway = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    try {
      // Find category based on result or default
      const response = await axios.post('http://localhost:5000/api/tickets/create', {
        raisedBy: userId,
        issueDescription: description,
        category: result?.assignedTeam || 'Generic',
      });
      setDescription('');
      setResult(null);
      if (onTicketCreated) onTicketCreated();
    } catch (err) {
      console.error(err);
      setError('Failed to create ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
        AI-Powered Support Desk
      </h2>
      <p className="text-sm text-slate-400 mt-1">
        Describe your issue in detail. Our automated agent will scan for instant resolutions.
      </p>

      {error && (
        <div className="mt-4 p-4 bg-red-950/40 border border-red-900 text-red-200 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          {error}
        </div>
      )}

      {solved ? (
        <div className="mt-6 p-6 bg-emerald-950/40 border border-emerald-900 text-emerald-200 rounded-xl flex flex-col items-center text-center gap-3 animate-fade-in">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <div>
            <h3 className="font-bold text-lg text-emerald-100">Awesome! Issue Resolved</h3>
            <p className="text-sm mt-1 text-slate-400">
              Glad we could help you fix it instantly. The activity has been logged in the system.
            </p>
          </div>
        </div>
      ) : result ? (
        <div className="mt-6 space-y-5 animate-slide-up">
          {result.match ? (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-950/40 border border-indigo-900 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-200">Matching Resolution Found</h4>
                  <p className="text-sm text-slate-400 mt-1">
                    Based on keyword mapping: <span className="font-mono text-indigo-400">{result.issueTitle}</span>
                  </p>
                </div>
              </div>

              {result.resolution && result.resolution.length > 0 && (
                <div className="bg-slate-950/60 p-5 border border-slate-800 rounded-xl">
                  <p className="text-sm font-semibold text-slate-300">Recommended Steps:</p>
                  <ol className="mt-3 space-y-2.5 list-decimal list-inside text-sm text-slate-400">
                    {result.resolution.map((step, idx) => (
                      <li key={idx} className="marker:text-indigo-400">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  Did this solve your issue?
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleResolved}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all duration-150"
                  >
                    Yes, Solved!
                  </button>
                  <button
                    onClick={handleCreateAnyway}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 active:scale-95 transition-all duration-150"
                  >
                    No, Create Ticket
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-yellow-950/30 border border-yellow-900 rounded-xl flex flex-col gap-3">
              <div className="flex items-start gap-3 text-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-200">No Match Found - Ticket Created</h4>
                  <p className="text-sm text-slate-400 mt-1">
                    No matching issue was found in the database. A support ticket has been auto-created.
                  </p>
                </div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Ticket ID: {result.ticketNumber}</span>
                <span className="text-yellow-500">Routing to: {result.assignedTeam || 'Default Team'}</span>
              </div>
              <button
                onClick={() => {
                  setDescription('');
                  setResult(null);
                  if (onTicketCreated) onTicketCreated();
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition duration-150"
              >
                Done
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleAnalyze} className="mt-5 space-y-4">
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. My VPN disconnects every 10 minutes and requires MFA again."
            className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-sm resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition-all duration-150"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Analyze Issue
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default IssueAnalyzer;
