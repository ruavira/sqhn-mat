import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '@/lib/sqhnSession';
import { LogOut, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useOnlineStatus from '@/lib/useOnlineStatus';
import { getPendingWrites } from '@/lib/offlineDb';

export default function AppHeader({ title, showBack, backPath }) {
  const navigate = useNavigate();
  const session = getSession();
  const { isOnline } = useOnlineStatus();
  const [syncedFlash, setSyncedFlash] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    getPendingWrites().then(writes => setHasPending(writes.length > 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    // When we come back online, check pending and show flash after a moment
    const t = setTimeout(() => {
      getPendingWrites().then(writes => {
        setHasPending(writes.length > 0);
        if (writes.length === 0) {
          setSyncedFlash(true);
          setTimeout(() => setSyncedFlash(false), 3000);
        }
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [isOnline]);

  const handleSignOut = () => {
    // ⚠️  SQHN MAT SIGN-OUT RULES — DO NOT CHANGE ⚠️
    // RULE 1: Use localStorage.removeItem('sqhn_mat_session') ONLY — never
    //         localStorage.clear() or sessionStorage.clear(). Clearing all storage
    //         removes Base44 SDK keys (base44_app_id, etc.) and causes the platform
    //         splash screen to appear instead of our custom login form.
    // RULE 2: Redirect to '/' via window.location.replace, NEVER directly to '/login'.
    //         The correct chain: '/' → Home → (no session) → Navigate to '/login'.
    //         Skipping Home by going directly to '/login' causes Base44 SDK to intercept.
    clearSession(); // removes ONLY 'sqhn_mat_session' — see sqhnSession.js
    window.location.replace('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-[11px] font-medium text-amber-800">
          Offline — changes will sync when reconnected
        </div>
      )}
      {isOnline && syncedFlash && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-1.5 text-center text-[11px] font-medium text-green-700">
          All synced ✓
        </div>
      )}
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