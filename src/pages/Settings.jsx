import React, { useState } from 'react';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav.jsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { clearSession } from '@/lib/sqhnSession';
import { Trash2 } from 'lucide-react';

export default function Settings() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = () => {
    // Clear local session and all app data, then redirect to home
    clearSession();
    localStorage.clear();
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Settings" showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Account</h3>
          <p className="text-xs text-muted-foreground">
            Deleting your account will remove your local session and all cached data from this device.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </Button>
        </Card>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear your session and all locally cached data on this device. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}