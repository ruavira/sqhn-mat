import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAbridgedStandards } from '@/functions/getAbridgedStandards';
import { getTraineeScores } from '@/functions/getTraineeScores';
import { saveStandardsScore } from '@/functions/saveStandardsScore';
import { getSession } from '@/lib/sqhnSession';
import AppHeader from '@/components/shared/AppHeader';
import BottomNav from '@/components/shared/BottomNav';
import ScoreChip from '@/components/shared/ScoreChip';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

const SCORE_OPTIONS = ['Fully Met', 'Partially Met', 'Not Met', 'N/A'];
const OFFLINE_KEY = 'sqhn_mat_pending_scores';

export default function StandardsScoring() {
  const session = getSession();
  const [expandedChapters, setExpandedChapters] = useState({});
  const [localScores, setLocalScores] = useState({});
  const saveTimers = useRef({});

  const { data: standardsData, isLoading: loadingStandards } = useQuery({
    queryKey: ['abridged-standards'],
    queryFn: async () => {
      const res = await getAbridgedStandards({});
      return res.data?.standards || [];
    },
  });

  const { data: scoresData, isLoading: loadingScores } = useQuery({
    queryKey: ['trainee-scores', session?.email, session?.assignment_id],
    queryFn: async () => {
      const res = await getTraineeScores({ trainee_email: session.email, assignment_id: session.assignment_id });
      return res.data?.scores || [];
    },
    enabled: !!session?.email && !!session?.assignment_id,
  });

  const standards = standardsData || [];
  const existingScores = scoresData || [];

  useEffect(() => {
    const map = {};
    existingScores.forEach(s => {
      map[s.requirement_code] = { id: s.id, score: s.score, finding: s.finding || '' };
    });
    const pending = getPendingScores();
    Object.entries(pending).forEach(([code, data]) => {
      map[code] = { ...map[code], ...data };
    });
    setLocalScores(map);
  }, [existingScores]);

  function getPendingScores() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '{}'); }
    catch { return {}; }
  }

  function setPendingScore(code, data) {
    const pending = getPendingScores();
    pending[code] = data;
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(pending));
  }

  function clearPendingScore(code) {
    const pending = getPendingScores();
    delete pending[code];
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(pending));
  }

  const saveScore = useCallback(async (requirementCode, standard) => {
    const data = localScores[requirementCode];
    if (!data?.score) return;

    const payload = {
      trainee_email: session.email,
      assignment_id: session.assignment_id,
      chapter_code: standard.chapter_code,
      chapter_name: standard.chapter_name,
      standard_code: standard.standard_code,
      standard_name: standard.standard_name,
      requirement_code: requirementCode,
      requirement_text: standard.requirement_text,
      score: data.score,
      finding: data.finding || '',
      score_id: data.id || null,
    };

    try {
      const res = await saveStandardsScore(payload);
      const saved = res.data?.record;
      if (saved?.id && !data.id) {
        setLocalScores(prev => ({
          ...prev,
          [requirementCode]: { ...prev[requirementCode], id: saved.id },
        }));
      }
      clearPendingScore(requirementCode);
    } catch {
      setPendingScore(requirementCode, { score: data.score, finding: data.finding });
    }
  }, [localScores, session]);

  const handleScoreChange = (requirementCode, score, standard) => {
    setLocalScores(prev => ({ ...prev, [requirementCode]: { ...prev[requirementCode], score } }));
    if (saveTimers.current[requirementCode]) clearTimeout(saveTimers.current[requirementCode]);
    saveTimers.current[requirementCode] = setTimeout(() => saveScore(requirementCode, standard), 1000);
  };

  const handleFindingChange = (requirementCode, finding, standard) => {
    setLocalScores(prev => ({ ...prev, [requirementCode]: { ...prev[requirementCode], finding } }));
    if (saveTimers.current[requirementCode]) clearTimeout(saveTimers.current[requirementCode]);
    saveTimers.current[requirementCode] = setTimeout(() => saveScore(requirementCode, standard), 1000);
  };

  useEffect(() => {
    const handleOnline = () => {
      const pending = getPendingScores();
      Object.keys(pending).forEach(code => {
        const standard = standards.find(s => s.requirement_code === code);
        if (standard) saveScore(code, standard);
      });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [standards, saveScore]);

  if (loadingStandards || loadingScores) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const chapters = {};
  standards.forEach(s => {
    if (!chapters[s.chapter_code]) {
      chapters[s.chapter_code] = { name: s.chapter_name, code: s.chapter_code, items: [] };
    }
    chapters[s.chapter_code].items.push(s);
  });

  const scoredCount = Object.values(localScores).filter(s => s.score).length;
  const progress = standards.length > 0 ? (scoredCount / standards.length) * 100 : 0;

  const toggleChapter = (code) => {
    setExpandedChapters(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Standards Assessment" />

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{scoredCount} of {standards.length} scored</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {Object.values(chapters).map(chapter => {
          const isExpanded = expandedChapters[chapter.code] !== false;
          const chapterScored = chapter.items.filter(i => localScores[i.requirement_code]?.score).length;

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
                <div className="mt-2 space-y-3">
                  {chapter.items.map(item => {
                    const scoreData = localScores[item.requirement_code];
                    return (
                      <Card key={item.requirement_code} className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5 bg-muted px-1.5 py-0.5 rounded">
                            {item.requirement_code}
                          </span>
                          {item.is_critical && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{item.requirement_text}</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {SCORE_OPTIONS.map(opt => (
                            <ScoreChip
                              key={opt}
                              score={opt}
                              selected={scoreData?.score === opt}
                              onClick={() => handleScoreChange(item.requirement_code, opt, item)}
                              size="sm"
                            />
                          ))}
                        </div>
                        {scoreData?.score && (
                          <Textarea
                            value={scoreData.finding || ''}
                            onChange={e => handleFindingChange(item.requirement_code, e.target.value, item)}
                            placeholder="Finding / notes..."
                            className="text-sm min-h-[60px]"
                          />
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

      <BottomNav />
    </div>
  );
}