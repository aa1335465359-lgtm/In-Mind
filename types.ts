
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
  senderName?: string; // Added: Nickname support
  timestamp: number;
  type: 'text' | 'system' | 'journal-share' | 'purge-user'; // Added purge-user command
  
  // Reply / Quote functionality
  replyTo?: {
    id: string;
    senderName: string;
    contentPreview: string;
  };

  meta?: {
    journalTitle?: string;
    journalId?: string;
    fullContent?: string; // Added: Allow sending full content for viewing
  };
}

export interface ChatRoomConfig {
  roomId: string; // "public" or hashed password
  isPanic: boolean;
}
