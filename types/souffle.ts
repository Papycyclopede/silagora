// types/souffle.ts

export interface SouffleContent {
  jeMeSens: string;
  messageLibre: string;
  ceQueJaimerais: string;
}

export type ModerationStatus = 'clean' | 'pending' | 'approved' | 'rejected' | 'escalated';

export interface ModerationVote {
  userId: string;
  decision: 'approve' | 'reject';
  timestamp: Date;
}

export interface ModerationInfo {
  status: ModerationStatus;
  votes: ModerationVote[];
  moderatedAt?: Date;
  reasons?: string[];
}

export interface Souffle {
  id: string;
  userId?: string;
  pseudo?: string;
  content: SouffleContent;
  latitude: number;
  longitude: number;
  createdAt: Date;
  expiresAt: Date;
  isRevealed: boolean;
  sticker?: string;
  backgroundId?: string;
  hasBeenRead?: boolean;
  isSimulated?: boolean;
  moderation: ModerationInfo;
  language_code?: string;
  voice_id?: string;
  audio_url?: string;
}

export interface SuspendedTicket {
  id: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  claimed_by?: string;
  claimed_at?: Date;
}

export interface CreateSouffleData {
  content: SouffleContent;
  latitude: number;
  longitude: number;
  duration: 24 | 48;
  sticker?: string;
  backgroundId?: string;
  voiceId: string;
}

export interface EchoPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  souffleCount: number;
  description?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface SouffleStats {
  totalDeposited: number;
  totalRead: number;
  activeNearby: number;
}
