import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ImageBackground,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Shield, RefreshCw, UserCheck } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSouffle } from '@/contexts/SouffleContext';
import ModerationCard from '@/components/ModerationCard';
import type { Souffle } from '@/types/souffle';

export default function ModerationScreen() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { souffles, submitModerationVote } = useSouffle();
  const [moderationQueue, setModerationQueue] = useState<Souffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused();

  // La condition d'accès est claire : être authentifié et avoir le niveau 'trusted'
  const canModerate = isAuthenticated && user && user.moderationLevel === 'trusted';

  useEffect(() => {
    // On ne charge la file que si l'utilisateur est autorisé
    if (isFocused && canModerate) {
      loadModerationQueue();
    } else {
      setIsLoading(false);
    }
    // Ce hook se déclenche quand l'écran est affiché, si l'utilisateur peut modérer, ou si la liste des souffles change
  }, [isFocused, canModerate, souffles]);

  const loadModerationQueue = () => {
    setIsLoading(true);
    // 1. On ne prend que les souffles en attente ('pending')
    const queue = souffles.filter(s => 
        s.moderation.status === 'pending' &&
        // 2. On s'assure que l'utilisateur n'a pas déjà voté pour ce souffle
        user && !s.moderation.votes.some(v => v.userId === user.id)
    );
    // 3. On trie pour afficher les plus récents en premier
    queue.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setModerationQueue(queue);
    setIsLoading(false);
  };
  
  // La fonction de vote reste la même, elle est passée à chaque carte
  const handleVote = (souffleId: string, decision: 'approve' | 'reject') => {
    if (!user) return;
    
    const title = decision === 'approve' ? t('moderation.approveTitle') : t('moderation.rejectTitle');
    const message = decision === 'approve' ? t('moderation.approveMessage') : t('moderation.rejectMessage');
    const confirmText = decision === 'approve' ? t('moderation.approveConfirm') : t('moderation.rejectConfirm');

    Alert.alert(title, message, [
      { text: t('cancel'), style: 'cancel' },
      { 
        text: confirmText, 
        style: decision === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          await submitModerationVote(souffleId, user.id, decision);
          Alert.alert("Vote enregistré", "Merci pour votre contribution ! Votre vote a été pris en compte.");
          // La liste se mettra à jour automatiquement grâce au `useEffect` qui dépend de `souffles`
        }
      }
    ]);
  };

  const MainContent = () => {
    // Cas 1 : Utilisateur non connecté
    if (!isAuthenticated) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.noticeBox}>
                    <Shield size={48} color="#8B7D6B" />
                    <Text style={styles.notAuthorizedTitle}>{t('moderation.notAuthorizedTitle')}</Text>
                    <Text style={styles.notAuthorizedText}>Veuillez vous connecter pour accéder à cette section.</Text>
                </View>
            </View>
        );
    }
    
    // Cas 2 : L'utilisateur n'a pas le niveau requis
    if (!canModerate) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.noticeBox}>
                    <UserCheck size={48} color="#8B7D6B" />
                    <Text style={styles.notAuthorizedTitle}>Accès à la modération</Text>
                    <Text style={styles.notAuthorizedText}>Votre score de modérateur n'est pas encore assez élevé. Continuez à utiliser l'application et à participer de manière constructive pour gagner des points et débloquer cette fonctionnalité.</Text>
                </View>
            </View>
        );
    }

    // Cas 3 : L'utilisateur peut modérer, on affiche l'interface
    return (
        <>
            <View style={styles.header}>
                <Text style={styles.title}>{t('moderation.title')}</Text>
                <Text style={styles.subtitle}>{t('moderation.subtitle')}</Text>
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color="#8B7D6B" style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={moderationQueue}
                    renderItem={({ item }) => (
                        <ModerationCard 
                            souffle={item} 
                            onVote={(decision) => handleVote(item.id, decision)}
                        />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.content}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyQueue}>
                          <Shield size={60} color="#A8C8E1" />
                          <Text style={styles.emptyQueueText}>{t('moderation.emptyQueue')}</Text>
                          <Text style={styles.emptyQueueSubtext}>{t('moderation.emptyQueueSubtext')}</Text>
                          <TouchableOpacity style={styles.refreshButton} onPress={loadModerationQueue}>
                              <RefreshCw size={16} color="#8B7D6B" />
                              <Text style={styles.refreshButtonText}>{t('moderation.refresh')}</Text>
                          </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/fond.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <MainContent />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: { 
    flex: 1, 
    backgroundColor: 'transparent'
  },
  header: { 
    paddingHorizontal: 24, 
    paddingVertical: 20, 
    paddingTop: 60, 
    alignItems: 'center', 
    backgroundColor: 'transparent',
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(139, 125, 107, 0.08)' 
  },
  title: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', letterSpacing: 1, marginBottom: 6, fontStyle: 'italic' },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', letterSpacing: 0.5, fontStyle: 'italic' },
  content: { 
    paddingHorizontal: 16, 
    paddingTop: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noticeBox: {
    backgroundColor: 'rgba(249, 245, 240, 0.85)',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.15)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  notAuthorizedTitle: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginTop: 20, marginBottom: 15, fontStyle: 'italic' },
  notAuthorizedText: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  emptyQueue: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyQueueText: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginTop: 20, marginBottom: 10, fontStyle: 'italic' },
  emptyQueueSubtext: { fontSize: 13, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', lineHeight: 20, marginBottom: 30, fontStyle: 'italic' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 125, 107, 0.1)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.2)' },
  refreshButtonText: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', marginLeft: 8, fontStyle: 'italic' },
});