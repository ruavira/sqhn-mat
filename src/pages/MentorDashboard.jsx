import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMentorAssignments } from '@/functions/getMentorAssignments';
import { getSession } from '@/lib/sqhnSession';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav';
import TraineeCard from '@/components/mentor/TraineeCard';
import { Card } from '@/components/ui/card';
import { Users, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cacheSet, cacheGet } from '@/lib/offlineDb';
import { format } from 'date-fns';

const CACHE_KEY = (email) => `mentor-assignments-${email}`;

export default function MentorDashboard() {
  const session = getSession();
  const [cachedAt, setCachedAt] = useState(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['mentor-assignments', session?.email],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await cacheGet(CACHE_KEY(session.email));
        if (cached) { setCachedAt(cached._cachedAt); return cached.assignments; }
        return [];
      }
      const res = await getMentorAssignments({ mentor_email: session.email });
      const data = res.data?.assignments || [];
      await cacheSet(CACHE_KEY(session.email), { assignments: data, _cachedAt: Date.now() }, 120);
      setCachedAt(null);
      return data;
    },
    enabled: !!session?.email,
  });

  const stats = {
    total: assignments.length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="SQHN MAT" />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {cachedAt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-800">
            Viewing cached data from {format(new Date(cachedAt), 'dd MMM, HH:mm')}. Connect to internet to refresh.
          </div>
        )}

        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Welcome, {session?.name || 'Mentor'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Surveyor Certification Programme</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Trainees</p>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">In Progress</p>
          </Card>
          <Card className="p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.submitted}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Submitted</p>
          </Card>
        </div>

        {/* Trainee List */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            My Trainees
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : assignments.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No trainees assigned yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <TraineeCard key={a.id} assignment={a} />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}