// types/auth.ts

export type ModerationLevel = 'new' | 'trusted' | 'suspended';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  pseudo?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isVerified: boolean;
  preferredContact: 'email' | 'phone';
  isMaster?: boolean;
  premiumAccess?: boolean;
  unlimitedTickets?: boolean;
  ticketCount?: number;
  premiumUsageCredits?: number;
  moderationScore?: number;
  moderationLevel?: ModerationLevel;
  
  // CORRECTION: On utilise une convention de nommage cohérente (camelCase)
  ownedBackgrounds?: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CreateAccountData {
  contact: string;
  type: 'email' | 'phone';
  pseudo?: string;
}

export interface LoginData {
  contact: string;
  type: 'email' | 'phone';
}
