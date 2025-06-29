import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import type { Souffle, CreateSouffleData, SuspendedTicket } from '@/types/souffle';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { SouffleStorage } from '@/utils/storage';
import { useAnalytics } from '@/hooks/useAnalytics';
import { validateSouffleContent } from '@/utils/moderation';
import { generateInitialSouffleBatch } from '@/utils/souffleSimulator';

const MAX_SIMULATED_SOUFFLES = 20;

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
  reportSouffle: (souffleId: string) => Promise<{ success: boolean; error?: string }>;
}

const SouffleContext = createContext<SouffleContextType | undefined>(undefined);

export function SouffleProvider({ children }: { children: ReactNode }) {
  const [souffles, setSouffles] = useState<Souffle[]>([]);
  const [suspendedTickets, setSuspendedTickets] = useState<SuspendedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { location } = useLocation();
  const { user, addPremiumCredit } = useAuth();
  const { currentLanguage } = useLanguage();
  const { trackSouffleCreated, trackSouffleRevealed } = useAnalytics();

  const fetchData = useCallback(async (isRecursiveCall = false) => {
    if (!location) return;
    if (!isRecursiveCall) setLoading(true);

    try {
      // Vérifier si la table souffles existe
      try {
        const { data: soufflesData, error: soufflesError } = await supabase.rpc('get_souffles_in_view', {
          lat: location.latitude,
          long: location.longitude,
          radius_meters: 10000
        });

        if (soufflesError) {
          console.error("Erreur lors de la récupération des données:", soufflesError.message);
          // Si la table n'existe pas, on retourne un tableau vide
          if (soufflesError.message.includes("relation") && soufflesError.message.includes("does not exist")) {
            setSouffles([]);
          } else {
            throw soufflesError;
          }
        } else {
          const revealedIds = await SouffleStorage.loadRevealedSouffles();

          const mappedSouffles: Souffle[] = (soufflesData || [])
            .filter((item: any) => item && item.id && item.created_at && item.expires_at)
            .map((item: any) => ({
              id: item.id,
              userId: item.user_id,
              pseudo: item.pseudo,
              content: item.content || { jeMeSens: '', messageLibre: '', ceQueJaimerais: '' },
              latitude: item.latitude,
              longitude: item.longitude,
              createdAt: new Date(item.created_at),
              expiresAt: new Date(item.expires_at),
              isRevealed: revealedIds.includes(item.id) || item.user_id === user?.id,
              sticker: item.sticker,
              backgroundId: item.background_id,
              isSimulated: item.is_simulated || false,
              moderation: item.moderation || { status: 'clean', votes: [] },
              language_code: item.language_code,
              voice_id: item.voice_id,
              audio_url: item.audio_url,
            }));
          
          setSouffles(mappedSouffles);
        }
      } catch (e) {
        console.error("Erreur lors de la récupération des souffles:", e);
        setSouffles([]);
      }

      try {
        const { data: ticketsData, error: ticketsError } = await supabase.from('suspended_tickets').select('*').is('claimed_by', null);
        if (ticketsError) {
          console.error("Erreur lors de la récupération des tickets:", ticketsError.message);
          // Si la table n'existe pas, on retourne un tableau vide
          if (ticketsError.message.includes("relation") && ticketsError.message.includes("does not exist")) {
            setSuspendedTickets([]);
          } else {
            throw ticketsError;
          }
        } else {
          setSuspendedTickets(ticketsData || []);
        }
      } catch (e) {
        console.error("Erreur lors de la récupération des tickets:", e);
        setSuspendedTickets([]);
      }

    } catch (e: any) {
      console.error("Erreur générale lors de la récupération des données:", e.message);
    } finally {
      if (!isRecursiveCall) {
        setLoading(false);
      }
    }
  }, [location, user?.id]);

  const addSingleSimulatedSouffle = async () => {
    if (!location) return;

    const currentSimulatedCount = souffles.filter(s => s.isSimulated).length;
    if (currentSimulatedCount >= MAX_SIMULATED_SOUFFLES) {
      return;
    }

    try {
      const souffle = generateInitialSouffleBatch(location, 1)[0];
      const souffleData = {
          id_data: souffle.id,
          content_data: souffle.content,
          latitude_data: souffle.latitude,
          longitude_data: souffle.longitude,
          created_at_data: souffle.createdAt.toISOString(),
          expires_at_data: souffle.expiresAt.toISOString(),
          is_flagged_data: souffle.moderation.status === 'pending',
      };

      const { error } = await supabase.rpc('create_single_simulated_souffle', souffleData);
      if (error) {
        console.error("Erreur lors de l'ajout d'un souffle simulé:", error.message);
      } else {
        fetchData(true);
      }
    } catch (e: any) {
      console.error("Erreur lors de la simulation de souffle:", e.message);
    }
  };

  useEffect(() => {
    if (location) {
      fetchData();
    }
  }, [location, fetchData]);

  useEffect(() => {
    const simulationInterval = setInterval(() => {
      addSingleSimulatedSouffle();
    }, 120000);

    return () => clearInterval(simulationInterval);
  }, [location, souffles]);

  useEffect(() => {
    try {
      const souffleChannel = supabase.channel('souffles_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'souffles' }, () => fetchData(true)).subscribe();
      const ticketChannel = supabase.channel('tickets_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'suspended_tickets' }, () => fetchData(true)).subscribe();
      
      return () => {
        supabase.removeChannel(souffleChannel);
        supabase.removeChannel(ticketChannel);
      };
    } catch (error) {
      console.error("Erreur lors de la configuration des canaux Supabase:", error);
      return () => {};
    }
  }, [fetchData]);

  const createSouffle = async (data: CreateSouffleData): Promise<{ success: boolean; error?: string }> => {
    if (!location || !user) {
      return { success: false, error: "Utilisateur ou localisation introuvable." };
    }

    if (user.isMaster) {
      console.log("Mode Maître : Création de souffle désactivée.");
      return { success: true };
    }

    const validationResult = validateSouffleContent(data.content);
    if (validationResult.status === 'blocked') {
      return { success: false, error: validationResult.reasons.join(', ') };
    }

    try {
      const newSouffleData = {
        user_id: user.id,
        content: validationResult.sanitizedContent ? JSON.parse(validationResult.sanitizedContent) : data.content,
        latitude: location.latitude,
        longitude: location.longitude,
        expires_at: new Date(Date.now() + data.duration * 60 * 60 * 1000).toISOString(),
        sticker: data.sticker,
        background_id: data.backgroundId,
        is_simulated: false,
        moderation: {
          status: validationResult.status === 'flagged' ? 'pending' : 'clean',
          votes: [],
        },
        language_code: currentLanguage,
        voice_id: data.voiceId,
      };

      const { data: insertedData, error } = await supabase
        .from('souffles')
        .insert(newSouffleData)
        .select()
        .single();

      if (error) {
        console.error("Erreur d'insertion Supabase:", error);
        return { success: false, error: error.message };
      }

      await fetchData(true);
      trackSouffleCreated();
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la création du souffle:", error);
      return { success: false, error: error.message };
    }
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
      const { error } = await supabase.rpc('clear_all_simulated_souffles');
      if (error) {
        console.error("Erreur lors du nettoyage des souffles simulés:", error.message);
        throw error;
      }
      
      await fetchData();
    } catch (e: any) {
      console.error("Erreur lors du nettoyage des souffles simulés:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const placeSuspendedTicket = async (): Promise<void> => {
    if (!location || !user || user.isMaster) return;
    try {
      const { error } = await supabase.from('suspended_tickets').insert({ latitude: location.latitude, longitude: location.longitude });
      if (error) console.error("Erreur lors du dépôt du ticket:", error);
    } catch (error) {
      console.error("Erreur lors du dépôt du ticket:", error);
    }
  };

  const claimSuspendedTicket = async (ticketId: string): Promise<boolean> => {
    if (!user) return false;
    if (user.isMaster) {
      setSuspendedTickets(prev => prev.filter(t => t.id !== ticketId));
      return true;
    }
    try {
      const { error } = await supabase.from('suspended_tickets').update({ claimed_by: user.id, claimed_at: new Date().toISOString() }).eq('id', ticketId);
      if (error) {
        console.error("Erreur lors de la réclamation du ticket:", error);
        return false;
      }
      await addPremiumCredit();
      return true;
    } catch (error) {
      console.error("Erreur lors de la réclamation du ticket:", error);
      return false;
    }
  };

  const reportSouffle = async (souffleId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Utilisateur non authentifié." };
    try {
      const { error } = await supabase.rpc('report_souffle', { souffle_id_to_report: souffleId });
      if (error) throw error;
      setSouffles(prevSouffles => prevSouffles.filter(s => s.id !== souffleId));
      return { success: true };
    } catch (e: any) {
      console.error("Erreur lors du signalement du souffle:", e.message);
      return { success: false, error: e.message };
    }
  };

  const submitModerationVote = async (souffleId: string, userId: string, decision: 'approve' | 'reject') => {
    try {
      const { error } = await supabase.rpc('submit_moderation_vote', { souffle_id: souffleId, voter_id: userId, vote_decision: decision });
      if (error) {
        throw new Error(`Erreur lors du vote de modération: ${error.message}`);
      }
      await fetchData(true);
    } catch (e) {
      console.error(e);
    }
  };

  const value = {
    souffles, suspendedTickets, loading,
    createSouffle, revealSouffle,
    refreshSouffles: fetchData,
    clearSimulatedSouffles,
    placeSuspendedTicket,
    claimSuspendedTicket,
    submitModerationVote,
    reportSouffle,
  };

  return <SouffleContext.Provider value={value}>{children}</SouffleContext.Provider>;
}

export function useSouffle() {
  const context = useContext(SouffleContext);
  if (context === undefined) throw new Error('useSouffle doit être utilisé à l\'intérieur d\'un SouffleProvider');
  return context;
}