import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Souffle, CreateSouffleData, SuspendedTicket } from '@/types/souffle';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { SouffleStorage } from '@/utils/storage';
import { useAnalytics } from '@/hooks/useAnalytics';
import { validateSouffleContent } from '@/utils/moderation';
import { generateInitialSouffleBatch } from '@/utils/souffleSimulator';
import { v4 as uuidv4 } from 'uuid';

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
  const [loading, setLoading] = useState(false);
  const { location } = useLocation();
  const { user, addPremiumCredit } = useAuth();
  const { currentLanguage } = useLanguage();
  const { trackSouffleCreated, trackSouffleRevealed } = useAnalytics();

  // Mock implementation that generates simulated data instead of fetching from Supabase
  const fetchData = useCallback(async () => {
    if (!location) return;
    setLoading(true);

    try {
      // Generate simulated souffles if we don't have any yet
      if (souffles.length === 0) {
        const simulatedSouffles = generateInitialSouffleBatch(location, 10);
        const revealedIds = await SouffleStorage.loadRevealedSouffles();
        
        const mappedSouffles = simulatedSouffles.map(souffle => ({
          ...souffle,
          isRevealed: revealedIds.includes(souffle.id) || (user && souffle.userId === user.id)
        }));
        
        setSouffles(mappedSouffles);
      }
      
      // Generate a few suspended tickets
      if (suspendedTickets.length === 0) {
        const tickets: SuspendedTicket[] = Array(3).fill(0).map(() => {
          const randomAngle = Math.random() * 2 * Math.PI;
          const randomDistance = 100 + Math.random() * 400;
          const latOffset = (randomDistance / 111111) * Math.cos(randomAngle);
          const lonOffset = (randomDistance / (111111 * Math.cos(location.latitude * Math.PI / 180))) * Math.sin(randomAngle);
          
          return {
            id: uuidv4(),
            latitude: location.latitude + latOffset,
            longitude: location.longitude + lonOffset,
            createdAt: new Date()
          };
        });
        
        setSuspendedTickets(tickets);
      }
    } catch (e: any) {
      console.error("Error generating simulated data:", e.message);
    } finally {
      setLoading(false);
    }
  }, [location, user?.id, souffles.length, suspendedTickets.length]);

  // Add a single simulated souffle occasionally
  const addSingleSimulatedSouffle = useCallback(() => {
    if (!location) return;

    const currentSimulatedCount = souffles.filter(s => s.isSimulated).length;
    if (currentSimulatedCount >= MAX_SIMULATED_SOUFFLES) {
      return;
    }

    try {
      const newSouffle = generateInitialSouffleBatch(location, 1)[0];
      setSouffles(prev => [...prev, newSouffle]);
    } catch (e: any) {
      console.error("Error adding simulated souffle:", e.message);
    }
  }, [location, souffles]);

  useEffect(() => {
    if (location) {
      fetchData();
    }
  }, [location, fetchData]);

  useEffect(() => {
    const simulationInterval = setInterval(() => {
      addSingleSimulatedSouffle();
    }, 120000); // Add a new souffle every 2 minutes

    return () => clearInterval(simulationInterval);
  }, [location, addSingleSimulatedSouffle]);

  const createSouffle = async (data: CreateSouffleData): Promise<{ success: boolean; error?: string }> => {
    if (!location || !user) {
      return { success: false, error: "User or location not found." };
    }

    if (user.isMaster) {
      console.log("Master mode: Souffle creation disabled.");
      return { success: true };
    }

    const validationResult = validateSouffleContent(data.content);
    if (validationResult.status === 'blocked') {
      return { success: false, error: validationResult.reasons.join(', ') };
    }

    try {
      const newSouffle: Souffle = {
        id: uuidv4(),
        userId: user.id,
        pseudo: user.pseudo || 'Anonymous',
        content: validationResult.sanitizedContent ? JSON.parse(validationResult.sanitizedContent) : data.content,
        latitude: location.latitude,
        longitude: location.longitude,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + data.duration * 60 * 60 * 1000),
        isRevealed: true, // User's own souffles are always revealed
        sticker: data.sticker,
        backgroundId: data.backgroundId,
        isSimulated: false,
        moderation: {
          status: validationResult.status === 'flagged' ? 'pending' : 'clean',
          votes: [],
        },
        language_code: currentLanguage,
        voice_id: data.voiceId,
      };

      setSouffles(prev => [...prev, newSouffle]);
      trackSouffleCreated();
      return { success: true };
    } catch (error: any) {
      console.error("Error creating souffle:", error);
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
      setSouffles(prev => prev.filter(s => !s.isSimulated));
    } catch (e: any) {
      console.error("Error clearing simulated souffles:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const placeSuspendedTicket = async (): Promise<void> => {
    if (!location || !user || user.isMaster) return;
    try {
      const newTicket: SuspendedTicket = {
        id: uuidv4(),
        latitude: location.latitude,
        longitude: location.longitude,
        createdAt: new Date()
      };
      setSuspendedTickets(prev => [...prev, newTicket]);
    } catch (error) {
      console.error("Error placing suspended ticket:", error);
    }
  };

  const claimSuspendedTicket = async (ticketId: string): Promise<boolean> => {
    if (!user) return false;
    if (user.isMaster) {
      setSuspendedTickets(prev => prev.filter(t => t.id !== ticketId));
      return true;
    }
    try {
      setSuspendedTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, claimed_by: user.id, claimed_at: new Date() } : t
      ));
      await addPremiumCredit();
      return true;
    } catch (error) {
      console.error("Error claiming ticket:", error);
      return false;
    }
  };

  const reportSouffle = async (souffleId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not logged in." };
    try {
      // Remove the reported souffle from the list
      setSouffles(prevSouffles => prevSouffles.filter(s => s.id !== souffleId));
      return { success: true };
    } catch (e: any) {
      console.error("Error reporting souffle:", e.message);
      return { success: false, error: e.message };
    }
  };

  const submitModerationVote = async (souffleId: string, userId: string, decision: 'approve' | 'reject') => {
    try {
      setSouffles(prev => prev.map(souffle => {
        if (souffle.id === souffleId) {
          const updatedVotes = [
            ...souffle.moderation.votes,
            { userId, decision, timestamp: new Date() }
          ];
          
          return {
            ...souffle,
            moderation: {
              ...souffle.moderation,
              votes: updatedVotes,
              status: decision === 'approve' ? 'approved' : 'rejected'
            }
          };
        }
        return souffle;
      }));
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
  if (context === undefined) throw new Error('useSouffle must be used inside a SouffleProvider');
  return context;
}