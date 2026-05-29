import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import SupportDashboard from './components/Dashboard/SupportDashboard';
import ResolutionKBPage from './components/Dashboard/ResolutionKBPage';

// Corporate Module
import CorporateLayout from './components/Corporate/CorporateLayout';
import RaiseRequest from './components/Corporate/RaiseRequest';
import MyTickets from './components/Corporate/MyTickets';
import CorporateNotifications from './components/Corporate/CorporateNotifications';

// Team Management & Custom Workspaces
import TeamManagement from './components/Corporate/TeamManagement';
import TeamLeadLayout from './components/Corporate/TeamLeadLayout';
import TeamLeadDashboard from './components/Corporate/TeamLeadDashboard';
import TeamTickets from './components/Corporate/TeamTickets';
import SupportLayout from './components/Corporate/SupportLayout';
import SupportMyTickets from './components/Corporate/SupportMyTickets';
import UserManagement from './components/Corporate/UserManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin Console */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teams"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <TeamManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/resolution-kb"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <ResolutionKBPage />
            </ProtectedRoute>
          }
        />

        {/* Corporate User – nested layout with sidebar */}
        <Route
          path="/corporate"
          element={
            <ProtectedRoute allowedRoles={['Corporate User']}>
              <CorporateLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<RaiseRequest />} />
          <Route path="raise-request" element={<RaiseRequest />} />
          <Route path="my-tickets" element={<MyTickets />} />
          <Route path="notifications" element={<CorporateNotifications />} />
        </Route>

        {/* Team Lead - nested layout with sidebar */}
        <Route
          path="/team-lead"
          element={
            <ProtectedRoute allowedRoles={['Team Lead']}>
              <TeamLeadLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<TeamLeadDashboard />} />
          <Route path="tickets" element={<TeamTickets />} />
        </Route>

        {/* Support User - nested layout with sidebar */}
        <Route
          path="/support"
          element={
            <ProtectedRoute allowedRoles={['Support User']}>
              <SupportLayout />
            </ProtectedRoute>
          }
        >
          <Route path="tickets" element={<SupportMyTickets />} />
          <Route path="notifications" element={<CorporateNotifications />} />
        </Route>

        {/* Support Legacy Dashboard Redirect */}
        <Route
          path="/support/dashboard"
          element={<Navigate to="/support/tickets" replace />}
        />

        {/* Catch all redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
