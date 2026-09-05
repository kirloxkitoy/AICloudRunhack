export interface JournalSummary {
  title: string;
  keyPoints: string[];
  mood: string;
  summary: string;
  actionItems?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export type EntryType = 'voice' | 'reflection';

export interface JournalEntry {
  id: string;
  userId: string;
  type: EntryType;
  title: string;
  createdAt: string;
  updatedAt: string;
  // For voice logs:
  audioDurationSeconds?: number;
  transcript?: string;
  summary?: JournalSummary;
  // For multi-turn reflections:
  conversation?: ChatMessage[];
  tags?: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
