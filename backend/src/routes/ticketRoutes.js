// backend/src/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Team = require('../models/Team');
const TicketLog = require('../models/TicketLog');

// Get all support users
router.get('/support-users', async (req, res) => {
  try {
    const users = await User.find({ role: 'Support User' }, 'username');
    res.json({ users });
  } catch (err) {
    console.error('Get support users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all teams (populated with teamLead and totalMembers counted)
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find({}).populate('teamLead', 'username name email');
    
    // For each team, count users assigned to it
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const totalMembers = await User.countDocuments({ team: team._id, role: 'Support User' });
        return {
          ...team.toObject(),
          totalMembers,
        };
      })
    );

    res.json({ teams: teamsWithMembers });
  } catch (err) {
    console.error('Get teams error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all team leads
router.get('/team-leads', async (req, res) => {
  try {
    const leads = await User.find({ role: 'Team Lead' }, 'username name email');
    res.json({ leads });
  } catch (err) {
    console.error('Get team leads error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create team
router.post('/teams', async (req, res) => {
  const { name, description, teamLead } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Team name is required' });
  }
  try {
    const team = await Team.create({
      name,
      teamName: name,
      description: description || '',
      teamLead: teamLead || null,
      status: 'Active'
    });

    if (teamLead) {
      await User.findByIdAndUpdate(teamLead, { team: team._id });
    }

    const populatedTeam = await Team.findById(team._id).populate('teamLead', 'username name email');
    res.json({ success: true, team: { ...populatedTeam.toObject(), totalMembers: 0 } });
  } catch (err) {
    console.error('Create team error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Team name must be unique' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update team
router.put('/teams/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, teamLead, status } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.teamName = name;
    }
    if (description !== undefined) updateData.description = description;
    if (teamLead !== undefined) updateData.teamLead = teamLead || null;
    if (status !== undefined) updateData.status = status;

    const team = await Team.findByIdAndUpdate(id, updateData, { new: true })
      .populate('teamLead', 'username name email');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (teamLead) {
      await User.findByIdAndUpdate(teamLead, { team: team._id });
    }

    const totalMembers = await User.countDocuments({ team: team._id, role: 'Support User' });
    res.json({ success: true, team: { ...team.toObject(), totalMembers } });
  } catch (err) {
    console.error('Update team error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle team status
router.patch('/teams/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const team = await Team.findByIdAndUpdate(id, { status }, { new: true })
      .populate('teamLead', 'username name email');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const totalMembers = await User.countDocuments({ team: team._id, role: 'Support User' });
    res.json({ success: true, team: { ...team.toObject(), totalMembers } });
  } catch (err) {
    console.error('Toggle team status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create ticket (used by issue analysis when no match)
router.post('/create', async (req, res) => {
  const { raisedBy, issueDescription, category, priority, assignedTeam } = req.body;
  if (!raisedBy || !issueDescription) {
    return res.status(400).json({ message: 'raisedBy and issueDescription required' });
  }
  try {
    const ticketNumber = 'TICK-' + Date.now();
    const ticket = await Ticket.create({
      ticketNumber,
      ticketTitle: issueDescription.length > 50 ? issueDescription.slice(0, 50) + '...' : issueDescription,
      raisedBy,
      issueDescription,
      originalUserInput: issueDescription,
      category,
      priority: priority || 'Medium',
      assignedTeam,
      status: 'Open',
    });
    res.json({ ticket });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tickets (filter by role/team/user)
router.get('/', async (req, res) => {
  const { role, userId, teamId } = req.query; // simple query params
  try {
    let filter = {};
    if (role === 'Corporate User') {
      filter.raisedBy = userId;
    } else if (role === 'Support User' && teamId) {
      filter.assignedTeam = teamId;
    } else if (role === 'Admin') {
      // no filter – admin sees all
    }
    const tickets = await Ticket.find(filter)
      .populate('raisedBy', 'username role')
      .populate('assignedTeam', 'name')
      .populate('assignedTo', 'username');
    res.json({ tickets });
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get logs for a specific ticket
router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await TicketLog.find({ ticketId: req.params.id })
      .populate('performedBy', 'username name role')
      .sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    console.error('Get ticket logs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Support user picks a ticket (assign themselves)
router.patch('/pick/:id', async (req, res) => {
  const ticketId = req.params.id;
  const { supportUserId } = req.body;
  if (!supportUserId) return res.status(400).json({ message: 'supportUserId required' });
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { status: 'Assigned', assignedTo: supportUserId },
      { new: true }
    )
      .populate('raisedBy', 'username')
      .populate('assignedTeam', 'name')
      .populate('assignedTo', 'username');
    res.json({ ticket });
  } catch (err) {
    console.error('Pick ticket error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin or Support reassigns/assigns a ticket to a team and/or support user
router.patch('/assign/:id', async (req, res) => {
  const ticketId = req.params.id;
  const { assignedTeamId, assignedToId } = req.body;
  try {
    const updateData = {};
    if (assignedTeamId !== undefined) {
      updateData.assignedTeam = assignedTeamId || null;
    }
    if (assignedToId !== undefined) {
      updateData.assignedTo = assignedToId || null;
      if (assignedToId) {
        updateData.status = 'Assigned';
      } else {
        updateData.status = 'Open';
      }
    }
    updateData.updatedAt = Date.now();

    const ticket = await Ticket.findByIdAndUpdate(ticketId, updateData, { new: true })
      .populate('raisedBy', 'username')
      .populate('assignedTeam', 'name')
      .populate('assignedTo', 'username');

    // Create a notification for the user who raised it
    if (ticket) {
      const Notification = require('../models/Notification');
      let msg = `Your ticket ${ticket.ticketNumber} has been updated.`;
      if (assignedToId) {
        msg = `Your ticket ${ticket.ticketNumber} has been assigned to a support agent.`;
      }
      await Notification.create({
        userId: ticket.raisedBy._id,
        message: msg,
        ticketId: ticket._id,
      });
    }

    res.json({ ticket });
  } catch (err) {
    console.error('Assign ticket error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Close ticket with learning data
router.patch('/close/:id', async (req, res) => {
  const ticketId = req.params.id;
  const { rootCause, steps, reusable } = req.body;
  try {
    const ticket = await Ticket.findByIdAndUpdate(ticketId, { status: 'Closed' }, { new: true });
    // If reusable, add to ResolutionKB
    if (reusable) {
      const ResolutionKB = require('../models/ResolutionKB');
      await ResolutionKB.create({
        issueTitle: rootCause || ticket.issueDescription,
        steps,
        solvedCount: 1,
      });
    }
    res.json({ ticket });
  } catch (err) {
    console.error('Close ticket error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
