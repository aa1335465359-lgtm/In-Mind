export interface JournalEntry {
  id: string;
  content: string;
  createdAt: number; // Timestamp
  updatedAt: number;
  aiSummary?: string;
  aiMood?: string; // AI Analyzed mood
  userMood?: string; // User selected mood emoji
  tags: string[];
  images?: string[]; // Array of public URLs (encrypted when stored in DB blob)
  isPinned?: boolean; // New feature: Pin to top
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

// --- Chat & Ephemeral Types ---

export type ViewMode = 'journal' | 'chat';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: number;
  type: 'text' | 'system' | 'journal-share';
  meta?: {
    journalTitle?: string;
    journalId?: string;
  };
}

export interface ChatRoomConfig {
  roomId: string; // "public" or hashed password
  isPanic: boolean;
}