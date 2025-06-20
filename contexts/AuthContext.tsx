import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, AuthChangeEvent, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabaseClient';
import type { User, AuthState, CreateAccountData, LoginData, ModerationLevel } from '@/types/auth';
import { AVAILABLE_BACKGROUNDS } from '@/utils/backgrounds'; // Import pour donner tous les fonds au compte démo

interface AuthContextType extends AuthState {
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session) {
          fetchUserProfile(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (profileData) {
        const userProfile: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          pseudo: profileData.pseudo,
          createdAt: new Date(profileData.created_at),
          lastLoginAt: new Date(profileData.last_login_at),
          isMaster: profileData.is_master,
          premiumAccess: profileData.premium_access,
          unlimitedTickets: profileData.unlimited_tickets,
          ticketCount: profileData.ticket_count,
          premiumUsageCredits: profileData.premium_usage_credits,
          moderationScore: profileData.moderation_score,
          moderationLevel: profileData.moderation_level,
          isVerified: !!supabaseUser.email_confirmed_at,
          preferredContact: 'email', 
          ownedBackgrounds: profileData.owned_backgrounds || [],
        };
        setUser(userProfile);
      }
    } catch (e: any) {
      console.error("Erreur lors de la récupération du profil:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (data: CreateAccountData): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.contact,
        options: { shouldCreateUser: true, data: { pseudo: data.pseudo } },
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const login = async (data: LoginData): Promise<{ success: boolean; error?: string }> => {
     try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.contact,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'magiclink',
      });
      if (error) throw error;
      
      if(data.user) {
        const { data: profileData } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();

        if (!profileData) {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: data.user.id,
            pseudo: data.user.user_metadata.pseudo || null,
          });
          if (insertError) throw insertError;
        }
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async (): Promise<void> => {
    if(session) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    try {
      const updateData: { [key: string]: any } = {};
      if (data.ownedBackgrounds !== undefined) updateData.owned_backgrounds = data.ownedBackgrounds;
      if (data.premiumAccess !== undefined) updateData.premium_access = data.premiumAccess;
      if (data.ticketCount !== undefined) updateData.ticket_count = data.ticketCount;
      if (data.premiumUsageCredits !== undefined) updateData.premium_usage_credits = data.premiumUsageCredits;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
      if (error) throw error;
      
      if (session) await fetchUserProfile(session.user);
      return { success: true };
    } catch (error: any) {
       console.error("Erreur de mise à jour du profil:", error);
       return { success: false, error: error.message };
    }
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
  
  // --- DÉBUT DE LA CORRECTION ---
  const purchaseItem = async (itemId: string): Promise<{success: boolean}> => {
    if (!user) return {success: false};

    // On ajoute une condition pour gérer spécifiquement l'achat de tickets.
    if (itemId === 'ticket_pack_5') {
        const currentTickets = user.ticketCount || 0;
        // On appelle updateProfile pour incrémenter le nombre de tickets de 5.
        const result = await updateProfile({ ticketCount: currentTickets + 5 });
        // On met à jour l'état local de l'utilisateur pour un retour visuel immédiat
        if (result.success) {
            setUser(prevUser => prevUser ? { ...prevUser, ticketCount: currentTickets + 5 } : null);
        }
        return { success: result.success };
    }

    // La logique existante est conservée pour les autres articles (fonds d'écran).
    const currentOwned = user.ownedBackgrounds || [];
    if (currentOwned.includes(itemId)) return {success: true};

    const newOwned = [...currentOwned, itemId];
    const result = await updateProfile({ ownedBackgrounds: newOwned, premiumAccess: true });
    // On met à jour l'état local de l'utilisateur
    if (result.success) {
        setUser(prevUser => prevUser ? { ...prevUser, ownedBackgrounds: newOwned, premiumAccess: true } : null);
    }
    return {success: result.success};
  }
  // --- FIN DE LA CORRECTION ---

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
    setSession(null);
    setIsAuthenticated(true);
    return { success: true };
  };

  const updateUserModerationScore = async () => {};

  const value = {
    user, session, isAuthenticated, isLoading, error,
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