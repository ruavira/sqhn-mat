import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import StatusChip from '@/components/shared/StatusChip';
import { User, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function TraineeCard({ assignment }) {
  const navigate = useNavigate();

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
      onClick={() => navigate(`/trainee/${assignment.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {assignment.trainee_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  Session {assignment.session_number || 1}
                </span>
                <StatusChip status={assignment.status} />
              </div>
            </div>
          </div>

          <div className="space-y-1 pl-10">
            {assignment.facility_name && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{assignment.facility_name}{assignment.facility_state ? `, ${assignment.facility_state}` : ''}</span>
              </div>
            )}
            {assignment.assessment_date && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{format(new Date(assignment.assessment_date), 'dd MMM yyyy')}</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
      </div>
    </Card>
  );
}