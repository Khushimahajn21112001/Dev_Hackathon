// frontend/src/components/Corporate/MyAccessRequests.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { KeyRound, Plus, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronRight, Calendar, Tag, Server } from 'lucide-react';
import AccessRequestForm from './AccessRequestForm';

const STATUS_CONFIG = {
  Pending:    { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',   icon: Clock },
  'In Review':{ color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',     icon: RefreshCw },
  Approved:   { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  Rejected:   { color: 'text-red-400 bg-red-500/10 border-red-500/30',        icon: XCircle },
};

const URGENCY_COLOR = {
  Low: 'text-emerald-400',
  Medium: 'text-amber-400',
  High: 'text-red-400',
};

const MyAccessRequests = () => {
  const userId = localStorage.getItem('userId');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [moduleActive, setModuleActive] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [reqRes, modRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/access-requests/my/${userId}`),
        axios.get('http://localhost:5000/api/access-requests/module-status'),
      ]);
      setRequests(reqRes.data.requests || []);
      setModuleActive(modRes.data.active);
    } catch (err) {
      console.error('Failed to fetch access requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950/30 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-violet-400" />
            My Access Requests
          </h1>
          <p className="text-sm text-slate-400 mt-1">Track and raise credential or access requests</p>
        </div>
        {moduleActive && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition shadow-lg shadow-violet-500/20"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        )}
      </div>

      {/* Module Inactive Warning */}
      {!moduleActive && (
        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Access Request module is currently inactive.</p>
            <p className="text-xs text-amber-400 mt-0.5">Contact your IT Administrator to enable this feature.</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading requests...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <KeyRound className="h-12 w-12 opacity-30" />
            <p className="text-base font-semibold text-slate-400">No access requests yet</p>
            <p className="text-sm">Click "New Request" to raise your first access request.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={req._id}
                onClick={() => setSelected(req)}
                className="group bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 cursor-pointer hover:border-violet-500/30 hover:bg-slate-900/80 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{req.requestNumber}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {req.status}
                      </span>
                      <span className={`text-xs font-semibold ${URGENCY_COLOR[req.urgency]}`}>
                        {req.urgency} Priority
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{req.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{req.accessType}</span>
                      {req.targetResource && (
                        <span className="flex items-center gap-1"><Server className="h-3 w-3" />{req.targetResource}</span>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(req.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 mt-0.5 shrink-0 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-slate-500">{selected.requestNumber}</p>
                <h2 className="text-base font-bold text-white">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              {[
                ['Access Type', selected.accessType],
                ['Target Resource', selected.targetResource || '—'],
                ['Description', selected.description],
                ['Justification', selected.justification || '—'],
                ['Urgency', selected.urgency],
                ['Status', selected.status],
                ['Raised On', formatDate(selected.createdAt)],
                ...(selected.adminRemarks ? [['Admin Notes', selected.adminRemarks]] : []),
                ...(selected.handledBy ? [['Handled By', selected.handledBy.name || selected.handledBy.username]] : []),
                ...(selected.approvedAt ? [['Approved On', formatDate(selected.approvedAt)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="w-36 shrink-0 text-slate-500 font-medium">{label}</span>
                  <span className="text-slate-200 flex-1">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Form */}
      {showForm && (
        <AccessRequestForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchRequests(); }}
        />
      )}
    </div>
  );
};

export default MyAccessRequests;
