import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  FileText,
  Ticket,
  Clock,
  Tag,
  Users,
  TriangleAlert,
  Lightbulb,
  ThumbsUp,
} from 'lucide-react';

const TypingIndicator = () => (
  <div className="flex items-end gap-3 animate-fade-in">
    <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20 shrink-0 self-end">
      <Bot className="h-4 w-4 text-indigo-400" />
    </div>
    <div className="bg-slate-800 rounded-2xl rounded-bl-md px-5 py-3.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const PriorityBadge = ({ priority }) => {
  const colors = {
    Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    High: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    Critical: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${colors[priority] || colors.Medium}`}>
      <TriangleAlert className="h-3 w-3" />
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    Open: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Closed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${colors[status] || colors.Open}`}>
      {status}
    </span>
  );
};

const RaiseRequest = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      content: "Hello! I'm your AI Support Agent. Describe your IT issue and I'll help you get it resolved.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [duplicateData, setDuplicateData] = useState(null);
  const [kbData, setKbData] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, { ...msg, id: Date.now() + Math.random(), timestamp: new Date() }]);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    // Add user message
    addMessage({ type: 'user', content: text });
    setInputText('');
    setPreviewData(null);
    setDuplicateData(null);
    setKbData(null);
    setIsLoading(true);

    try {
      const res = await axios.post(
        'http://localhost:5000/api/corporate/analyze-issue',
        { userId, issueText: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsLoading(false);

      if (res.data.kbMatchFound) {
        addMessage({
          type: 'ai',
          content: res.data.message,
        });
        const kbMatch = { ...res.data.matchedKb, originalUserInput: text, matchType: res.data.matchType, similarityScore: res.data.similarityScore };
        setKbData(kbMatch);
        addMessage({ type: 'kb-card', data: kbMatch });
      } else if (res.data.duplicateFound) {
        addMessage({
          type: 'ai',
          content: 'I found a similar ticket that has already been raised. Here are the details:',
        });
        const duplicate = { ...res.data, originalUserInput: text };
        setDuplicateData(duplicate);
        addMessage({ type: 'duplicate-card', data: duplicate });
      } else {
        addMessage({
          type: 'ai',
          content: "I've analyzed your issue. Here's a preview of the ticket I'll create for you:",
        });
        const preview = { ...res.data.ticketPreview, originalUserInput: text };
        setPreviewData(preview);
        addMessage({ type: 'preview-card', data: preview });
      }
    } catch (err) {
      setIsLoading(false);
      addMessage({
        type: 'ai',
        content: 'Sorry, I encountered an error while analyzing your issue. Please try again.',
      });
    }
  };

  const handleCreateTicket = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        userId,
        ticketTitle: data.ticketTitle,
        ticketDescription: data.ticketDescription,
        category: data.category,
        assignedTeamId: data.assignedTeamId,
        priority: data.priority,
        originalUserInput: data.originalUserInput,
        extractedEntities: data.extractedEntities,
      };

      const res = await axios.post(
        'http://localhost:5000/api/corporate/create-ticket',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsLoading(false);
      setPreviewData(null);

      const ticketNum = res.data.ticketNumber || res.data.ticket?.ticketNumber || 'N/A';
      addMessage({
        type: 'ai',
        content: `✅ Ticket created successfully! Your ticket number is **${ticketNum}**. Our team will review it shortly.`,
      });
      addMessage({ type: 'success-actions', ticketNumber: ticketNum });
    } catch (err) {
      setIsLoading(false);
      addMessage({
        type: 'ai',
        content: 'Sorry, I was unable to create the ticket. Please try again.',
      });
    }
  };

  const handleKBSolved = async () => {
    if (!kbData) return;
    setIsLoading(true);
    try {
      await axios.post(
        'http://localhost:5000/api/corporate/kb-resolution-success',
        { userId, kbId: kbData._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLoading(false);
      setKbData(null);
      addMessage({
        type: 'ai',
        content: 'Glad to know your issue is resolved! Have a great day.',
      });
      addMessage({ type: 'success-actions' });
    } catch (err) {
      setIsLoading(false);
      console.error(err);
    }
  };

  const handleKBFailed = () => {
    addMessage({
      type: 'ai',
      content: 'The suggested steps did not resolve your issue. Would you like to create a support ticket?',
    });
    addMessage({ type: 'kb-failed-actions', data: kbData });
  };

  const handleCreateTicketAfterKB = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        userId,
        ticketTitle: data.issueTitle,
        ticketDescription: data.originalUserInput,
        category: data.category,
        assignedTeamId: data.assignedTeamId || null,
        attemptedKbId: data._id,
        attemptedResolutionSteps: data.knownFixSteps ? data.knownFixSteps.join('\n') : '',
        priority: 'Medium',
      };

      const res = await axios.post(
        'http://localhost:5000/api/corporate/create-ticket-after-kb-failed',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsLoading(false);
      setKbData(null);

      const ticketNum = res.data.ticketNumber || res.data.ticket?.ticketNumber || 'N/A';
      addMessage({
        type: 'ai',
        content: `✅ Ticket created successfully! Your ticket number is **${ticketNum}**. Our team will review it shortly.`,
      });
      addMessage({ type: 'success-actions', ticketNumber: ticketNum });
    } catch (err) {
      setIsLoading(false);
      addMessage({
        type: 'ai',
        content: 'Sorry, I was unable to create the ticket. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    setPreviewData(null);
    addMessage({
      type: 'ai',
      content: "No problem! The ticket was not created. Feel free to describe a different issue or rephrase your request.",
    });
  };

  const handleRaiseAnother = () => {
    setPreviewData(null);
    setDuplicateData(null);
    addMessage({
      type: 'ai',
      content: "Sure! Describe your next IT issue and I'll help you get it resolved.",
    });
    inputRef.current?.focus();
  };

  const handleRaiseAnyway = async () => {
    if (!duplicateData) return;
    addMessage({
      type: 'ai',
      content: "Understood. I'll prepare a new ticket for you. Let me analyze your original request again.",
    });
    setDuplicateData(null);
    // Re-trigger with force flag or show as preview
    setIsLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/corporate/analyze-issue',
        { userId, issueText: duplicateData.originalUserInput || 'Re-raise request', forceDuplicate: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLoading(false);
      addMessage({
        type: 'ai',
        content: "Here's the ticket preview:",
      });
      const preview = { ...res.data.ticketPreview, originalUserInput: duplicateData.originalUserInput || '' };
      setPreviewData(preview);
      addMessage({ type: 'preview-card', data: preview });
    } catch (err) {
      setIsLoading(false);
      addMessage({
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatContent = (content) => {
    // Simple bold markdown parsing
    return content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const renderMessage = (msg, index) => {
    // User message
    if (msg.type === 'user') {
      return (
        <div key={msg.id} className="flex justify-end animate-slide-up" style={{ animationDelay: `${50}ms` }}>
          <div className="flex items-end gap-3 max-w-[75%]">
            <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-5 py-3.5 shadow-lg shadow-indigo-600/10">
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
            <div className="bg-indigo-600/30 p-2 rounded-lg border border-indigo-500/30 shrink-0 self-end">
              <User className="h-4 w-4 text-indigo-300" />
            </div>
          </div>
        </div>
      );
    }

    // AI message
    if (msg.type === 'ai') {
      return (
        <div key={msg.id} className="flex items-end gap-3 max-w-[75%] animate-slide-up" style={{ animationDelay: `${50}ms` }}>
          <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20 shrink-0 self-end">
            <Bot className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-bl-md px-5 py-3.5 border border-slate-700/50">
            <p className="text-sm leading-relaxed">{formatContent(msg.content)}</p>
          </div>
        </div>
      );
    }

    // KB card
    if (msg.type === 'kb-card') {
      const d = msg.data;
      const isStrong = d.matchType === 'strong';
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">
            <div className={`backdrop-blur-md bg-slate-900/80 border ${isStrong ? 'border-emerald-500/30' : 'border-amber-500/30'} rounded-xl p-5 mb-3 shadow-lg`}>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className={`h-4 w-4 ${isStrong ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${isStrong ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isStrong ? 'Strong similar issue found' : 'Possible similar issue found'}
                </span>
                {!isStrong && d.similarityScore && (
                  <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Match: {(d.similarityScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Issue Title</p>
                  <p className="text-sm font-semibold text-white">{d.issueTitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Category</p>
                    <p className="text-sm text-slate-300">{d.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Success Rate</p>
                    <p className="text-sm font-semibold text-emerald-400">{d.successRate}%</p>
                  </div>
                </div>
                {d.rootCause && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Root Cause</p>
                    <p className="text-sm text-slate-300">{d.rootCause}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Resolution Steps</p>
                  <ul className="list-disc list-inside space-y-1">
                    {(d.knownFixSteps || []).map((step, i) => (
                      <li key={i} className="text-sm text-slate-300">{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isStrong ? (
                <>
                  <button
                    onClick={handleKBSolved}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Issue Resolved
                  </button>
                  <button
                    onClick={handleKBFailed}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Still Not Resolved
                  </button>
                </>
              ) : (
                <>
                  <p className="w-full text-xs text-slate-400 mb-1">Does this look related to your issue?</p>
                  <button
                    onClick={handleKBSolved}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Yes, try these steps
                  </button>
                  <button
                    onClick={handleKBFailed}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    No, create new ticket
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // KB failed actions
    if (msg.type === 'kb-failed-actions') {
      const d = msg.data;
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[75%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCreateTicketAfterKB(d)}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              Create Ticket
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // Duplicate card
    if (msg.type === 'duplicate-card') {
      const d = msg.data;
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">
            {/* Duplicate ticket card */}
            <div className="backdrop-blur-md bg-slate-900/80 border border-amber-500/30 rounded-xl p-5 mb-3 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Existing Ticket Found</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Ticket className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Ticket:</span>
                  <span className="text-sm font-semibold text-white">{d.ticketNumber || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-slate-500 mt-0.5" />
                  <span className="text-xs text-slate-400">Title:</span>
                  <span className="text-sm text-slate-200">{d.ticketTitle || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Status:</span>
                  <StatusBadge status={d.status || 'Open'} />
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Assigned To:</span>
                  <span className="text-sm text-slate-300">{d.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Created:</span>
                  <span className="text-sm text-slate-300">{formatDate(d.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRaiseAnyway}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Raise New Ticket Anyway
              </button>
              <button
                onClick={() => navigate('/corporate/my-tickets')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <FileText className="h-3.5 w-3.5" />
                View My Tickets
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Preview card
    if (msg.type === 'preview-card') {
      const d = msg.data;
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">
            {/* Preview card - glassmorphic */}
            <div className="backdrop-blur-md bg-slate-900/80 border border-slate-700/50 rounded-xl p-5 mb-3 shadow-lg relative overflow-hidden">
              {/* Gradient accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

              <div className="flex items-center gap-2 mb-4 mt-1">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Ticket Preview</span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Title</p>
                  <p className="text-sm font-semibold text-white">{d.ticketTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{d.ticketDescription}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Category</p>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {d.category}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Assigned Team</p>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-300">
                      <Users className="h-3 w-3 text-slate-500" />
                      {d.assignedTeam}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Priority</p>
                    <PriorityBadge priority={d.priority} />
                  </div>
                </div>

                {/* Show extracted entities */}
                {d.extractedEntities && (d.extractedEntities.url || d.extractedEntities.domain || (d.extractedEntities.appNames && d.extractedEntities.appNames.length > 0)) && (
                  <div className="pt-3 border-t border-slate-800/60 mt-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> Extracted Entities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {d.extractedEntities.url && <span className="text-[10px] bg-slate-950 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded">URL: {d.extractedEntities.url}</span>}
                      {d.extractedEntities.domain && <span className="text-[10px] bg-slate-950 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded">Domain: {d.extractedEntities.domain}</span>}
                      {d.extractedEntities.appNames && d.extractedEntities.appNames.map(app => (
                        <span key={app} className="text-[10px] bg-slate-950 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded">App: {app}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCreateTicket(d)}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="h-4 w-4" />
                Create Ticket
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Success actions
    if (msg.type === 'success-actions') {
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[75%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRaiseAnother}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Raise Another Issue
            </button>
            <button
              onClick={() => navigate('/corporate/my-tickets')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              View My Tickets
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/20">
              <Bot className="h-5 w-5 text-indigo-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Aegis AI Agent
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            </h1>
            <p className="text-xs text-emerald-400 font-medium">Online • Ready to assist</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg, index) => renderMessage(msg, index))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 shrink-0">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your IT issue..."
              rows={1}
              className="w-full bg-slate-800 text-slate-100 rounded-xl px-4 py-3 pr-4 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none placeholder-slate-500 resize-none text-sm transition-all duration-200"
              style={{ maxHeight: '120px' }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 text-white p-3 rounded-xl border border-indigo-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-600/20 disabled:shadow-none shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          AI-powered analysis • Press Enter to send
        </p>
      </div>
    </div>
  );
};

export default RaiseRequest;
