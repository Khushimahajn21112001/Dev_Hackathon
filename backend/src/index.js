// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/team-routing-rules', require('./routes/teamRoutingRoutes'));
app.use('/api/issues', require('./routes/issueRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/corporate', require('./routes/corporateRoutes'));
app.use('/api/team-lead', require('./routes/teamLeadRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server due to DB error', err);
});
