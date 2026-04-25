import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '@/lib/sqhnSession';
import { LogOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppHeader({ title, showBack, backPath }) {
  const navigate = useNavigate();
  const session = getSession();

  const handleSignOut = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
        </div>
        {session && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        )}
      </div>
    </header>
  );
}