import React from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '@/lib/sqhnSession';

// ============================================================
// ⚠️  SQHN MAT ROUTING ARCHITECTURE — DO NOT CHANGE ⚠️
// ============================================================
// RequireAuth MUST redirect to '/' (NOT '/login') when no session is found.
// The correct chain is: '/' → Home checks session → Navigate to /login.
// Going directly to '/login' bypasses Home and causes the Base44 SDK
// to intercept the navigation and show its own splash/login screen
// instead of our custom SignIn page. This is a platform constraint.
// ============================================================

export default function RequireAuth({ children, allowedRole }) {
  const session = getSession();
  
  if (!session) {
    // MUST redirect to '/' — NOT '/login' directly. See architecture note above.
    return <Navigate to="/" replace />;
  }
  
  if (allowedRole && session.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}