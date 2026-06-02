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

// Delete team
router.delete('/teams/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const team = await Team.findByIdAndDelete(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    // Set users belonging to this team to have no team
    await User.updateMany({ team: id }, { team: null });
    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Delete team error:', err);
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

    const User = require('../models/User');
    const Notification = require('../models/Notification');
    const corporateUser = await User.findById(raisedBy);
    const corpName = corporateUser ? (corporateUser.name || corporateUser.username) : 'Corporate User';
    
    const admins = await User.find({ role: 'Admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        message: `New ticket created by ${corpName} - Ticket #${ticket.ticketNumber}`,
        ticketId: ticket._id
      });
    }

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
      let msg = `Your ticket #${ticket.ticketNumber} has been updated.`;
      if (assignedToId) {
        msg = `Your ticket #${ticket.ticketNumber} has been assigned to ${ticket.assignedTo.name || ticket.assignedTo.username}.`;
      }
      await Notification.create({
        userId: ticket.raisedBy._id,
        message: msg,
        ticketId: ticket._id,
      });

      if (assignedToId) {
        await Notification.create({
          userId: assignedToId,
          message: `Ticket #${ticket.ticketNumber} has been assigned to you.`,
          ticketId: ticket._id,
        });
      }
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
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId, 
      { status: 'Closed', rootCause, resolutionSteps: steps, reusableFix: reusable }, 
      { new: true }
    ).populate('assignedTeam', 'name');

    // If reusable, add to ResolutionKB
    if (reusable) {
      const ResolutionKB = require('../models/ResolutionKB');
      const { extractKbMetadata } = require('../services/ragService');
      const { generateEmbedding } = require('../utils/aiMatching');

      const issueTitle = rootCause || ticket.issueDescription;
      
      // 1. Extract metadata
      const metadata = await extractKbMetadata(
        issueTitle,
        rootCause,
        steps,
        ticket.category,
        ticket.assignedTeam?.name
      );

      // 2. Generate embedding (combining title, cause, and problem family)
      const textToEmbed = `${issueTitle} ${rootCause} ${metadata?.problemFamily || ''}`;
      const embedding = await generateEmbedding(textToEmbed);

      // 3. Create KB record
      await ResolutionKB.create({
        issueTitle: issueTitle,
        knownFixSteps: steps, // ensure we save into knownFixSteps, not steps
        rootCause,
        category: ticket.category,
        assignedTeam: ticket.assignedTeam?._id,
        solvedCount: 1,
        embedding: embedding || [],
        
        // AI Extracted fields
        applicationNames: metadata?.applicationNames || [],
        errorMessages: metadata?.errorMessages || [],
        rootCauseCategory: metadata?.rootCauseCategory || '',
        problemFamily: metadata?.problemFamily || '',
        policyTool: metadata?.policyTool || '',
        affectedLayer: metadata?.affectedLayer || '',
        symptoms: metadata?.symptoms || [],
        resolutionType: metadata?.resolutionType || '',
        tags: metadata?.tags || []
      });
    }
    res.json({ ticket });
  } catch (err) {
    console.error('Close ticket error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
