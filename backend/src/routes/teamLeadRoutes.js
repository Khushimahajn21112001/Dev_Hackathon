// backend/src/routes/teamLeadRoutes.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');
const User = require('../models/User');
const Notification = require('../models/Notification');

// GET /api/team-lead/tickets - Gets all tickets for team where lead is teamLead
router.get('/tickets', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId query param required' });
  }

  try {
    const team = await Team.findOne({ teamLead: userId });
    if (!team) {
      return res.json({ tickets: [], teamMembers: [], team: null });
    }

    const tickets = await Ticket.find({ assignedTeam: team._id })
      .populate('raisedBy', 'username name email')
      .populate('assignedTeam', 'name')
      .populate('assignedTo', 'username name');

    const teamMembers = await User.find({ team: team._id, role: 'Support User' }, 'username name email');

    res.json({ tickets, teamMembers, team });
  } catch (err) {
    console.error('Team lead tickets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/team-lead/dashboard-stats - Gets dashboard stats for team lead
router.get('/dashboard-stats', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'userId query param required' });
  }

  try {
    const team = await Team.findOne({ teamLead: userId });
    if (!team) {
      return res.json({
        total: 0,
        unassigned: 0,
        inProgress: 0,
        closed: 0,
        teamName: 'No Team Assigned'
      });
    }

    const tickets = await Ticket.find({ assignedTeam: team._id });
    const total = tickets.length;
    const unassigned = tickets.filter(t => t.status === 'Open' || (t.status === 'Assigned' && !t.assignedTo)).length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const closed = tickets.filter(t => t.status === 'Closed').length;

    res.json({
      total,
      unassigned,
      inProgress,
      closed,
      teamName: team.name
    });
  } catch (err) {
    console.error('Team lead stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/team-lead/tickets/:ticketId/assign - Assigns a ticket to a support user in the lead's team
router.patch('/tickets/:ticketId/assign', async (req, res) => {
  const { ticketId } = req.params;
  const { assignedToId } = req.body; // User ID

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    let assignedUser = null;
    if (assignedToId) {
      assignedUser = await User.findById(assignedToId);
      if (!assignedUser) {
        return res.status(404).json({ message: 'Support User not found' });
      }
      ticket.assignedTo = assignedToId;
      ticket.status = 'In Progress';
    } else {
      ticket.assignedTo = null;
      ticket.status = 'Open';
    }

    ticket.updatedAt = Date.now();
    await ticket.save();

    // Populate ticket for return
    const populatedTicket = await Ticket.findById(ticketId)
      .populate('raisedBy', 'username')
      .populate('assignedTeam', 'name')
      .populate('assignedTo', 'username');

    // Create notifications
    if (populatedTicket.raisedBy) {
      let msg = `Your ticket #${populatedTicket.ticketNumber} has been updated.`;
      if (assignedUser) {
        msg = `Your ticket #${populatedTicket.ticketNumber} has been assigned to ${assignedUser.name || assignedUser.username} and is now In Progress.`;
      }
      await Notification.create({
        userId: populatedTicket.raisedBy._id,
        message: msg,
        ticketId: populatedTicket._id,
      });
    }

    if (assignedUser) {
      await Notification.create({
        userId: assignedUser._id,
        message: `Ticket #${populatedTicket.ticketNumber} has been assigned to you.`,
        ticketId: populatedTicket._id,
      });
    }

    res.json({ success: true, ticket: populatedTicket });
  } catch (err) {
    console.error('Team lead assign error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
