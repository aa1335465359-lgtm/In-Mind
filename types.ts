
export interface MemoryResult {
  mood: string;        // e.g. "宁静", "喜悦", "低落"
  keywords: string[];  // e.g. ["阳光", "咖啡", "希望"]
  stampText: string;   // e.g. "日色很慢", "又是新的一天"
  quote: string;       // AI generated poetic short sentence
  colorTheme: string;  // e.g. "warm", "cool", "neutral", "green", "pink"
  shapeStyle: string;  // e.g. "organic", "geometric", "minimal"
}

export interface JournalEntry {
  id: string;
  content: string;
  createdAt: number; // Timestamp
  updatedAt: number;
  aiSummary?: string; // deprecated
  aiMood?: string; // deprecated
  userMood?: string;
  tags: string[];
  images?: string[];
  isPinned?: boolean;
  memoryResult?: MemoryResult | null;
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
    isEphemeral?: boolean; // Safety: Mark if the original message was ephemeral
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