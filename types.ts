
export enum Priority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4'
}

export type TodoStatus = 'todo' | 'in_progress' | 'done';

export interface Todo {
  id: string;
  text?: string;
  title?: string;
  completed?: boolean;
  isCompleted?: boolean;
  status?: TodoStatus;
  aiStatus?: string;
  priority?: Priority;
  shopId?: string;
  createdAt?: number;
  deadline?: number;
  quantity?: number | string;
  actionTime?: string;
  completedAt?: number;
}

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
  isGeneratingMemory?: boolean;
  title?: string;
  deletedAt?: number;
  weather?: 'clear' | 'rain' | 'cloud' | 'snow' | 'none';
  planet?: { version: 1; palette: string[]; seed: number; cover?: string; material: 'resin' | 'print' };
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
