import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, User, Sparkles } from 'lucide-react';
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
    // Poll every 3 seconds for simple real-time updates
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    // Scroll to bottom on load or new message
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[400px] overflow-hidden shadow-lg">
      <div className="bg-slate-950 p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-semibold text-slate-200">Active Session Chat</span>
        </div>
        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          End-to-end Encrypted
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-900/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
            <User className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-400">No messages yet</p>
            <p className="text-xs mt-0.5">Send a message to initiate conversation with agent.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId?._id === userId || msg.senderId === userId;
            return (
              <div
                key={msg._id}
                className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[10px] font-semibold text-slate-500 mb-1 px-1">
                  {msg.senderId?.username || 'User'}
                </span>
                <div
                  className={`p-3 rounded-2xl text-sm shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-850 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] text-slate-600 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="bg-slate-950/80 p-3.5 border-t border-slate-800/80 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={recipientId ? "Type a reply..." : "Waiting for support assignment..."}
          disabled={!recipientId}
          className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!recipientId || !newMessage.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl shadow-md transition duration-150 flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
