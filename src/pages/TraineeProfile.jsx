import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTraineeProfile } from '@/functions/getTraineeProfile';
import { cacheSet, cacheGet } from '@/lib/offlineDb';
import { format } from 'date-fns';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav';
import StatusChip from '@/components/shared/StatusChip';
import MentorStandardsTab from '@/components/mentor/MentorStandardsTab.jsx';
import MentorConferencesTab from '@/components/mentor/MentorConferencesTab.jsx';
import CompetencyTab from '@/components/mentor/CompetencyTab.jsx';
import MentorNotesTab from '@/components/mentor/MentorNotesTab.jsx';
import TrainingPlanTab from '@/components/mentor/TrainingPlanTab.jsx';
import { Loader2, User, MapPin, Calendar, FileText } from 'lucide-react';
import { getSession } from '@/lib/sqhnSession';

const TABS = ['Standards', 'Conferences', 'Competency', 'Session Journal', 'Training Plan'];

const CACHE_KEY = (id) => `trainee-profile-${id}`;

export default function TraineeProfile() {
  const assignmentId = window.location.pathname.split('/').pop();
  const [activeTab, setActiveTab] = useState(0);
  const [cachedAt, setCachedAt] = useState(null);
  const session = getSession();

  const { data, isLoading } = useQuery({
    queryKey: ['trainee-profile', assignmentId],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await cacheGet(CACHE_KEY(assignmentId));
        if (cached) { setCachedAt(cached._cachedAt); return cached.data; }
        return null;
      }
      const res = await getTraineeProfile({ assignment_id: assignmentId });
      const d = res.data;
      await cacheSet(CACHE_KEY(assignmentId), { data: d, _cachedAt: Date.now() }, 120);
      setCachedAt(null);
      return d;
    },
    enabled: !!assignmentId,
  });

  const assignment = data?.assignment;

  if (isLoading || !assignment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Trainee Profile" showBack backPath="/dashboard" />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {cachedAt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-800">
            Viewing cached data from {format(new Date(cachedAt), 'dd MMM, HH:mm')}. Connect to internet to refresh.
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{assignment.trainee_name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Session {assignment.session_number || 1}
                  </span>
                  <StatusChip status={assignment.status} />
                </div>
              </div>
            </div>
            <button
              onClick={() => window.open(`/report/${assignment.id}?type=admin`, '_blank')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              Report
            </button>
          </div>
          {assignment.facility_name && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-[52px]">
              <MapPin className="w-3.5 h-3.5" />
              <span>{assignment.facility_name}{assignment.facility_state ? `, ${assignment.facility_state}` : ''}</span>
            </div>
          )}
          {assignment.assessment_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-[52px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(new Date(assignment.assessment_date), 'dd MMM yyyy')}</span>
            </div>
          )}
        </div>

        <div className="flex bg-muted rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 py-2 px-1 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap min-w-0 ${
                activeTab === idx ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <MentorStandardsTab
            traineeEmail={assignment.trainee_email}
            assignmentId={assignment.id}
            initialScores={data?.scores}
          />
        )}
        {activeTab === 1 && (
          <MentorConferencesTab
            traineeEmail={assignment.trainee_email}
            assignmentId={assignment.id}
            initialConferences={data?.conferences}
          />
        )}
        {activeTab === 2 && (
          <CompetencyTab
            traineeEmail={assignment.trainee_email}
            assignmentId={assignment.id}
            assignmentData={assignment}
            initialCompetency={data?.competency}
          />
        )}
        {activeTab === 3 && (
          <MentorNotesTab
            assignmentId={assignment.id}
            traineeEmail={assignment.trainee_email}
            mentorEmail={session?.email || ''}
            sessionNumber={assignment.current_ma_session || assignment.session_number || 1}
          />
        )}
        {activeTab === 4 && (
          <TrainingPlanTab
            assignmentId={assignment.id}
            traineeEmail={assignment.trainee_email}
            mentorEmail={session?.email || ''}
            sessionNumber={assignment.current_ma_session || assignment.session_number || 1}
            assignmentData={assignment}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}