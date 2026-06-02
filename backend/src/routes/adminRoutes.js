// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const TicketLog = require('../models/TicketLog');
const Notification = require('../models/Notification');
const ResolutionKB = require('../models/ResolutionKB');
const { upsertResolutionKB } = require('../utils/kbHelper');

// Helper to log ticket actions
async function logTicketAction({ ticketId, action, oldStatus, newStatus, performedBy, remarks }) {
  await TicketLog.create({ ticketId, action, oldStatus: oldStatus || '', newStatus: newStatus || '', performedBy, remarks: remarks || '' });
}

// Helper to send notifications
async function notify(userId, message, ticketId) {
  if (!userId) return;
  await Notification.create({ userId, message, ticketId });
}

// POST /api/admin/teams - Create a team
router.post('/teams', async (req, res) => {
  try {
    const { name, teamName, description, teamLead, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const nameToUse = name;
    const teamNameToUse = teamName || name;

    const team = new Team({
      name: nameToUse,
      teamName: teamNameToUse,
      description,
      teamLead: teamLead || undefined,
      status: status || 'Active'
    });

    await team.save();

    // If a team lead is assigned during creation, associate that user with this team
    if (teamLead) {
      await User.findByIdAndUpdate(teamLead, { team: team._id });
    }

    res.status(201).json({ message: 'Team created successfully', team });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/admin/teams - Fetch all teams with populated teamLead and dynamic memberCounts
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find({}).populate('teamLead', 'username name email');
    
    const teamsWithMemberCounts = await Promise.all(teams.map(async (team) => {
      const memberCount = await User.countDocuments({ team: team._id });
      return {
        ...team.toObject(),
        memberCount
      };
    }));

    res.json({ teams: teamsWithMemberCounts });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/admin/teams/:id - Edit team details
router.put('/teams/:id', async (req, res) => {
  try {
    const { name, teamName, description, teamLead, status } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (name !== undefined) team.name = name;
    if (teamName !== undefined) team.teamName = teamName;
    if (description !== undefined) team.description = description;
    if (teamLead !== undefined) team.teamLead = teamLead || null;
    if (status !== undefined) team.status = status;

    await team.save();

    // If teamLead is updated, update that user's team field as well
    if (teamLead) {
      await User.findByIdAndUpdate(teamLead, { team: team._id });
    }

    res.json({ message: 'Team updated successfully', team });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PATCH /api/admin/teams/:id/deactivate - Toggle team status
router.patch('/teams/:id/deactivate', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    team.status = team.status === 'Active' ? 'Inactive' : 'Active';
    await team.save();

    res.json({ message: `Team status toggled to ${team.status}`, team });
  } catch (error) {
    console.error('Error toggling team status:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// --------------------------------------------------------------------------
// USER MANAGEMENT ENDPOINTS
// --------------------------------------------------------------------------

// POST /api/admin/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const { username, password, name, email, role, team, status } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new User({
      username,
      password,
      name: name || '',
      email: email || '',
      role,
      team: team || undefined,
      status: status || 'Active'
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/admin/users - Fetch all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).populate('team', 'name');
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/admin/users/:id - Edit user details
router.put('/users/:id', async (req, res) => {
  try {
    const { username, password, name, email, role, team, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username !== undefined) user.username = username;
    if (password !== undefined && password !== '') user.password = password;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (team !== undefined) user.team = team || null;
    if (status !== undefined) user.status = status;

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PATCH /api/admin/users/:id/status - Toggle user status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    await user.save();

    res.json({ message: `User status toggled to ${user.status}`, user });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'Admin') {
      return res.status(403).json({ error: 'Cannot delete an Admin user' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    // Clean up references
    if (user.role === 'Team Lead') {
      await Team.updateMany({ teamLead: user._id }, { teamLead: null });
    }
    if (user.role === 'Support User') {
      await Ticket.updateMany({ assignedTo: user._id }, { assignedTo: null, status: 'Open' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// --------------------------------------------------------------------------
// TICKETS AND KB ENDPOINTS
// --------------------------------------------------------------------------

// PATCH /api/admin/tickets/:ticketId/force-close - Force close a ticket
router.patch('/tickets/:ticketId/force-close', async (req, res) => {
  const { ticketId } = req.params;
  const { forceCloseReason, adminUserId } = req.body;

  if (!forceCloseReason) {
    return res.status(400).json({ message: 'forceCloseReason is required' });
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;
    ticket.status = 'Closed';
    ticket.forceClosed = true;
    ticket.forceCloseReason = forceCloseReason;
    ticket.closedAt = new Date();
    ticket.closedBy = adminUserId;
    ticket.updatedAt = new Date();
    await ticket.save();

    // Log the action
    await logTicketAction({
      ticketId: ticket._id,
      action: 'Force closed by Admin',
      oldStatus,
      newStatus: 'Closed',
      performedBy: adminUserId,
      remarks: forceCloseReason,
    });

    // Notify corporate user
    await notify(
      ticket.raisedBy,
      `Your ticket ${ticket.ticketNumber} has been force-closed by Admin. Reason: ${forceCloseReason}`,
      ticket._id
    );

    // Attempt to upsert KB if reusable fix details exist
    await upsertResolutionKB(ticket);

    const populated = await Ticket.findById(ticket._id)
      .populate('raisedBy', 'username name')
      .populate('assignedTeam', 'name')
      .populate('assignedTo', 'username name')
      .populate('closedBy', 'username');

    res.json({ success: true, ticket: populated });
  } catch (error) {
    console.error('Error force closing ticket:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/admin/resolution-kb - Fetch all KB entries
router.get('/resolution-kb', async (req, res) => {
  try {
    const kbs = await ResolutionKB.find({})
      .populate('assignedTeam', 'name')
      .sort({ lastUpdatedAt: -1 });
    res.json({ kbs });
  } catch (error) {
    console.error('Error fetching resolution KB:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

module.exports = router;
