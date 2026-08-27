export interface ReflectionMetadata {
  sessionTitle: string;
  dominantMood: string;
  tags: string[];
  briefSummary: string;
}

export interface ReflectionResponse {
  reflectionReply: string;
  metadata: ReflectionMetadata;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: ReflectionMetadata;
}

export interface JournalEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  userPrompt: string;
  reflectionReply: string;
  metadata: ReflectionMetadata;
  thread: ChatMessage[];
  bookmarked?: boolean;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'grounding' | 'clarity' | 'emotions' | 'decisions' | 'growth';
  description: string;
  starterText: string;
  suggestedMood: string;
}

export interface MoodStat {
  mood: string;
  count: number;
  percentage: number;
}
