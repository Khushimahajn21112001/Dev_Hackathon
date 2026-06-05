// backend/src/routes/accessRequestRoutes.js
const express = require('express');
const router = express.Router();
const AccessRequest = require('../models/AccessRequest');
const Team = require('../models/Team');
const User = require('../models/User');
const Notification = require('../models/Notification');

// --------------------------------------------------------------------------
// HELPER: check if Access Request module is active
// Module is active when Credential Access Team + a Credential Admin are both Active
// --------------------------------------------------------------------------
async function isModuleActive() {
  const team = await Team.findOne({ name: 'Credential Access Team', status: 'Active' });
  if (!team) return false;
  const admin = await User.findOne({ role: 'Credential Admin', status: 'Active' });
  return !!admin;
}

// --------------------------------------------------------------------------
// GET /api/access-requests/module-status
// Returns whether the Access Request module is currently active
// --------------------------------------------------------------------------
router.get('/module-status', async (req, res) => {
  try {
    const active = await isModuleActive();
    res.json({ active });
  } catch (err) {
    console.error('Error checking module status:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// POST /api/access-requests
// Corporate User raises a new access request
// Body: { raisedBy, accessType, title, description, targetResource, justification, urgency }
// --------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const active = await isModuleActive();
    if (!active) {
      return res.status(503).json({ error: 'Access Request module is currently inactive.' });
    }

    const { raisedBy, accessType, title, description, targetResource, justification, urgency } = req.body;

    if (!raisedBy || !accessType || !title || !description) {
      return res.status(400).json({ error: 'raisedBy, accessType, title, and description are required.' });
    }

    const request = await AccessRequest.create({
      raisedBy,
      accessType,
      title,
      description,
      targetResource: targetResource || '',
      justification: justification || '',
      urgency: urgency || 'Medium',
      status: 'Pending'
    });

    // Notify all active Credential Admins
    const credAdmins = await User.find({ role: 'Credential Admin', status: 'Active' });
    for (const admin of credAdmins) {
      await Notification.create({
        userId: admin._id,
        message: `New Access Request ${request.requestNumber}: "${title}" raised by a corporate user.`,
      });
    }

    res.status(201).json({ success: true, request });
  } catch (err) {
    console.error('Error creating access request:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// GET /api/access-requests/my/:userId
// Corporate user views their own access requests
// --------------------------------------------------------------------------
router.get('/my/:userId', async (req, res) => {
  try {
    const requests = await AccessRequest.find({ raisedBy: req.params.userId })
      .populate('handledBy', 'username name')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// GET /api/access-requests
// Credential Admin views all access requests (with optional status filter)
// Query: ?status=Pending|In Review|Approved|Rejected|Fulfilled
// --------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const requests = await AccessRequest.find(filter)
      .populate('raisedBy', 'username name email')
      .populate('handledBy', 'username name')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error('Error fetching all requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// GET /api/access-requests/:id
// Get a single access request by ID
// --------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id)
      .populate('raisedBy', 'username name email')
      .populate('handledBy', 'username name');

    if (!request) return res.status(404).json({ error: 'Access request not found' });
    res.json({ request });
  } catch (err) {
    console.error('Error fetching request:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// PATCH /api/access-requests/:id/review
// Credential Admin marks as "In Review"
// Body: { handledBy, internalNotes? }
// --------------------------------------------------------------------------
router.patch('/:id/review', async (req, res) => {
  try {
    const { handledBy, internalNotes } = req.body;
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });

    request.status = 'In Review';
    request.handledBy = handledBy;
    request.reviewedAt = new Date();
    if (internalNotes) request.internalNotes = internalNotes;

    await request.save();

    // Notify the corporate user
    await Notification.create({
      userId: request.raisedBy,
      message: `Your access request ${request.requestNumber} ("${request.title}") is now being reviewed.`,
    });

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error marking in review:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// PATCH /api/access-requests/:id/approve
// Credential Admin approves the request
// Body: { handledBy, adminRemarks, internalNotes? }
// --------------------------------------------------------------------------
router.patch('/:id/approve', async (req, res) => {
  try {
    const { handledBy, adminRemarks, internalNotes } = req.body;
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });

    request.status = 'Approved';
    request.handledBy = handledBy;
    request.adminRemarks = adminRemarks || '';
    if (internalNotes) request.internalNotes = internalNotes;
    request.reviewedAt = request.reviewedAt || new Date();
    request.approvedAt = new Date();

    await request.save();

    // Notify the corporate user (do NOT include credentials in the notification)
    await Notification.create({
      userId: request.raisedBy,
      message: `Your access request ${request.requestNumber} ("${request.title}") has been approved. ${adminRemarks ? 'Note: ' + adminRemarks : 'Please follow up with the Credential Admin for next steps.'}`,
    });

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// PATCH /api/access-requests/:id/reject
// Credential Admin rejects the request
// Body: { handledBy, adminRemarks }
// --------------------------------------------------------------------------
router.patch('/:id/reject', async (req, res) => {
  try {
    const { handledBy, adminRemarks } = req.body;
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });

    request.status = 'Rejected';
    request.handledBy = handledBy;
    request.adminRemarks = adminRemarks || 'Request rejected.';
    request.reviewedAt = new Date();

    await request.save();

    // Notify the corporate user
    await Notification.create({
      userId: request.raisedBy,
      message: `Your access request ${request.requestNumber} ("${request.title}") has been rejected. Reason: ${request.adminRemarks}`,
    });

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// PATCH /api/access-requests/:id/assign
// Admin assigns the request to a specific Credential Admin
// Body: { assignedTo, assignedBy }
// --------------------------------------------------------------------------
router.patch('/:id/assign', async (req, res) => {
  try {
    const { assignedTo, assignedBy } = req.body;
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });

    request.handledBy = assignedTo;
    if (request.status === 'Pending') {
      request.status = 'In Review';
      request.reviewedAt = new Date();
    }
    
    await request.save();

    // Notify the corporate user that it was assigned
    await Notification.create({
      userId: request.raisedBy,
      message: `Your access request ${request.requestNumber} ("${request.title}") has been assigned and is being reviewed.`,
    });

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error assigning request:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
