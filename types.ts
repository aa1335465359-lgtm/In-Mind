export interface JournalEntry {
  id: string;
  content: string;
  createdAt: number; // Timestamp
  updatedAt: number;
  aiSummary?: string;
  aiMood?: string; // AI Analyzed mood
  userMood?: string; // User selected mood emoji
  tags: string[];
}

export interface AppState {
  entries: JournalEntry[];
  currentEntryId: string | null;
  isStealthMode: boolean;
  isLocked: boolean;
}

export enum AIAction {
  SUMMARIZE = 'SUMMARIZE',
  REFLECT = 'REFLECT',
  POETRY = 'POETRY',
  PREDICT = 'PREDICT'
}
