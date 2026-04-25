import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMentorNotes } from '@/functions/getMentorNotes';
import { saveMentorNote } from '@/functions/saveMentorNote';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const TAGS = [
  { label: 'Strength', color: 'bg-green-100 text-green-700 border-green-300' },
  { label: 'Growth Area', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { label: 'Observation', color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

const TAG_COLORS = {
  Strength: 'bg-green-100 text-green-700 border-green-200',
  'Growth Area': 'bg-amber-100 text-amber-700 border-amber-200',
  Observation: 'bg-blue-100 text-blue-700 border-blue-200',
};

const PENDING_KEY = 'sqhn_pending_voice_notes';

function NoteCard({ note }) {
  const ts = note.created_at
    ? format(new Date(note.created_at), "MMM d · h:mm a")
    : '';

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{ts}</span>
        {note.note_type === 'voice' && (
          <Mic className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map(tag => (
            <span
              key={tag}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TAG_COLORS[tag] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {note.transcription_pending ? (
        <p className="text-sm text-muted-foreground italic">[Transcription pending]</p>
      ) : (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}

export default function MentorNotesTab({ assignmentId, traineeEmail, mentorEmail, sessionNumber }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [noteType, setNoteType] = useState('text');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Track online state
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Count pending voice notes
  const refreshPendingCount = useCallback(() => {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  // Sync pending notes when back online
  useEffect(() => {
    if (!isOnline) return;
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      if (pending.length === 0) return;

      pending.forEach(async (item) => {
        await saveMentorNote({
          assignment_id: item.assignment_id,
          trainee_email: item.trainee_email,
          mentor_email: item.mentor_email,
          session_number: item.session_number,
          content: '[Transcription pending]',
          note_type: 'voice',
          tags: [],
          transcription_pending: true,
        });
      });

      localStorage.removeItem(PENDING_KEY);
      setPendingCount(0);
      // Reload notes list
      getMentorNotes({ assignment_id: assignmentId }).then(res => {
        setNotes(res.data?.notes || []);
      });
    } catch {
      // silently ignore sync errors
    }
  }, [isOnline, assignmentId]);

  // Load notes on mount
  useEffect(() => {
    getMentorNotes({ assignment_id: assignmentId }).then(res => {
      setNotes(res.data?.notes || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [assignmentId]);

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // --- Speech Recognition (online) ---
  const startOnlineRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Speech recognition is not available in this browser.', variant: 'destructive' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let finalText = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t + ' ';
        else interim = t;
      }
      setText(finalText + interim);
    };
    recognition.onerror = () => stopRecording();
    recognition.onend = () => {
      setText(prev => prev.trim());
      setIsRecording(false);
    };

    recognition.start();
    setNoteType('voice');
    setIsRecording(true);
  };

  // --- MediaRecorder (offline) ---
  const startOfflineRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const audioBase64 = reader.result.split(',')[1];
          try {
            const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
            pending.push({
              assignment_id: assignmentId,
              trainee_email: traineeEmail,
              mentor_email: mentorEmail,
              session_number: sessionNumber,
              audioBase64,
              timestamp: new Date().toISOString(),
            });
            localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
            refreshPendingCount();
          } catch { /* ignore */ }
        };
        reader.readAsDataURL(blob);
        setText('[Voice note recorded offline — will be transcribed when back online. You may type a summary now.]');
        setIsRecording(false);
      };

      recorder.start();
      setNoteType('voice');
      setIsRecording(true);
    } catch {
      toast({ title: 'Microphone error', description: 'Could not access microphone.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  };

  const handleMicClick = () => {
    if (isRecording) { stopRecording(); return; }
    if (isOnline) startOnlineRecording();
    else startOfflineRecording();
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast({ title: 'Note is empty', description: 'Please type or record a note before saving.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await saveMentorNote({
      assignment_id: assignmentId,
      trainee_email: traineeEmail,
      mentor_email: mentorEmail,
      session_number: sessionNumber,
      content: text.trim(),
      note_type: noteType,
      tags: selectedTags,
      transcription_pending: false,
    });
    const saved = res.data?.note;
    if (saved) setNotes(prev => [saved, ...prev]);
    setText('');
    setSelectedTags([]);
    setNoteType('text');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          You are offline. Notes will be saved locally and synced when you reconnect.
        </div>
      )}

      {/* Pending voice notes banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          {pendingCount} voice recording{pendingCount > 1 ? 's' : ''} pending transcription. They will sync automatically when you are online.
        </div>
      )}

      {/* Composer */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setNoteType('text'); }}
          placeholder="Type an observation, or use the microphone to record a voice note..."
          rows={4}
          className="w-full text-sm rounded-lg border border-input px-3 py-2.5 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none bg-transparent"
        />

        {/* Tag toggles */}
        <div className="flex gap-2 flex-wrap">
          {TAGS.map(({ label, color }) => (
            <button
              key={label}
              onClick={() => toggleTag(label)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                selectedTags.includes(label)
                  ? color
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {isOnline ? 'Recording...' : 'Recording (offline)...'}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMicClick}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
              isRecording
                ? 'bg-red-50 border-red-300 text-red-600'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !text.trim()}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {saving ? 'Saving…' : 'Save Note'}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No notes yet. Add your first observation above.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <NoteCard key={note.id || i} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}