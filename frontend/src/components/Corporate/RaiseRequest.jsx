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
  Pencil,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import AccessRequestForm from './AccessRequestForm';

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
  const [currentMode, setCurrentMode] = useState('issue'); // 'issue' | 'access'
  const [hasSelectedOption, setHasSelectedOption] = useState(false);
  const [accessModuleActive, setAccessModuleActive] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      content: "Hello! I'm your AI Support Agent. How can I help you today?",
      timestamp: new Date(),
    },
    {
      id: 'options',
      type: 'options',
      options: ['Raise Issue', 'Raise Request for Access'],
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [issueFlowStep, setIssueFlowStep] = useState('initial'); // initial | categorySelection | issueInput | analyzing | preview
  const [selectedCategory, setSelectedCategory] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);
  const [ragData, setRagData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [reanalyzing, setReanalyzing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);
  const navigate = useNavigate();

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/teams', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTeams(res.data.teams || []);
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    };
    fetchTeams();
  }, [token]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, { ...msg, id: Date.now() + Math.random(), timestamp: new Date() }]);
  };

  const startIssueFlow = () => {
  setHasSelectedOption(true);
  setCurrentMode('issue');
  setIssueFlowStep('categorySelection');
  addMessage({ type: 'ai', content: 'Please select the type of issue you are facing.' });
  addMessage({ type: 'categorySelection' });
};

  // New handler for category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setIssueFlowStep('issueInput');
    addMessage({ type: 'ai', content: `You selected *${category}*. Please describe your issue.` });
  };

  const handleSend = async () => {
    console.log('[handleSend] triggered');
    const text = inputText.trim();
    if (!text || isLoading || isSendingRef.current) {
      console.log('[handleSend] aborted:', { text: !!text, isLoading, isSending: isSendingRef.current });
      return;
    }

    isSendingRef.current = true;
    addMessage({ type: 'user', content: text });
    setInputText('');
    setPreviewData(null);
    setDuplicateData(null);
    setRagData(null);
    setIsLoading(true);

    try {
      const payload = { userId, issueText: text };
      if (selectedCategory) payload.selectedCategory = selectedCategory;
      console.log('[handleSend] sending payload:', payload);
      
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/analyze-issue',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('[handleSend] received response:', res.data);

      setIsLoading(false);
      isSendingRef.current = false;

      if (res.data.ragAnswerAvailable) {
        addMessage({
          type: 'ai',
          content: 'Checking previous resolutions... I found some relevant solutions.',
        });
        const ragPayload = {
          ...res.data.ragResponse,
          ragContext: res.data.ragContext,
          originalUserInput: text,
          matchType: res.data.matchType,
          finalScore: res.data.finalScore,
          extractedMetadata: res.data.extractedMetadata,
        };
        setRagData(ragPayload);
        addMessage({ type: 'rag-card', data: ragPayload });
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
        const preview = { ...res.data.ticketPreview, originalUserInput: text, userSelectedCategory: selectedCategory || '' };
        setPreviewData(preview);
        addMessage({ type: 'preview-card', data: preview });
      }
    } catch (err) {
      console.error('[handleSend] ERROR:', err.response?.data || err.message || err);
      setIsLoading(false);
      isSendingRef.current = false;
      addMessage({
        type: 'ai',
        content: 'Sorry, I encountered an error while analyzing your issue. Please try again.',
      });
    }
  };

  const handleRagSolved = async () => {
    if (!ragData || isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoading(true);
    try {
      const ragContextIds = ragData.ragContext ? ragData.ragContext.map(r => r.kbId) : [];
      await axios.post(
        `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/rag-success',
        { userId, issueText: ragData.originalUserInput, ragContextIds, recommendedSteps: ragData.recommendedSteps },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLoading(false);
      isSendingRef.current = false;
      setRagData(null);
      addMessage({
        type: 'ai',
        content: 'Glad to know your issue is resolved! Have a great day.',
      });
      addMessage({ type: 'success-actions' });
    } catch (err) {
      setIsLoading(false);
      isSendingRef.current = false;
      console.error(err);
    }
  };

  const handleRagFailed = () => {
    addMessage({
      type: 'ai',
      content: 'The suggested steps did not resolve your issue. Would you like to create a support ticket?',
    });
    addMessage({ type: 'rag-failed-actions', data: ragData });
  };

  const handleCreateTicketAfterRagFailed = async (data) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoading(true);
    try {
      const ragContextIds = data.ragContext ? data.ragContext.map(r => r.kbId) : [];
      const rawInput = data.originalUserInput || '';
      const cleanedTitle = rawInput.trim().replace(/\s+/g, ' ');
      const capitalizedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);
      const computedTitle = capitalizedTitle.length > 80 ? capitalizedTitle.substring(0, 77) + '...' : capitalizedTitle;

      const payload = {
        userId,
        issueText: data.originalUserInput,
        ticketTitle: computedTitle || 'Issue reported via RAG',
        ticketDescription: data.originalUserInput,
        category: 'General IT Support',
        recommendedTeamId: data.recommendedTeam || null,
        ragContextIds: ragContextIds,
        attemptedRagSteps: data.recommendedSteps || [],
        ragFinalScore: data.finalScore,
        extractedMetadata: data.extractedMetadata,
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/create-ticket-after-rag-failed',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsLoading(false);
      isSendingRef.current = false;
      setRagData(null);

      const ticketNum = res.data.ticketNumber || res.data.ticket?.ticketNumber || 'N/A';
      addMessage({
        type: 'ai',
        content: `✅ Ticket created successfully! Your ticket number is **${ticketNum}**. Our team will review it shortly.`,
      });
      addMessage({ type: 'success-actions', ticketNumber: ticketNum });
    } catch (err) {
      setIsLoading(false);
      isSendingRef.current = false;
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

  const handleCreateTicket = async (data) => {
    console.log('[handleCreateTicket] called, data:', data);
    console.log('[handleCreateTicket] isSendingRef.current:', isSendingRef.current);
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsLoading(true);
    try {
      const payload = {
        userId,
        originalUserInput: data.originalUserInput,
        ticketTitle: data.ticketTitle,
        ticketDescription: data.ticketDescription,
        category: data.category || data.userSelectedCategory || 'General IT Support',
        assignedTeamId: null,
        priority: data.priority || 'Medium',
        extractedEntities: data.extractedEntities || {},
      };
      console.log('[handleCreateTicket] sending payload:', payload);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/create-ticket',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('[handleCreateTicket] response:', res.data);

      setIsLoading(false);
      isSendingRef.current = false;
      setPreviewData(null);

      const ticketNum = res.data.ticketNumber || res.data.ticket?.ticketNumber || 'N/A';
      addMessage({
        type: 'ai',
        content: `✅ Ticket created successfully! Your ticket number is **${ticketNum}**. Our team will review it shortly.`,
      });
      addMessage({ type: 'success-actions', ticketNumber: ticketNum });
    } catch (err) {
      console.error('[handleCreateTicket] ERROR:', err.response?.data || err.message || err);
      setIsLoading(false);
      isSendingRef.current = false;
      addMessage({
        type: 'ai',
        content: 'Sorry, I was unable to create the ticket. Please try again.',
      });
    }
  };

  const handleEditTicket = (data) => {
    setEditData({
      ticketTitle: data.ticketTitle || '',
      ticketDescription: data.ticketDescription || '',
      category: data.category || '',
      assignedTeam: data.assignedTeam || '',
      assignedTeamId: data.assignedTeamId || null,
      priority: data.priority || 'Medium',
      additionalComments: '',
      originalUserInput: data.originalUserInput || '',
      extractedEntities: data.extractedEntities || {},
      confidenceScore: data.confidenceScore || '',
      routingReason: data.routingReason || '',
    });
    setEditMode(true);
    addMessage({ type: 'ai', content: 'Please update the ticket details below.' });
    addMessage({ type: 'edit-form' });
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    setEditMode(false);
    const matchedTeam = teams.find(t => t.name === editData.assignedTeam);
    const updatedPreview = {
      ...editData,
      assignedTeamId: matchedTeam ? matchedTeam._id : editData.assignedTeamId,
      aiPreviewEdited: true,
    };
    setPreviewData(updatedPreview);
    addMessage({ type: 'ai', content: 'Updated ticket preview is ready. Please confirm to create ticket.' });
    addMessage({ type: 'preview-card', data: updatedPreview });
  };

  const handleReanalyze = async () => {
    if (!editData || isSendingRef.current) return;
    isSendingRef.current = true;
    setReanalyzing(true);
    setEditMode(false);
    addMessage({ type: 'ai', content: 'Re-analyzing your issue with AI...' });
    setIsLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/reanalyze-ticket-preview',
        {
          userId,
          originalUserInput: editData.originalUserInput,
          ticketTitle: editData.ticketTitle,
          ticketDescription: editData.ticketDescription,
          category: editData.category,
          assignedTeam: editData.assignedTeam,
          priority: editData.priority,
          additionalComments: editData.additionalComments,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsLoading(false);
      isSendingRef.current = false;
      setReanalyzing(false);

      const reanalyzed = {
        ticketTitle: res.data.ticketTitle,
        ticketDescription: res.data.ticketDescription,
        category: res.data.category,
        assignedTeam: res.data.assignedTeam,
        assignedTeamId: res.data.assignedTeamId,
        priority: res.data.priority,
        originalUserInput: editData.originalUserInput,
        extractedEntities: editData.extractedEntities,
        confidenceScore: res.data.confidenceScore,
        routingReason: res.data.routingReason,
        aiPreviewEdited: true,
        reanalysisRequested: true,
      };
      setPreviewData(reanalyzed);

      if (res.data.aiFailed) {
        addMessage({ type: 'ai', content: 'AI re-analysis was unavailable. Your edited values have been preserved. You can still create the ticket.' });
      } else {
        addMessage({ type: 'ai', content: 'AI has re-analyzed your issue. Here\'s the updated preview:' });
      }
      addMessage({ type: 'preview-card', data: reanalyzed });
    } catch (err) {
      setIsLoading(false);
      isSendingRef.current = false;
      setReanalyzing(false);
      addMessage({ type: 'ai', content: 'AI re-analysis failed. Your edited preview is still available. You can create the ticket with your edits.' });
      const fallbackPreview = { ...editData, aiPreviewEdited: true, reanalysisRequested: true };
      setPreviewData(fallbackPreview);
      addMessage({ type: 'preview-card', data: fallbackPreview });
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditData(null);
    addMessage({ type: 'ai', content: 'Edit cancelled. The original ticket preview is still available.' });
    if (previewData) {
      addMessage({ type: 'preview-card', data: previewData });
    }
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
    if (!duplicateData || isSendingRef.current) return;
    isSendingRef.current = true;
    addMessage({
      type: 'ai',
      content: "Understood. I'll prepare a new ticket for you. Let me analyze your original request again.",
    });
    setDuplicateData(null);
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/corporate/analyze-issue',
        { userId, issueText: duplicateData.originalUserInput || 'Re-raise request', forceDuplicate: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLoading(false);
      isSendingRef.current = false;
      addMessage({
        type: 'ai',
        content: "Here's the ticket preview:",
      });
      const preview = { ...res.data.ticketPreview, originalUserInput: duplicateData.originalUserInput || '' };
      setPreviewData(preview);
      addMessage({ type: 'preview-card', data: preview });
    } catch (err) {
      setIsLoading(false);
      isSendingRef.current = false;
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

  const startAccessFlow = async () => {
    setHasSelectedOption(true);
    let isActive = false;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:5000"}` + ""}` + '/api/access-requests/module-status');
      isActive = res.data.active;
      setAccessModuleActive(isActive);
    } catch (_) {
      setAccessModuleActive(false);
    }
    setCurrentMode('issue');
    if (isActive) {
      addMessage({ type: 'ai', content: 'Please fill out the access request form below.' });
      addMessage({ type: 'access-form' });
    } else {
      addMessage({ type: 'ai', content: 'Access Request module is currently not enabled. Please contact your administrator.' });
    }
  };

  const goBack = () => {
    setHasSelectedOption(false);
    setCurrentMode('issue');
    setMessages([
      {
        id: 'welcome',
        type: 'ai',
        content: "Hello! I'm your AI Support Agent. How can I help you today?",
        timestamp: new Date(),
      },
      {
        id: 'options',
        type: 'options',
        options: ['Raise Issue', 'Raise Request for Access'],
        timestamp: new Date(),
      },
    ]);
    setInputText('');
  };

  const formatContent = (content) => {
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

    if (msg.type === 'options') {
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20 shrink-0 self-start mt-1">
            <Bot className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex flex-col gap-3 w-full">
            {/* Raise Issue Card */}
            <button
              onClick={startIssueFlow}
              className="group w-full text-left bg-slate-800/80 hover:bg-indigo-600/15 border border-slate-700 hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-indigo-600/10"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-600/30 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">🛠️ Raise Issue</p>
                  <p className="text-xs text-slate-400 mt-0.5">Report IT problems like VPN, Jira, laptop issues</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 ml-auto transition-colors" />
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 h-px bg-slate-700/60" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">or</span>
              <div className="flex-1 h-px bg-slate-700/60" />
            </div>

            {/* Raise Access Card */}
            <button
              onClick={startAccessFlow}
              className="group w-full text-left bg-slate-800/80 hover:bg-indigo-600/15 border border-slate-700 hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-indigo-600/10"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-600/30 transition-colors">
                  <Send className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">🚀 Raise Request for Access</p>
                  <p className="text-xs text-slate-400 mt-0.5">Request new account or role access</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 ml-auto transition-colors" />
              </div>
            </button>
          </div>
        </div>
      );
    }

    // Category selection UI (rendered when issueFlowStep === 'categorySelection')
    if (msg.type === 'categorySelection') {
      const categories = [
        { name: 'Network', desc: 'VPN, Wi‑Fi, DNS, proxy, connectivity' },
        { name: 'Hardware / Desktop', desc: 'Laptop, printer, local apps, OS issues' },
        { name: 'Application', desc: 'Jira, Confluence, SAP, HRMS, portal issues' },
        { name: 'MFA / Login', desc: 'OTP, SSO, CIAM, authentication problems' },
        { name: 'Security', desc: 'Phishing, malware, endpoint policy, antivirus' },
        { name: 'Server / Infrastructure', desc: 'Servers, VMs, DB, storage, backup' },
        { name: 'Other / Not Sure', desc: 'Let AI decide' },
      ];
      return (
        <div key={msg.id} className="flex flex-col gap-4 animate-slide-up">
          <p className="text-sm text-white">Please select the type of issue you are facing.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => handleCategorySelect(c.name)}
                className="flex flex-col items-start p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition"
              >
                <p className="font-semibold text-white">{c.name}</p>
                <p className="text-xs text-slate-400 mt-1">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }


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

    if (msg.type === 'rag-card') {
      const d = msg.data;
      const isMaintenance = d.resolutionType === 'Maintenance / Vendor / Administrative Resolution';

      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">
            <div className={`backdrop-blur-md bg-slate-900/80 border border-indigo-500/30 rounded-xl p-5 mb-3 shadow-lg`}>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Matching Knowledge Base Solution
                </span>
                <span className="ml-auto text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Confidence: {d.confidence || 'Medium'}
                </span>
              </div>
              <div className="space-y-3">
                {d.matchType === 'possible' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-200">
                      This may be related based on a similar root cause or problem family, not necessarily the exact same application.
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Matching Knowledge Base Solution:</p>
                  <p className="text-sm font-semibold text-white">{d.kbIssueTitle || d.summary}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Root Cause:</p>
                  <p className="text-sm text-slate-200">{d.kbProvidedRootCause || (d.possibleRootCauses ? d.possibleRootCauses.join(', ') : 'N/A')}</p>
                </div>

                {isMaintenance ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Resolution Type:</p>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {d.resolutionType}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Current Status:</p>
                      <div className="text-sm text-slate-200 space-y-1">
                        {Array.isArray(d.kbProvidedResolutionSteps) && d.kbProvidedResolutionSteps.length > 0 ? (
                          d.kbProvidedResolutionSteps.map((step, i) => (
                            <p key={i} className="leading-relaxed">{step}</p>
                          ))
                        ) : (
                          <p className="leading-relaxed">{d.currentStatus || 'Maintenance in progress.'}</p>
                        )}
                      </div>
                    </div>

                    {d.expectedAvailability && (
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Expected Availability:</p>
                        <p className="text-sm font-semibold text-emerald-400">{d.expectedAvailability}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Resolution / Status:</p>
                      <ul className="list-decimal list-inside space-y-1">
                        {(d.kbProvidedResolutionSteps || d.recommendedSteps || []).filter(Boolean).map((step, i) => (
                          <li key={i} className="text-sm text-slate-300 leading-relaxed inline-block w-full">{i + 1}. {step}</li>
                        ))}
                      </ul>
                    </div>

                    {d.additionalNote && (
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Additional Note:</p>
                        <p className="text-sm text-slate-350 italic">"{d.additionalNote}"</p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <p className="text-xs text-slate-500 mb-0.5">User Action Required:</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    d.userActionRequired === 'Yes' 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {d.userActionRequired || 'No'}
                  </span>
                </div>

                {d.aiAddedExtraSteps && d.aiGeneratedSuggestions && d.aiGeneratedSuggestions.filter(Boolean).length > 0 && (
                  <div className="pt-2.5 border-t border-slate-800">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">AI Suggested Additional Checks:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {d.aiGeneratedSuggestions.filter(Boolean).map((sugg, i) => (
                        <li key={i} className="text-sm text-slate-300 leading-relaxed">{sugg}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {d.recommendedTeam && (
                  <div className="pt-2 border-t border-slate-800/40">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                      Recommended Team: {d.recommendedTeam}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRagSolved}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                I tried this and it worked
              </button>
              <button
                onClick={handleRagFailed}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Still not resolved - Create Ticket
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'rag-failed-actions') {
      const d = msg.data;
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[75%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCreateTicketAfterRagFailed(d)}
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

    if (msg.type === 'duplicate-card') {
      const d = msg.data;
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-scale-up" style={{ animationDelay: `${100}ms` }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">
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

    if (msg.type === 'preview-card') {
      const { ticketTitle, ticketDescription, category, assignedTeam, priority, confidenceScore, routingReason, userSelectedCategory } = msg.data;
      return (
        <div key={msg.id} className="flex flex-col gap-2 p-4 bg-slate-900 rounded-xl border border-slate-700/60 animate-slide-up" style={{ animationDelay: `${100}ms` }}>
          <p className="text-xs text-slate-500">Ticket Preview</p>
          <h3 className="text-sm font-semibold text-white">{ticketTitle}</h3>
          <p className="text-xs text-slate-300">{ticketDescription}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-2">
            <div>Category: {category}</div>
            <div>Assigned Team: {assignedTeam || 'Unassigned'}</div>
            <div>Priority: {priority}</div>
            <div>Confidence: {confidenceScore ? `${Math.round(confidenceScore * 100)}%` : 'N/A'}</div>
            {userSelectedCategory && <div>User Selected: {userSelectedCategory}</div>}
            {routingReason && <div className="col-span-2">Reason: {routingReason}</div>}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => handleCreateTicket(msg.data)} className="px-3 py-1.5 rounded bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-600/20">
              Create Ticket
            </button>
            <button onClick={() => handleEditTicket(msg.data)} className="px-3 py-1.5 rounded bg-blue-600/10 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/20">
              Edit Ticket
            </button>
            <button onClick={handleCancel} className="px-3 py-1.5 rounded bg-slate-600/10 border border-slate-500/30 text-slate-300 text-xs font-semibold hover:bg-slate-600/20">
              Cancel
            </button>
          </div>
        </div>
      );
    }
    // Duplicate ticket preview block removed
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

    if (msg.type === 'edit-form') {
      return (
        <div key={msg.id} className="flex items-start gap-3 max-w-[85%] animate-scale-up" style={{ animationDelay: '100ms' }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">
            <div className="backdrop-blur-md bg-slate-900/80 border border-amber-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
              <div className="flex items-center gap-2 mb-4 mt-1">
                <Pencil className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Edit Ticket Preview</span>
              </div>

              {editData && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Ticket Title</label>
                    <input
                      type="text"
                      value={editData.ticketTitle}
                      onChange={(e) => setEditData(prev => ({ ...prev, ticketTitle: e.target.value }))}
                      className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Description</label>
                    <textarea
                      value={editData.ticketDescription}
                      onChange={(e) => setEditData(prev => ({ ...prev, ticketDescription: e.target.value }))}
                      rows={3}
                      className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none text-sm resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Category</label>
                      <select
                        value={editData.category}
                        onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-amber-500 outline-none text-sm"
                      >
                        <option value="Desktop / Endpoint Support">Desktop / Endpoint Support</option>
                        <option value="Network / Connectivity">Network / Connectivity</option>
                        <option value="Application Support">Application Support</option>
                        <option value="Identity & Access">Identity & Access</option>
                        <option value="Security">Security</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Service Desk">Service Desk</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Assigned Team</label>
                      <select
                        value={editData.assignedTeam}
                        onChange={(e) => setEditData(prev => ({ ...prev, assignedTeam: e.target.value }))}
                        className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-amber-500 outline-none text-sm"
                      >
                        {teams.map(t => (
                          <option key={t._id} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Priority</label>
                      <select
                        value={editData.priority}
                        onChange={(e) => setEditData(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-amber-500 outline-none text-sm"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Additional Comments</label>
                    <textarea
                      value={editData.additionalComments}
                      onChange={(e) => setEditData(prev => ({ ...prev, additionalComments: e.target.value }))}
                      rows={2}
                      placeholder="Any extra details..."
                      className="w-full bg-slate-800 text-slate-100 rounded-lg px-3 py-2 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none text-sm resize-none placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
                      Re-analyze with AI
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'access-form') {
      return (
        <div key={msg.id} className="flex items-start gap-3 w-full animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="bg-emerald-600/20 p-2 rounded-lg border border-emerald-500/20 shrink-0 self-start mt-1">
            <Bot className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 w-full max-w-2xl">
            <AccessRequestForm
              onClose={goBack}
              onSuccess={() => {
                addMessage({ type: 'ai', content: 'Your access request has been submitted successfully.' });
                setHasSelectedOption(false);
              }}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 shrink-0 flex items-center justify-between">
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
        {currentMode && (
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowRight className="transform rotate-180 h-4 w-4" /> Back
          </button>
        )}
      </div>

      {/* Content Area */}
      {currentMode === null && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <h2 className="text-xl font-semibold text-white mb-6">How can we help you today?</h2>
          <div className="flex flex-col gap-4 w-full max-w-md">
            {/* Raise Issue Card */}
            <button
              onClick={startIssueFlow}
              className="group w-full text-left bg-slate-800/80 hover:bg-indigo-600/15 border border-slate-700 hover:border-indigo-500/40 rounded-xl p-5 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-indigo-600/10"
            >
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600/20 p-3 rounded-xl border border-indigo-500/20 group-hover:bg-indigo-600/30 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">🛠️ Raise Issue</p>
                  <p className="text-xs text-slate-400 mt-1">Report IT problems like VPN, Jira, laptop issues</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 px-4">
              <div className="flex-1 h-px bg-slate-700/60"></div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">or</span>
              <div className="flex-1 h-px bg-slate-700/60"></div>
            </div>

            {/* Raise Request for Access Card */}
            <button
              onClick={startAccessFlow}
              className="group w-full text-left bg-slate-800/80 hover:bg-emerald-600/15 border border-slate-700 hover:border-emerald-500/40 rounded-xl p-5 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-emerald-600/10"
            >
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600/20 p-3 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-600/30 transition-colors">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors">🔑 Raise Request for Access</p>
                  <p className="text-xs text-slate-400 mt-1">Request credentials, admin rights, or permissions</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          </div>
        </div>
      )}

      {currentMode === 'issue' && (
        <>
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
                  disabled={isLoading || !hasSelectedOption}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading || !hasSelectedOption}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 text-white p-3 rounded-xl border border-indigo-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-600/20 disabled:shadow-none shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              AI-powered analysis • Press Enter to send
            </p>
          </div>
        </>
      )}

    </div>
  );
};

export default RaiseRequest;
