import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, BellOff, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CorporateNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/corporate/notifications/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(res.data.notifications || res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} at ${hours}:${minutes}`;
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatTimestamp(dateStr);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="h-8 w-48 bg-slate-800 rounded-lg mb-6 animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-slate-800 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
                <div className="h-3 w-16 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20">
              <Bell className="h-5 w-5 text-indigo-400" />
            </div>
            Notifications
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-12">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={fetchNotifications}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-all duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 mb-4 flex items-center gap-3 animate-slide-up">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 animate-scale-up">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-4">
            <BellOff className="h-12 w-12 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mt-2">No notifications yet</h3>
          <p className="text-sm text-slate-500 mt-1 text-center max-w-sm">
            You'll receive notifications here when there are updates on your tickets.
          </p>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif, index) => {
            const isUnread = !notif.read && !notif.isRead;
            return (
              <div
                key={notif._id || index}
                className={`bg-slate-900 rounded-xl p-5 transition-all duration-200 hover:bg-slate-800/80 animate-slide-up ${
                  isUnread
                    ? 'border-l-4 border-l-indigo-500 border-t border-r border-b border-slate-700/60 bg-slate-900/90'
                    : 'border border-slate-800'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    isUnread
                      ? 'bg-indigo-600/20 border border-indigo-500/20'
                      : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {isUnread ? (
                      <Bell className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${
                      isUnread ? 'text-slate-200 font-medium' : 'text-slate-400'
                    }`}>
                      {notif.message}
                    </p>

                    {/* Ticket Reference */}
                    {(notif.ticketNumber || notif.ticketId) && (
                      <button
                        onClick={() => {
                          const role = localStorage.getItem('role');
                          if (role === 'Support User') {
                            navigate('/support/tickets');
                          } else {
                            navigate('/corporate/my-tickets');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors duration-150"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {notif.ticketNumber || `Ticket #${notif.ticketId}`}
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    <span>{getRelativeTime(notif.createdAt || notif.timestamp)}</span>
                  </div>

                  {/* Unread dot */}
                  {isUnread && (
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CorporateNotifications;
