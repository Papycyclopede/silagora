import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import type { Souffle, CreateSouffleData, SuspendedTicket } from '@/types/souffle';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { SouffleStorage } from '@/utils/storage';
import { useAnalytics } from '@/hooks/useAnalytics';
import { validateSouffleContent } from '@/utils/moderation';

interface SouffleContextType {
  souffles: Souffle[];
  suspendedTickets: SuspendedTicket[];
  loading: boolean;
  createSouffle: (data: CreateSouffleData) => Promise<{ success: boolean; error?: string }>;
  revealSouffle: (id: string) => Promise<void>;
  refreshSouffles: () => Promise<void>;
  clearSimulatedSouffles: () => Promise<void>;
  placeSuspendedTicket: () => Promise<void>;
  claimSuspendedTicket: (ticketId: string) => Promise<boolean>;
  submitModerationVote: (souffleId: string, userId: string, decision: 'approve' | 'reject') => Promise<void>;
}

const SouffleContext = createContext<SouffleContextType | undefined>(undefined);

export function SouffleProvider({ children }: { children: ReactNode }) {
  const [souffles, setSouffles] = useState<Souffle[]>([]);
  const [suspendedTickets, setSuspendedTickets] = useState<SuspendedTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const { location } = useLocation();
  const { user, addPremiumCredit } = useAuth();
  const { trackSouffleCreated, trackSouffleRevealed } = useAnalytics();

  const fetchData = useCallback(async () => {
    if (!location) return;
    setLoading(true);

    try {
      const { data: soufflesData, error: soufflesError } = await supabase.rpc('get_souffles_in_view', {
        lat: location.latitude,
        long: location.longitude,
        radius_meters: 10000 
      });
      if (soufflesError) throw soufflesError;
      
      const revealedIds = await SouffleStorage.loadRevealedSouffles();
      const mappedSouffles: Souffle[] = soufflesData.map((item: any) => ({
        id: item.id,
        content: item.content,
        userId: item.user_id,
        latitude: item.latitude,
        longitude: item.longitude,
        createdAt: new Date(item.created_at),
        expiresAt: new Date(item.expires_at),
        isRevealed: revealedIds.includes(item.id) || item.user_id === user?.id,
        sticker: item.sticker,
        backgroundId: item.background_id,
        isSimulated: item.is_simulated,
        moderation: item.moderation,
      }));
      setSouffles(mappedSouffles);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('suspended_tickets')
        .select('*')
        .is('claimed_by', null);
      if (ticketsError) throw ticketsError;
      setSuspendedTickets(ticketsData || []);

    } catch (e: any) {
      console.error("Erreur lors de la récupération des données:", e.message);
    } finally {
      setLoading(false);
    }
  }, [location, user?.id]);

  useEffect(() => {
    if (location) {
      fetchData();
    }
  }, [location, fetchData]);

  useEffect(() => {
    const souffleChannel = supabase.channel('souffles_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'souffles' }, () => fetchData()).subscribe();
    const ticketChannel = supabase.channel('tickets_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'suspended_tickets' }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(souffleChannel);
      supabase.removeChannel(ticketChannel);
    };
  }, [supabase, fetchData]);

  const createSouffle = async (data: CreateSouffleData): Promise<{ success: boolean; error?: string }> => {
    if (!location || !user) return { success: false, error: "Utilisateur ou localisation introuvable." };
    
    // CORRECTION: Le compte maître ne peut pas créer de vrais souffles
    if (user.isMaster) {
        console.log("Mode Maître : Création de souffle désactivée pour ne pas polluer la base de données.");
        return { success: true };
    }
    
    const validationResult = validateSouffleContent(data.content);
     if (validationResult.status === 'blocked') return { success: false, error: validationResult.reasons.join(', ') };

    const newSouffleData = {
      user_id: user.id,
      content: validationResult.sanitizedContent ? JSON.parse(validationResult.sanitizedContent) : data.content,
      latitude: location.latitude,
      longitude: location.longitude,
      expires_at: new Date(Date.now() + data.duration * 60 * 60 * 1000).toISOString(),
      sticker: data.sticker,
      background_id: data.backgroundId,
      is_flagged: validationResult.status === 'flagged',
    };

    const { error } = await supabase.from('souffles').insert([newSouffleData]);
    if (error) return { success: false, error: error.message };
    trackSouffleCreated();
    return { success: true };
  };

  const revealSouffle = async (id: string) => {
    const updatedSouffles = souffles.map(s => s.id === id ? { ...s, isRevealed: true } : s);
    setSouffles(updatedSouffles);
    const revealedIds = await SouffleStorage.loadRevealedSouffles();
    if (!revealedIds.includes(id)) {
      await SouffleStorage.saveRevealedSouffles([...revealedIds, id]);
      trackSouffleRevealed();
    }
  };
  
  const clearSimulatedSouffles = async (): Promise<void> => {
    setLoading(true);
    try {
      const { error } = await supabase.from('souffles').delete().eq('is_simulated', true);
      if (error) throw error;
      await fetchData();
    } catch (e: any) {
      console.error("Erreur lors du nettoyage des souffles simulés:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const placeSuspendedTicket = async (): Promise<void> => {
    if (!location || !user) return;
    if (user.isMaster) {
        console.log("Mode Maître : Dépôt de ticket désactivé.");
        return;
    }
    const { error } = await supabase.from('suspended_tickets').insert({ latitude: location.latitude, longitude: location.longitude });
    if(error) console.error("Erreur lors du dépôt du ticket:", error);
  };

  const claimSuspendedTicket = async (ticketId: string): Promise<boolean> => {
    if(!user) return false;
    
    // CORRECTION: Si l'utilisateur est le maître, on simule l'action localement
    if (user.isMaster) {
        console.log("Mode Maître: Réclamation de ticket simulée.");
        setSuspendedTickets(prev => prev.filter(t => t.id !== ticketId));
        return true;
    }

    const { error } = await supabase.from('suspended_tickets').update({ claimed_by: user.id, claimed_at: new Date().toISOString() }).eq('id', ticketId);
    if(error) {
        console.error("Erreur lors de la réclamation du ticket:", error);
        return false;
    }
    await addPremiumCredit();
    return true;
  };
  
  const submitModerationVote = async () => {};

  const value = {
    souffles, suspendedTickets, loading,
    createSouffle, revealSouffle,
    refreshSouffles: fetchData,
    clearSimulatedSouffles,
    placeSuspendedTicket,
    claimSuspendedTicket,
    submitModerationVote,
  };

  return <SouffleContext.Provider value={value}>{children}</SouffleContext.Provider>;
}

export function useSouffle() {
  const context = useContext(SouffleContext);
  if (context === undefined) throw new Error('useSouffle doit être utilisé à l\'intérieur d\'un SouffleProvider');
  return context;
}
