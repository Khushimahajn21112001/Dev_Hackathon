import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Sparkles, MessageCircle } from 'lucide-react';
import LoadingSpinner from './UI/LoadingSpinner';

const ChatBox = ({ ticketId, recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const userId = localStorage.getItem('userId');

  const fetchChats = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/chats/${ticketId}`);
      setMessages(response.data.chats);
    } catch (err) {
      console.error('Error fetching chats', err);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !recipientId) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      await axios.post('http://localhost:5000/api/chats/send', {
        ticketId,
        senderId: userId,
        receiverId: recipientId,
        message: messageText,
      });
      fetchChats();
    } catch (err) {
      console.error('Send error', err);
    }
  };

  return (
    <div className="glass rounded-2xl flex flex-col h-[400px] overflow-hidden shadow-xl border border-slate-700/50">
      {/* Chat Header with gradient */}
      <div className="relative px-5 py-3.5 border-b border-slate-800/70 flex items-center justify-between shrink-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-400/40 animate-ping" />
          </div>
          <span className="text-sm font-bold text-slate-200">Live Session Chat</span>
        </div>
        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800/60">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          Encrypted
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <div className="h-12 w-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3">
              <MessageCircle className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId?._id === userId || msg.senderId === userId;
            return (
              <div
                key={msg._id}
                className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[10px] font-semibold text-slate-500 mb-1 px-1.5">
                  {msg.senderId?.username || 'User'}
                </span>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-md'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-md'
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] text-slate-600 mt-1 px-1.5">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-800/60 flex gap-2 shrink-0 bg-slate-900/40">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={recipientId ? "Type a reply..." : "Waiting for assignment..."}
          disabled={!recipientId}
          className="flex-1 px-4 py-2.5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 input-glow"
        />
        <button
          type="submit"
          disabled={!recipientId || !newMessage.trim()}
          className="p-2.5 btn-gradient disabled:opacity-40 disabled:pointer-events-none disabled:bg-slate-800 disabled:shadow-none text-white rounded-xl flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
