import { getPendingWrites, markWriteComplete, getPendingVoiceNotes, clearVoiceNote } from './offlineDb';
import { saveStandardsScore } from '@/functions/saveStandardsScore';
import { saveConferenceRecord } from '@/functions/saveConferenceRecord';
import { saveMentorConferenceRatings } from '@/functions/saveMentorConferenceRatings';
import { saveMentorNote } from '@/functions/saveMentorNote';
import { saveTrainingPlanItems } from '@/functions/saveTrainingPlanItems';
import { updateTrainingPlanItem } from '@/functions/updateTrainingPlanItem';
import { updateTraineeProgress } from '@/functions/updateTraineeProgress';
import { acknowledgeRemedialPlan } from '@/functions/acknowledgeRemedialPlan';

async function invokeByName(functionName, params) {
  switch (functionName) {
    case 'saveStandardsScore': return saveStandardsScore(params);
    case 'saveConferenceRecord': return saveConferenceRecord(params);
    case 'saveMentorConferenceRatings': return saveMentorConferenceRatings(params);
    case 'saveMentorNote': return saveMentorNote(params);
    case 'saveTrainingPlanItems': return saveTrainingPlanItems(params);
    case 'updateTrainingPlanItem': return updateTrainingPlanItem(params);
    case 'updateTraineeProgress': return updateTraineeProgress(params);
    case 'acknowledgeRemedialPlan': return acknowledgeRemedialPlan(params);
    default: throw new Error(`Unknown function: ${functionName}`);
  }
}

export async function syncPendingWrites() {
  const pending = await getPendingWrites();
  let synced = 0;
  let failed = 0;
  for (const write of pending) {
    try {
      await invokeByName(write.functionName, write.params);
      await markWriteComplete(write.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}

export async function syncVoiceNotes() {
  const notes = await getPendingVoiceNotes();
  for (const note of notes) {
    try {
      await saveMentorNote({
        assignment_id: note.assignment_id,
        trainee_email: note.trainee_email,
        mentor_email: note.mentor_email,
        session_number: note.session_number,
        content: '[Voice note recorded offline — transcription pending]',
        note_type: 'voice',
        tags: note.tags || [],
        transcription_pending: true,
      });
      await clearVoiceNote(note.id);
    } catch {
      // leave it pending
    }
  }
}

export function startSyncListener() {
  window.addEventListener('online', () => {
    syncPendingWrites();
    syncVoiceNotes();
  });
}