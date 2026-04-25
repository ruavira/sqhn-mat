import React from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '@/lib/sqhnSession';

export default function RequireAuth({ children, allowedRole }) {
  const session = getSession();
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && session.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}