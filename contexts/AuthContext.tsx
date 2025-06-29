import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, AuthState, CreateAccountData, LoginData, ModerationLevel } from '@/types/auth';
import { AVAILABLE_BACKGROUNDS } from '@/utils/backgrounds';

interface AuthContextType extends AuthState {
  session: null;
  createAccount: (data: CreateAccountData) => Promise<{ success: boolean; error?: string }>;
  login: (data: LoginData) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  purchaseItem: (itemId: string) => Promise<{success: boolean}>;
  addPremiumCredit: () => Promise<void>;
  spendTicket: () => Promise<boolean>;
  spendPremiumCredit: () => Promise<boolean>;
  signInAsMaster: () => Promise<{ success: boolean; error?: string }>;
  updateUserModerationScore: (userId: string, change: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified mock implementation without Supabase
  const createAccount = async (data: CreateAccountData): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("Creating account with:", data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("Logging in with:", data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("Verifying OTP for:", email, "with code:", code);
      
      // Create a demo user
      const demoUser: User = {
        id: 'demo-user-id',
        email: email,
        pseudo: 'Demo User',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isVerified: true,
        preferredContact: 'email',
        ticketCount: 5,
        premiumUsageCredits: 2,
        moderationLevel: 'new',
        ownedBackgrounds: [],
      };
      
      setUser(demoUser);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'User not logged in' };
      
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const purchaseItem = async (itemId: string): Promise<{success: boolean}> => {
    if (!user) return {success: false};

    if (itemId === 'ticket_pack_5') {
      const currentTickets = user.ticketCount || 0;
      const result = await updateProfile({ ticketCount: currentTickets + 5 });
      return { success: result.success };
    }

    const currentOwned = user.ownedBackgrounds || [];
    if (currentOwned.includes(itemId)) return {success: true};

    const newOwned = [...currentOwned, itemId];
    const result = await updateProfile({ ownedBackgrounds: newOwned, premiumAccess: true });
    return {success: result.success};
  };
  
  const addPremiumCredit = async () => {
    if (!user) return;
    await updateProfile({ premiumUsageCredits: (user.premiumUsageCredits || 0) + 1 });
  };

  const spendTicket = async (): Promise<boolean> => {
    if (!user || !user.ticketCount || user.ticketCount <= 0) return false;
    const result = await updateProfile({ ticketCount: user.ticketCount - 1 });
    return result.success;
  };

  const spendPremiumCredit = async (): Promise<boolean> => {
    if (!user || !user.premiumUsageCredits || user.premiumUsageCredits <= 0) return false;
    const result = await updateProfile({ premiumUsageCredits: user.premiumUsageCredits - 1 });
    return result.success;
  };
  
  const signInAsMaster = async (): Promise<{ success: boolean; error?: string }> => {
    console.log("Activation du mode Maître / Jury...");
    
    const masterUser: User = {
      id: 'master-demo-user-id',
      email: 'demo@lesouffle.app',
      pseudo: 'Jury Silagora',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isVerified: true,
      preferredContact: 'email',
      isMaster: true,
      premiumAccess: true,
      unlimitedTickets: true,
      ticketCount: 999,
      premiumUsageCredits: 999,
      moderationScore: 1000,
      moderationLevel: 'trusted',
      ownedBackgrounds: AVAILABLE_BACKGROUNDS.map(bg => bg.id),
    };

    setUser(masterUser);
    setIsAuthenticated(true);
    setError(null);
    return { success: true };
  };

  const updateUserModerationScore = async () => {
    // Mock implementation
  };

  const value = {
    user, session: null, isAuthenticated, isLoading, error,
    createAccount, login, verifyOTP, logout, updateProfile,
    purchaseItem, addPremiumCredit, spendTicket, spendPremiumCredit,
    signInAsMaster, updateUserModerationScore
  } as AuthContextType;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}