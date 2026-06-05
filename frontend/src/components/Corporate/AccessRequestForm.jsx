// frontend/src/components/Corporate/AccessRequestForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { X, KeyRound, Server, Database, ShieldCheck, FolderOpen, BarChart2, Lock, Clock, Wifi, HelpCircle, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';

const ACCESS_TYPES = [
  { value: 'Server Credentials', icon: Server, desc: 'Login credentials for a server' },
  { value: 'Database Access', icon: Database, desc: 'Access to a database or data store' },
  { value: 'Admin Rights', icon: ShieldCheck, desc: 'Admin/elevated rights on a machine' },
  { value: 'Shared Folder Access', icon: FolderOpen, desc: 'Access to a shared network folder' },
  { value: 'Power BI / Analytics Tool', icon: BarChart2, desc: 'Access to analytics workspace' },
  { value: 'Production / Privileged Access', icon: Lock, desc: 'Privileged or production access' },
  { value: 'Temporary Access', icon: Clock, desc: 'Time-limited access to a resource' },
  { value: 'VPN / Remote Access', icon: Wifi, desc: 'VPN or remote connection access' },
  { value: 'Other', icon: HelpCircle, desc: 'Other access requests' },
];

const URGENCY_OPTS = [
  { value: 'Low', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { value: 'Medium', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { value: 'High', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
];

const AccessRequestForm = ({ onClose, onSuccess }) => {
  const userId = localStorage.getItem('userId');

  const [form, setForm] = useState({
    accessType: '',
    title: '',
    description: '',
    targetResource: '',
    justification: '',
    urgency: 'Medium',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accessType) { setError('Please select an Access Type.'); return; }
    if (!form.title.trim()) { setError('Please enter a short title for your request.'); return; }
    if (!form.description.trim()) { setError('Please describe what you need.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/access-requests', {
        ...form,
        raisedBy: userId,
      });
      setSuccess(`Access Request ${res.data.request.requestNumber} submitted successfully!`);
      setTimeout(() => {
        onSuccess && onSuccess(res.data.request);
        onClose && onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-2">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <KeyRound className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New Access Request</h2>
              <p className="text-xs text-slate-400">Request credentials, admin rights, or resource access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Access Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Access Type <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCESS_TYPES.map(({ value, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange('accessType', value)}
                  className={`flex flex-col items-start gap-1.5 px-3 py-3 rounded-xl border text-left transition-all duration-150 ${
                    form.accessType === value
                      ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                      : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold leading-tight">{value}</span>
                  <span className="text-[10px] text-slate-500 leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Request Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Need credentials for server 10.10.1.5"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Description <span className="text-red-400">*</span></label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Describe what you need access to and why..."
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition resize-none"
            />
          </div>

          {/* Target Resource */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Target Resource / System</label>
            <input
              type="text"
              value={form.targetResource}
              onChange={e => handleChange('targetResource', e.target.value)}
              placeholder="e.g. Server 10.10.1.5, HR Database, Finance BI Workspace"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition"
            />
          </div>

          {/* Business Justification */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Business Justification</label>
            <textarea
              value={form.justification}
              onChange={e => handleChange('justification', e.target.value)}
              rows={2}
              placeholder="Why do you need this access? (project, task, team requirement, etc.)"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition resize-none"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Urgency</label>
            <div className="flex gap-2">
              {URGENCY_OPTS.map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange('urgency', value)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all duration-150 ${
                    form.urgency === value ? color : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!success}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-lg shadow-violet-500/20"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccessRequestForm;
