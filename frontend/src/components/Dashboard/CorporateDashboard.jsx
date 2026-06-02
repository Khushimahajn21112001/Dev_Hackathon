import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';
import IssueAnalyzer from '../IssueAnalyzer';
import TicketList from '../TicketList';
import TicketDetail from '../TicketDetail';

const CorporateDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    try {
      const response = await axios.get('http://localhost:5000/api/tickets', {
        params: { role, userId },
      });
      setTickets(response.data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleTicketCreated = () => {
    fetchTickets();
  };

  const handleUpdateTicket = (updatedTicket) => {
    setSelectedTicket(updatedTicket);
    fetchTickets();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              userRole="Corporate User"
              onBack={() => setSelectedTicket(null)}
              onUpdate={handleUpdateTicket}
            />
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Corporate Help Desk</h1>
                <p className="text-sm text-slate-400 mt-1.5">
                  Analyze issues automatically using AI or review your pending tickets.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <div className="xl:col-span-1">
                  <IssueAnalyzer onTicketCreated={handleTicketCreated} />
                </div>
                <div className="xl:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-200">My Support Tickets</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400">
                      Total: {tickets.length}
                    </span>
                  </div>
                  <TicketList
                    tickets={tickets}
                    loading={loading}
                    onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CorporateDashboard;
