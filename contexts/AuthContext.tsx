import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, AuthState, CreateAccountData, LoginData, ModerationLevel } from '@/types/auth';
import { AVAILABLE_BACKGROUNDS } from '@/utils/backgrounds';

interface AuthContextType extends AuthState {
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

// Storage keys
const USER_STORAGE_KEY = '@silagora:user';
const AUTH_STATE_KEY = '@silagora:auth_state';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved auth state on startup
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const savedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
        
        if (savedUser && savedAuthState) {
          const parsedUser = JSON.parse(savedUser);
          const parsedAuthState = JSON.parse(savedAuthState);
          
          setUser(parsedUser);
          setIsAuthenticated(parsedAuthState.isAuthenticated);
        }
      } catch (e) {
        console.error("Failed to load auth state:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAuthState();
  }, []);

  // Save auth state when it changes
  useEffect(() => {
    const saveAuthState = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ isAuthenticated }));
        } else {
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          await AsyncStorage.removeItem(AUTH_STATE_KEY);
        }
      } catch (e) {
        console.error("Failed to save auth state:", e);
      }
    };
    
    saveAuthState();
  }, [user, isAuthenticated]);

  const createAccount = async (data: CreateAccountData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate account creation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would create a user in your authentication system
      console.log("Creating account with:", data);
      
      return { success: true };
    } catch (error: any) {
      setError(error.message || "Failed to create account");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate login delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would authenticate with your backend
      console.log("Logging in with:", data);
      
      return { success: true };
    } catch (error: any) {
      setError(error.message || "Failed to login");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, any 6-digit code is accepted
      if (code.length !== 6 || !/^\d+$/.test(code)) {
        throw new Error("Invalid verification code");
      }
      
      // Create a demo user
      const demoUser: User = {
        id: `user_${Date.now()}`,
        email: email,
        pseudo: email.split('@')[0],
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
      setError(error.message || "Failed to verify code");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Simulate logout delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      // Clear stored auth state
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
    } catch (error: any) {
      setError(error.message || "Failed to logout");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        throw new Error("User not logged in");
      }
      
      setIsLoading(true);
      
      // Simulate update delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      
      return { success: true };
    } catch (error: any) {
      setError(error.message || "Failed to update profile");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const purchaseItem = async (itemId: string): Promise<{success: boolean}> => {
    if (!user) return {success: false};

    try {
      setIsLoading(true);
      
      // Simulate purchase delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (itemId === 'ticket_pack_5') {
        const currentTickets = user.ticketCount || 0;
        await updateProfile({ ticketCount: currentTickets + 5 });
        return { success: true };
      }

      const currentOwned = user.ownedBackgrounds || [];
      if (currentOwned.includes(itemId)) return {success: true};

      const newOwned = [...currentOwned, itemId];
      const result = await updateProfile({ 
        ownedBackgrounds: newOwned, 
        premiumAccess: true 
      });
      
      return {success: result.success};
    } catch (error) {
      console.error("Purchase error:", error);
      return {success: false};
    } finally {
      setIsLoading(false);
    }
  };
  
  const addPremiumCredit = async () => {
    if (!user) return;
    
    try {
      await updateProfile({ 
        premiumUsageCredits: (user.premiumUsageCredits || 0) + 1 
      });
    } catch (error) {
      console.error("Error adding premium credit:", error);
    }
  };

  const spendTicket = async (): Promise<boolean> => {
    if (!user || !user.ticketCount || user.ticketCount <= 0) return false;
    
    try {
      const result = await updateProfile({ 
        ticketCount: user.ticketCount - 1 
      });
      return result.success;
    } catch (error) {
      console.error("Error spending ticket:", error);
      return false;
    }
  };

  const spendPremiumCredit = async (): Promise<boolean> => {
    if (!user || !user.premiumUsageCredits || user.premiumUsageCredits <= 0) return false;
    
    try {
      const result = await updateProfile({ 
        premiumUsageCredits: user.premiumUsageCredits - 1 
      });
      return result.success;
    } catch (error) {
      console.error("Error spending premium credit:", error);
      return false;
    }
  };
  
  const signInAsMaster = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log("Activating Master/Jury mode...");
      
      // Simulate activation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const masterUser: User = {
        id: `master_${Date.now()}`,
        email: 'master@silagora.app',
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
    } catch (error: any) {
      setError(error.message || "Failed to activate Master mode");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserModerationScore = async (userId: string, change: number) => {
    // This is a mock implementation
    console.log(`Updating moderation score for user ${userId} by ${change}`);
  };

  const value = {
    user, 
    isAuthenticated, 
    isLoading, 
    error,
    createAccount, 
    login, 
    verifyOTP, 
    logout, 
    updateProfile,
    purchaseItem, 
    addPremiumCredit, 
    spendTicket, 
    spendPremiumCredit,
    signInAsMaster, 
    updateUserModerationScore
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}