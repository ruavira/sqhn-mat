import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ScoreChip from '@/components/shared/ScoreChip';
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function MentorStandardsTab({ traineeEmail, assignmentId }) {
  const [scores, setScores] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState({});

  const fetchData = async () => {
    const [stdList, scoreList] = await Promise.all([
      base44.entities.AbridgedStandard.list('order_index', 100),
      base44.entities.StandardsScore.filter({ trainee_email: traineeEmail, assignment_id: assignmentId }),
    ]);
    setStandards(stdList);
    setScores(scoreList);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [traineeEmail, assignmentId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const scoreMap = {};
  scores.forEach(s => { scoreMap[s.requirement_code] = s; });

  const scored = standards.filter(s => scoreMap[s.requirement_code]?.score).length;
  const progress = standards.length > 0 ? (scored / standards.length) * 100 : 0;

  // Group by chapter
  const chapters = {};
  standards.forEach(s => {
    if (!chapters[s.chapter_code]) {
      chapters[s.chapter_code] = { name: s.chapter_name, code: s.chapter_code, items: [] };
    }
    chapters[s.chapter_code].items.push(s);
  });

  const toggleChapter = (code) => {
    setExpandedChapters(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{scored} of {standards.length} scored</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {Object.values(chapters).map(chapter => {
        const isExpanded = expandedChapters[chapter.code] !== false;
        const chapterScored = chapter.items.filter(i => scoreMap[i.requirement_code]?.score).length;

        return (
          <div key={chapter.code}>
            <button
              onClick={() => toggleChapter(chapter.code)}
              className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-semibold text-xs text-primary">{chapter.code}</span>
                <span className="text-sm font-medium text-foreground">{chapter.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{chapterScored}/{chapter.items.length}</span>
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-2 pl-2">
                {chapter.items.map(item => {
                  const sc = scoreMap[item.requirement_code];
                  return (
                    <Card key={item.requirement_code} className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5">
                          {item.requirement_code}
                        </span>
                        {item.is_critical && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-sm text-foreground mb-2">{item.requirement_text}</p>
                      {sc?.score ? (
                        <div className="space-y-1">
                          <ScoreChip score={sc.score} selected size="sm" />
                          {sc.finding && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{sc.finding}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not yet scored</span>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}