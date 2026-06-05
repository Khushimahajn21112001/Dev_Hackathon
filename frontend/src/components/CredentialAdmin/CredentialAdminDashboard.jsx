// frontend/src/components/CredentialAdmin/CredentialAdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  KeyRound, ShieldCheck, LogOut, Clock, RefreshCw, CheckCircle2, XCircle,
  AlertCircle, User, Server, Tag, Calendar, FileText, ChevronRight,
  CheckCheck, Inbox, Archive, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TABS = ['Pending', 'In Review', 'Approved', 'Rejected'];

const STATUS_CONFIG = {
  Pending:     { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',     icon: Clock },
  'In Review': { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',        icon: RefreshCw },
  Approved:   { color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',  icon: CheckCircle2 },
  Rejected:    { color: 'text-red-400 bg-red-500/10 border-red-500/30',           icon: XCircle },
};

const URGENCY_COLOR = {
  Low: 'text-emerald-400',
  Medium: 'text-amber-400',
  High: 'text-red-400',
};

const CredentialAdminDashboard = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || 'Credential Admin';

  const [activeTab, setActiveTab] = useState('Pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actionModal, setActionModal] = useState(null); // 'approve' | 'reject' | 'review'
  const [actionForm, setActionForm] = useState({ adminRemarks: '', internalNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/access-requests');
      const all = res.data.requests || [];
      const c = {};
      TABS.forEach(t => { c[t] = all.filter(r => r.status === t).length; });
      setCounts(c);
      const filtered = all.filter(r => r.status === activeTab);
      setRequests(filtered);
    } catch (err) {
      console.error('Error fetching access requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [activeTab]);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const openAction = (req, type) => {
    setSelected(req);
    setActionModal(type);
    setActionForm({ adminRemarks: '', internalNotes: '' });
    setFeedback('');
  };

  const submitAction = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const endpoint = `http://localhost:5000/api/access-requests/${selected._id}/${actionModal}`;
      await axios.patch(endpoint, {
        handledBy: userId,
        adminRemarks: actionForm.adminRemarks,
        internalNotes: actionForm.internalNotes,
      });
      setFeedback(`Request ${selected.requestNumber} ${actionModal === 'approve' ? 'approved' : actionModal === 'review' ? 'moved to In Review' : 'rejected'} successfully.`);
      setTimeout(() => {
        setActionModal(null);
        setSelected(null);
        setFeedback('');
        fetchAll();
      }, 1800);
    } catch (err) {
      setFeedback('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r =>
    !search ||
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.raisedBy?.username?.toLowerCase().includes(search.toLowerCase()) ||
    r.targetResource?.toLowerCase().includes(search.toLowerCase())
  );

  const tabIcon = { Pending: Clock, 'In Review': RefreshCw, Approved: CheckCircle2, Rejected: XCircle };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 flex flex-col py-6 px-4 shrink-0">
        {/* Brand */}
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <KeyRound className="h-4 w-4 text-violet-400" />
            </div>
            <span className="text-sm font-bold text-white">Credential Portal</span>
          </div>
          <p className="text-xs text-slate-500 px-1">Aegis AI Support</p>
        </div>

        {/* User Info */}
        <div className="px-3 py-3 mb-6 bg-slate-950/50 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <User className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{username}</p>
              <p className="text-[10px] text-violet-400 font-semibold">Credential Admin</p>
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {TABS.map(tab => {
            const Icon = tabIcon[tab];
            const cfg = STATUS_CONFIG[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-violet-600/10 border border-violet-500/30 text-violet-300'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab}
                </span>
                {counts[tab] > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
                    {counts[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-300 hover:bg-red-950/30 border border-transparent hover:border-red-900/30 transition mt-6"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {activeTab === 'Pending' ? 'Pending Requests' :
               activeTab === 'In Review' ? 'Requests In Review' :
               activeTab === 'Approved' ? 'Approved Requests' : 'Rejected Requests'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {counts[activeTab] || 0} request{counts[activeTab] !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition"
            />
          </div>
        </div>

        {/* Request Cards */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading...</p>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <Inbox className="h-14 w-14 opacity-40" />
              <p className="text-base font-semibold text-slate-500">No {activeTab.toLowerCase()} requests</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(req => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={req._id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/60 transition">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{req.requestNumber}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {req.status}
                        </span>
                        <span className={`text-xs font-semibold ${URGENCY_COLOR[req.urgency]}`}>
                          {req.urgency} Priority
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{req.title}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {req.raisedBy?.name || req.raisedBy?.username || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />{req.accessType}
                        </span>
                        {req.targetResource && (
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />{req.targetResource}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{formatDate(req.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{req.description}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {req.status === 'Pending' && (
                        <>
                          <button onClick={() => openAction(req, 'review')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/20 transition">
                            Mark In Review
                          </button>
                          <button onClick={() => openAction(req, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/20 transition">
                            Approve
                          </button>
                          <button onClick={() => openAction(req, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-600/20 transition">
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 'In Review' && (
                        <>
                          <button onClick={() => openAction(req, 'approve')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/20 transition">
                            Approve
                          </button>
                          <button onClick={() => openAction(req, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-600/20 transition">
                            Reject
                          </button>
                        </>
                      )}
                      {(req.status === 'Approved' || req.status === 'Rejected') && (
                        <button onClick={() => setSelected(req)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1">
                          <FileText className="h-3 w-3" /> View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail / View Modal */}
      {selected && !actionModal && (
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
            <div className="px-6 py-5 space-y-3 text-sm">
              {[
                ['Raised By', selected.raisedBy?.name || selected.raisedBy?.username || '—'],
                ['Email', selected.raisedBy?.email || '—'],
                ['Access Type', selected.accessType],
                ['Target Resource', selected.targetResource || '—'],
                ['Urgency', selected.urgency],
                ['Description', selected.description],
                ['Justification', selected.justification || '—'],
                ['Status', selected.status],
                ['Admin Remarks', selected.adminRemarks || '—'],
                ['Handled By', selected.handledBy?.name || selected.handledBy?.username || '—'],
                ['Approved On', formatDate(selected.approvedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="w-36 shrink-0 text-slate-500 font-medium">{label}</span>
                  <span className="text-slate-200 flex-1 break-words">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => setSelected(null)} className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white capitalize">
                {actionModal === 'approve' ? '✅ Approve Request' : actionModal === 'review' ? '🔍 Mark In Review' : '❌ Reject Request'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{selected.requestNumber} — {selected.title}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                  {actionModal === 'approve' ? 'Approval Note (visible to user)' : 
                   actionModal === 'reject' ? 'Rejection Reason (visible to user) *' :
                   'Note (optional, visible to user)'}
                </label>
                <textarea
                  value={actionForm.adminRemarks}
                  onChange={e => setActionForm(p => ({ ...p, adminRemarks: e.target.value }))}
                  rows={3}
                  placeholder={
                    actionModal === 'approve'
                      ? 'e.g. Access has been provisioned. You will receive instructions via email.'
                      : actionModal === 'reject'
                      ? 'e.g. Request denied due to policy restrictions. Please contact your manager.'
                      : 'Optional note for the user...'
                  }
                  className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition resize-none"
                />
              </div>
              {(actionModal === 'approve' || actionModal === 'review') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                    Internal Notes (not shown to user)
                  </label>
                  <textarea
                    value={actionForm.internalNotes}
                    onChange={e => setActionForm(p => ({ ...p, internalNotes: e.target.value }))}
                    rows={2}
                    placeholder="Internal tracking notes, ticket refs, etc. Do NOT store raw credentials here."
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition resize-none"
                  />
                  <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Security: Do NOT store raw credentials or passwords in this system.
                  </p>
                </div>
              )}
              {feedback && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border ${
                  feedback.startsWith('Error') ? 'bg-red-950/40 border-red-800/50 text-red-300' : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                }`}>
                  {feedback.startsWith('Error') ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {feedback}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => { setActionModal(null); setSelected(null); }}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={submitting || !!feedback}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                  actionModal === 'reject'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : actionModal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {submitting ? 'Processing...' : actionModal === 'approve' ? 'Approve Request' : actionModal === 'review' ? 'Mark In Review' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialAdminDashboard;
