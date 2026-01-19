
export interface JournalEntry {
  id: string;
  content: string;
  createdAt: number; // Timestamp
  updatedAt: number;
  aiSummary?: string;
  aiMood?: string; // AI Analyzed mood
  userMood?: string; // User selected mood emoji
  tags: string[];
  images?: string[]; // Array of public URLs
  isPinned?: boolean;
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
  senderName?: string;
  timestamp: number;
  type: 'text' | 'system' | 'journal-share' | 'purge-user' | 'screenshot-alert';
  isEphemeral?: boolean; // New: Burn After Reading flag
  
  // Reply / Quote functionality
  replyTo?: {
    id: string;
    senderName: string;
    contentPreview: string;
  };

  meta?: {
    journalTitle?: string;
    journalId?: string;
    fullContent?: string;
  };
}

export interface ChatRoomConfig {
  roomId: string;
  isPanic: boolean;
}
