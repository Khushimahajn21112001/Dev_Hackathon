// backend/src/routes/supportRoutes.js
const express = require('express');
const router  = express.Router();
const Ticket       = require('../models/Ticket');
const Notification = require('../models/Notification');
const TicketLog    = require('../models/TicketLog');
const ResolutionKB = require('../models/ResolutionKB');
const { upsertResolutionKB } = require('../utils/kbHelper');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Create a TicketLog entry for any status change or action */
async function logTicketAction({ ticketId, action, oldStatus, newStatus, performedBy, remarks }) {
  await TicketLog.create({ ticketId, action, oldStatus: oldStatus || '', newStatus: newStatus || '', performedBy, remarks: remarks || '' });
}

/** Send an in-app notification */
async function notify(userId, message, ticketId) {
  if (!userId) return;
  await Notification.create({ userId, message, ticketId });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/support/tickets
// Returns tickets assigned to the logged-in support user.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tickets', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'userId query param required' });

  try {
    const tickets = await Ticket.find({ assignedTo: userId })
      .populate('raisedBy',     'username name email')
      .populate('assignedTeam', 'name')
      .populate('assignedTo',   'username name')
      .sort({ updatedAt: -1 });

    res.json({ tickets });
  } catch (err) {
    console.error('Support tickets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/support/tickets/:ticketId/start
// Support user starts working on a ticket → status: In Progress
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tickets/:ticketId/start', async (req, res) => {
  const { ticketId } = req.params;
  const { supportUserId } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;
    ticket.status    = 'In Progress';
    ticket.updatedAt = new Date();
    await ticket.save();

    // Log the action
    await logTicketAction({
      ticketId: ticket._id,
      action: 'Support user started working on ticket',
      oldStatus,
      newStatus: 'In Progress',
      performedBy: supportUserId,
    });

    // Notify corporate user that their ticket is being worked on
    await notify(
      ticket.raisedBy,
      `Your ticket ${ticket.ticketNumber} is now being worked on by our support team.`,
      ticket._id
    );

    const populated = await Ticket.findById(ticket._id)
      .populate('raisedBy',     'username name')
      .populate('assignedTeam', 'name')
      .populate('assignedTo',   'username name');

    res.json({ success: true, ticket: populated });
  } catch (err) {
    console.error('Start ticket error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/support/tickets/:ticketId/provide-resolution
// Support user submits resolution → status: Pending User Confirmation
// Body: { rootCause, resolutionSteps, reusableFix, internalNote, supportUserId }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tickets/:ticketId/provide-resolution', async (req, res) => {
  const { ticketId } = req.params;
  const { rootCause, resolutionSteps, reusableFix, internalNote, supportUserId } = req.body;

  // Validate mandatory fields
  if (!rootCause || !resolutionSteps) {
    return res.status(400).json({ message: 'rootCause and resolutionSteps are required' });
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;

    // Save resolution details
    ticket.rootCause                  = rootCause;
    ticket.resolutionSteps            = resolutionSteps;
    ticket.reusableFix                = reusableFix === true || reusableFix === 'true';
    ticket.internalNote               = internalNote || '';
    ticket.status                     = 'Pending User Confirmation';
    ticket.pendingUserConfirmationAt  = new Date();
    ticket.userConfirmationStatus     = 'pending';
    ticket.updatedAt                  = new Date();
    await ticket.save();

    // Log the action
    await logTicketAction({
      ticketId: ticket._id,
      action: 'Support user provided resolution — awaiting corporate confirmation',
      oldStatus,
      newStatus: 'Pending User Confirmation',
      performedBy: supportUserId,
      remarks: `Root Cause: ${rootCause}`,
    });

    // Notify the corporate user with the resolution steps
    await notify(
      ticket.raisedBy,
      `Resolution steps have been provided for Ticket #${ticket.ticketNumber}. Please confirm if the issue is resolved.`,
      ticket._id
    );

    const populated = await Ticket.findById(ticket._id)
      .populate('raisedBy',     'username name email')
      .populate('assignedTeam', 'name')
      .populate('assignedTo',   'username name');

    res.json({ success: true, ticket: populated });
  } catch (err) {
    console.error('Provide resolution error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/support/tickets/:ticketId/force-close
// Support user force-closes a ticket (with reason) — also in adminRoutes
// Body: { forceCloseReason, supportUserId }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tickets/:ticketId/force-close', async (req, res) => {
  const { ticketId } = req.params;
  const { forceCloseReason, supportUserId } = req.body;

  if (!forceCloseReason) {
    return res.status(400).json({ message: 'forceCloseReason is required' });
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;
    ticket.status          = 'Closed';
    ticket.forceClosed     = true;
    ticket.forceCloseReason = forceCloseReason;
    ticket.closedAt        = new Date();
    ticket.closedBy        = supportUserId;
    ticket.updatedAt       = new Date();
    await ticket.save();

    // Log
    await logTicketAction({
      ticketId: ticket._id,
      action: 'Force closed by support user',
      oldStatus,
      newStatus: 'Closed',
      performedBy: supportUserId,
      remarks: forceCloseReason,
    });

    // Notify corporate user
    await notify(
      ticket.raisedBy,
      `Your ticket #${ticket.ticketNumber} has been closed successfully.`,
      ticket._id
    );

    // Notify admins
    const User = require('../models/User');
    const supportUserObj = await User.findById(supportUserId);
    const supportName = supportUserObj ? (supportUserObj.name || supportUserObj.username) : 'Support User';
    const admins = await User.find({ role: 'Admin' });
    for (const admin of admins) {
      await notify(admin._id, `Ticket #${ticket.ticketNumber} has been closed by ${supportName}`, ticket._id);
    }

    // Try KB upsert if data is available
    await upsertResolutionKB(ticket);

    const populated = await Ticket.findById(ticket._id)
      .populate('raisedBy',     'username name')
      .populate('assignedTeam', 'name')
      .populate('assignedTo',   'username name');

    res.json({ success: true, ticket: populated });
  } catch (err) {
    console.error('Force close error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
