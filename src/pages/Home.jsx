import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '@/lib/sqhnSession';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      navigate('/login', { replace: true });
    } else if (session.role === 'mentor') {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/standards', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );
}