import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../UI/Navbar';
import Sidebar from '../UI/Sidebar';
import TicketList from '../TicketList';
import TicketDetail from '../TicketDetail';
import { Filter, Sparkles, FolderArchive, ArrowRight } from 'lucide-react';

const SupportDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const fetchTeams = async () => {
    // We can fetch seeded teams. Since we don't have a direct teams route, let's aggregate teams from tickets or fetch them.
    // Wait, let's create an endpoint on backend? Or we can query MongoDB in ticket list or just default list.
    // Actually, we can get list of all tickets and read teams off them, or just list all tickets. Let's fetch all tickets for the dashboard!
    try {
      // Let's get all tickets first
      const response = await axios.get('http://localhost:5000/api/tickets', {
        params: { role: 'Admin' }, // support user can view all to choose team
      });
      const t = response.data.tickets;
      setTickets(t);
      // Aggregate teams
      const uniqueTeams = [];
      const teamMap = new Map();
      t.forEach((ticket) => {
        if (ticket.assignedTeam && !teamMap.has(ticket.assignedTeam._id)) {
          teamMap.set(ticket.assignedTeam._id, true);
          uniqueTeams.push(ticket.assignedTeam);
        }
      });
      setTeams(uniqueTeams);
      if (uniqueTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(uniqueTeams[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFilteredTickets = async () => {
    setLoading(true);
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    try {
      const response = await axios.get('http://localhost:5000/api/tickets', {
        params: { role, userId, teamId: selectedTeamId },
      });
      setTickets(response.data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchFilteredTickets();
    }
  }, [selectedTeamId]);

  const handleUpdateTicket = (updatedTicket) => {
    setSelectedTicket(updatedTicket);
    fetchFilteredTickets();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              userRole="Support User"
              onBack={() => setSelectedTicket(null)}
              onUpdate={handleUpdateTicket}
            />
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Support Queue Console</h1>
                  <p className="text-sm text-slate-400 mt-1.5">
                    Review and triage tickets routed to support squads.
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-200 focus:outline-none cursor-pointer pr-4 font-semibold"
                  >
                    <option value="" className="bg-slate-900">Select Support Squad</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id} className="bg-slate-900">
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-200">Incoming Workload Queue</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400">
                      Active: {tickets.length}
                    </span>
                  </div>
                  <TicketList
                    tickets={tickets}
                    loading={loading}
                    onSelectTicket={(ticket) => setSelectedTicket(ticket)}
                  />
                </div>

                <div className="lg:col-span-1 space-y-6">
                  {/* System Summary Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Queue Metrics</h3>
                    </div>
                    <div className="space-y-3.5 mt-2">
                      <div className="flex justify-between items-center text-xs border-b border-slate-850 pb-2">
                        <span className="text-slate-500">Unassigned Tickets</span>
                        <span className="font-bold text-slate-300">
                          {tickets.filter((t) => t.status === 'Open').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-850 pb-2">
                        <span className="text-slate-500">Active Handled</span>
                        <span className="font-bold text-indigo-400">
                          {tickets.filter((t) => t.status === 'Assigned' || t.status === 'In Progress').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Closed Tickets</span>
                        <span className="font-bold text-emerald-400">
                          {tickets.filter((t) => t.status === 'Closed').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SupportDashboard;
