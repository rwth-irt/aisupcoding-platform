import React from 'react';
import { Navigate } from 'react-router-dom';

// This component wraps our private pages
// It checks for a token, and if it doesn't exist,
// it redirects the user to the /login page.

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    // User is not authenticated
    return <Navigate to="/login" />;
  }

  return children; // User is authenticated, render the page
};

export default ProtectedRoute;