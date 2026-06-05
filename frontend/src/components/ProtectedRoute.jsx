import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to respective dashboard if they don't have access to this route
    if (role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'Corporate User') return <Navigate to="/corporate/dashboard" replace />;
    if (role === 'Support User') return <Navigate to="/support/tickets" replace />;
    if (role === 'Team Lead') return <Navigate to="/team-lead/dashboard" replace />;
    if (role === 'Credential Admin') return <Navigate to="/credential-admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
