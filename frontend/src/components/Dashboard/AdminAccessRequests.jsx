import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  KeyRound, ShieldCheck, Clock, RefreshCw, CheckCircle2, XCircle,
  AlertCircle, User, Server, Tag, Calendar, FileText, ChevronRight,
  Inbox, Search, Send
} from 'lucide-react';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';

const TABS = ['Pending', 'Approved', 'Rejected'];

const STATUS_CONFIG = {
  Pending:     { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',     icon: Clock },
  Approved:    { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  Rejected:    { color: 'text-red-400 bg-red-500/10 border-red-500/30',           icon: XCircle },
};

const URGENCY_COLOR = {
  Low: 'text-emerald-400',
  Medium: 'text-amber-400',
  High: 'text-red-400',
};

const AdminAccessRequests = () => {
  const userId = localStorage.getItem('userId');
  
  const [activeTab, setActiveTab] = useState('Pending');
  const [requests, setRequests] = useState([]);
  const [credentialAdmins, setCredentialAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  const [actionModal, setActionModal] = useState(null); // 'approve' | 'reject' | 'review' | 'assign'
  const [actionForm, setActionForm] = useState({ adminRemarks: '', internalNotes: '', assignTo: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/access-requests'),
        axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/admin/users')
      ]);
      const all = reqRes.data.requests || [];
      const c = {};
      TABS.forEach(t => { c[t] = all.filter(r => r.status === t).length; });
      setCounts(c);
      
      const filtered = all.filter(r => r.status === activeTab);
      setRequests(filtered);

      const allUsers = usersRes.data.users || [];
      const credAdmins = allUsers.filter(u => u.role === 'Credential Admin' && u.status === 'Active');
      setCredentialAdmins(credAdmins);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const openAction = (req, type) => {
    setSelected(req);
    setActionModal(type);
    setActionForm({ adminRemarks: '', internalNotes: '', assignTo: '' });
    setFeedback('');
  };

  const submitAction = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      let endpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/access-requests/${selected._id}/${actionModal}`;
      let payload = {};

        payload = {
          handledBy: userId,
          adminRemarks: actionForm.adminRemarks,
          internalNotes: actionForm.internalNotes,
        };

      await axios.patch(endpoint, payload);
      setFeedback(`Request ${selected.requestNumber} ${
        actionModal === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setTimeout(() => {
        setActionModal(null);
        setSelected(null);
        setFeedback('');
        fetchData();
      }, 1500);
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

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl flex items-center gap-3">
                  <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <KeyRound className="h-6 w-6 text-violet-400" />
                  </div>
                  Access Requests Management
                </h1>
                <p className="text-sm text-slate-400 mt-2 ml-[52px]">
                  Supervise, assign, or take action on credential access requests.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search requests..."
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition"
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-xl">
              {TABS.map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab}
                    {counts[tab] > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs bg-slate-950/30 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {counts[tab]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Request Cards */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-600">
                <Inbox className="h-16 w-16 opacity-30" />
                <p className="text-base font-semibold text-slate-500">No {activeTab.toLowerCase()} requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map(req => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={req._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-slate-500">{req.requestNumber}</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {req.status}
                            </span>
                            <span className={`text-xs font-semibold ${URGENCY_COLOR[req.urgency]}`}>
                              {req.urgency} Priority
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mb-2">{req.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {req.raisedBy?.name || req.raisedBy?.username || '—'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5" />{req.accessType}
                            </span>
                            {req.targetResource && (
                              <span className="flex items-center gap-1.5">
                                <Server className="h-3.5 w-3.5" />{req.targetResource}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />{formatDate(req.createdAt)}
                            </span>
                            {req.handledBy && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 rounded-md">
                                <ShieldCheck className="h-3 w-3 text-indigo-400" />
                                {req.handledBy.name || req.handledBy.username}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-3 line-clamp-2">{req.description}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-row md:flex-col gap-2 shrink-0 flex-wrap">
                          {req.status === 'Pending' && (
                            <>
                              <button onClick={() => openAction(req, 'approve')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/20 transition flex items-center gap-1.5 justify-center">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button onClick={() => openAction(req, 'reject')}
                                className="px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-600/20 transition flex items-center gap-1.5 justify-center">
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => setSelected(req)}
                            className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

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
                ['Access Type', selected.accessType],
                ['Target Resource', selected.targetResource || '—'],
                ['Urgency', selected.urgency],
                ['Description', selected.description],
                ['Justification', selected.justification || '—'],
                ['Status', selected.status],
                ['Admin Remarks', selected.adminRemarks || '—'],
                ['Internal Notes', selected.internalNotes || '—'],
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
              <h2 className="text-base font-bold text-white capitalize flex items-center gap-2">
                {actionModal === 'approve' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {actionModal === 'reject' && <XCircle className="h-5 w-5 text-red-400" />}
                {actionModal === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{selected.requestNumber} — {selected.title}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                      {actionModal === 'approve' ? 'Approval Note (visible to user)' : 'Rejection Reason (visible to user) *'}
                    </label>
                    <textarea
                      value={actionForm.adminRemarks}
                      onChange={e => setActionForm(p => ({ ...p, adminRemarks: e.target.value }))}
                      rows={3}
                      placeholder={
                        actionModal === 'approve'
                          ? 'e.g. Access has been provisioned.'
                          : 'e.g. Request denied due to policy restrictions.'
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                      Internal Notes (Admin only)
                    </label>
                    <textarea
                      value={actionForm.internalNotes}
                      onChange={e => setActionForm(p => ({ ...p, internalNotes: e.target.value }))}
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition resize-none"
                    />
                  </div>

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
                onClick={() => { setActionModal(null); setSelected(null); setFeedback(''); }}
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
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {submitting ? 'Processing...' : actionModal === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccessRequests;
