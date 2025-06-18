import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
  FlatList,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ChartBar as BarChart3, Eye, Edit3, Calendar, Heart } from 'lucide-react-native';
import { useSouffle } from '@/contexts/SouffleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEmotionDisplay } from '@/utils/emotionUtils';
import type { Souffle } from '@/types/souffle';

const { width } = Dimensions.get('window');

const PALETTE = {
  blue: 'rgba(168, 200, 225, 0.6)',
  green: 'rgba(184, 230, 184, 0.6)',
  sand: 'rgba(244, 228, 188, 0.7)',
  brown: 'rgba(212, 165, 116, 0.6)',
  white_transparent: 'rgba(255, 255, 255, 0.8)',
  light_sand: 'rgba(249, 247, 244, 0.95)',
  blue_light_bg: 'rgba(168, 200, 225, 0.6)',
};

interface UserStats {
  soufflesCreated: number;
  soufflesRevealed: number;
  placesVisited: number;
  daysActive: number;
  favoriteEmotion: string;
  longestStreak: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  emoji: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

interface DailyActivity {
  date: string;
  soufflesCreated: number;
  soufflesRevealed: number;
  distanceWalked: number;
}

const ACHIEVEMENTS_LOGIC: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  { id: 'first_souffle', emoji: '🌱', target: 1 },
  { id: 'explorer', emoji: '🗺️', target: 10 },
  { id: 'poet', emoji: '🪶', target: 25 },
  { id: 'consistent', emoji: '📅', target: 7 },
  { id: 'social', emoji: '🤝', target: 5 },
];


export default function DashboardScreen() {
  const { souffles } = useSouffle();
  const { isAuthenticated, user } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const isFocused = useIsFocused();

  const [userStats, setUserStats] = useState<UserStats>({
    soufflesCreated: 0,
    soufflesRevealed: 0,
    placesVisited: 0,
    daysActive: 0,
    favoriteEmotion: '',
    longestStreak: 0,
    achievements: [],
  });

  const [weeklyActivity, setWeeklyActivity] = useState<DailyActivity[]>([]);
  const [mySouffles, setMySouffles] = useState<Souffle[]>([]);

  useEffect(() => {
    if (isAuthenticated && isFocused) {
        loadUserStats();
        loadWeeklyActivity();
        if (user) {
            // CORRECTION : S'assure que user.id est bien utilisé pour le filtrage
            const userSouffles = souffles
                .filter(s => s.userId === user.id && !s.isSimulated)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setMySouffles(userSouffles);
        }
    }
  }, [isAuthenticated, isFocused, user, souffles]);

  // --- LOGIQUE MANQUANTE RESTAURÉE ---
  const calculateAchievements = (stats: Partial<UserStats>): Achievement[] => {
    return ACHIEVEMENTS_LOGIC.map(achievement => {
      let progress = 0;
      let unlockedAt: Date | undefined;
      switch (achievement.id) {
        case 'first_souffle': progress = Math.min(stats.soufflesCreated || 0, achievement.target || 1); break;
        case 'explorer': progress = Math.min(stats.soufflesRevealed || 0, achievement.target || 10); break;
        case 'poet': progress = Math.min(stats.soufflesCreated || 0, achievement.target || 25); break;
        case 'consistent': progress = Math.min(stats.daysActive || 0, achievement.target || 7); break;
        case 'social': progress = Math.min(stats.placesVisited || 0, achievement.target || 5); break;
      }
      if (progress >= (achievement.target || 1)) {
        unlockedAt = new Date();
      }
      return { ...achievement, progress, unlockedAt };
    });
  };

  const calculateLongestStreak = (activity: DailyActivity[]): number => {
    if (activity.length === 0) return 0;
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;
    const sortedActivity = [...activity].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedActivity.forEach((day: DailyActivity) => {
      const currentDate = new Date(day.date);
      if (lastDate && (currentDate.getTime() - lastDate.getTime()) === (24 * 60 * 60 * 1000)) {
        currentStreak++;
      }
      else if (!lastDate || (currentDate.getTime() - lastDate.getTime()) > (24 * 60 * 60 * 1000)) {
        currentStreak = 1;
      }
      lastDate = currentDate;
      maxStreak = Math.max(maxStreak, currentStreak);
    });
    return maxStreak;
  };

  const loadUserStats = async () => {
    try {
      const savedActivity = await AsyncStorage.getItem('@souffle:user_activity');
      const revealedSoufflesData = await AsyncStorage.getItem('@souffle:revealed_souffles');
      const revealedSouffles = revealedSoufflesData ? JSON.parse(revealedSoufflesData) : [];
      const activity = savedActivity ? JSON.parse(savedActivity) : [];
      const myCreatedSouffles = souffles.filter(s => s.userId === user?.id && !s.isSimulated);
      const emotionCounts: { [key: string]: number } = {};
      myCreatedSouffles.forEach(souffle => {
        if (souffle.content.jeMeSens) {
          emotionCounts[souffle.content.jeMeSens] = (emotionCounts[souffle.content.jeMeSens] || 0) + 1;
        }
      });
      const favoriteEmotion = Object.keys(emotionCounts).length > 0 ? Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b, ''
      ) : '';
      const placesVisited = new Set(myCreatedSouffles.map(s => `${Math.round(s.latitude * 1000)}_${Math.round(s.longitude * 1000)}`)).size;
      const achievements = calculateAchievements({
        soufflesCreated: myCreatedSouffles.length,
        soufflesRevealed: revealedSouffles.length,
        daysActive: activity.length,
        placesVisited: placesVisited,
      });
      const stats: UserStats = {
        soufflesCreated: myCreatedSouffles.length,
        soufflesRevealed: revealedSouffles.length,
        placesVisited: placesVisited,
        daysActive: activity.length,
        favoriteEmotion,
        longestStreak: calculateLongestStreak(activity),
        achievements,
      };
      setUserStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const loadWeeklyActivity = async () => {
    try {
      const savedActivity = await AsyncStorage.getItem('@souffle:user_activity');
      const activity: DailyActivity[] = savedActivity ? JSON.parse(savedActivity) : [];
      
      const last7Days: DailyActivity[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const foundDay = activity.find((a: DailyActivity) => a.date === dateStr);
        last7Days.push(foundDay || { date: dateStr, soufflesCreated: 0, soufflesRevealed: 0, distanceWalked: 0 });
      }
      setWeeklyActivity(last7Days);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'activité:', error);
    }
  };
  // --- FIN DE LA LOGIQUE RESTAURÉE ---


  const renderStatCard = (titleKey: string, value: string | number, icon: React.ReactNode, subtitleKey: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statTitle}>{t(titleKey)}</Text>
      <Text style={styles.statSubtitle}>{t(subtitleKey)}</Text>
    </View>
  );

  const renderAchievement = (achievement: Achievement) => (
    <View key={achievement.id} style={[styles.achievementCard, achievement.unlockedAt && styles.achievementUnlocked]}>
      <Text style={styles.achievementEmoji}>{achievement.emoji}</Text>
      <View style={styles.achievementContent}>
        <Text style={[styles.achievementTitle, achievement.unlockedAt && styles.achievementTitleUnlocked]}>
          {t(`achievements.${achievement.id}.title`)}
        </Text>
        <Text style={styles.achievementDescription}>{t(`achievements.${achievement.id}.description`)}</Text>
        {!achievement.unlockedAt && achievement.target && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, ((achievement.progress || 0) / achievement.target) * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{`${achievement.progress || 0} / ${achievement.target}`}</Text>
          </View>
        )}
        {achievement.unlockedAt && (<Text style={styles.unlockedText}>{t('dashboard.achievements.achievementUnlocked')} ✨</Text>)}
      </View>
    </View>
  );
  
  const renderMySouffleItem = ({ item }: { item: Souffle }) => (
    <View style={styles.souffleHistoryCard}>
        <Text style={styles.souffleHistoryText} numberOfLines={3}>"{item.content.messageLibre}"</Text>
        <View style={styles.souffleHistoryFooter}>
            <Text style={styles.souffleHistoryDate}>
                {new Date(item.createdAt).toLocaleDateString(currentLanguage, { day: '2-digit', month: 'short'})}
            </Text>
            <View style={[styles.souffleReadStatus, item.hasBeenRead && styles.souffleRead]}>
                <Eye size={12} color={item.hasBeenRead ? '#38761d' : '#8B7D6B'} />
            </View>
        </View>
    </View>
  );
  
  const MainContent = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dashboard.title')}</Text>
        <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
        {isAuthenticated && user?.pseudo && (<Text style={styles.welcomeText}>{t('dashboard.welcome', { pseudo: user.pseudo })}</Text>)}
      </View>
      
      {isAuthenticated ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            {renderStatCard('dashboard.stats.created', userStats.soufflesCreated, <Edit3 size={20} color="#8B7D6B" />, 'dashboard.stats.createdSubtitle', PALETTE.blue)}
            {renderStatCard('dashboard.stats.revealed', userStats.soufflesRevealed, <Eye size={20} color="#8B7D6B" />, 'dashboard.stats.revealedSubtitle', PALETTE.green)}
            {renderStatCard('dashboard.stats.activeDays', userStats.daysActive, <Calendar size={20} color="#8B7D6B" />, 'dashboard.stats.activeDaysSubtitle', PALETTE.sand)}
            {renderStatCard('dashboard.stats.places', userStats.placesVisited, <Heart size={20} color="#8B7D6B" />, 'dashboard.stats.placesSubtitle', PALETTE.brown)}
          </View>

          {userStats.favoriteEmotion && (
            <View style={[styles.sectionContainer, { backgroundColor: PALETTE.light_sand }]}>
              <Text style={styles.sectionTitle}>{t('dashboard.emotion.title')}</Text>
              <View style={styles.emotionDisplay}>
                <Text style={styles.emotionEmoji}>{getEmotionDisplay(userStats.favoriteEmotion)?.emoji}</Text>
                <Text style={styles.emotionLabel}>{t(`emotions.${userStats.favoriteEmotion}`)}</Text>
              </View>
              <Text style={styles.emotionSubtext}>{t('dashboard.emotion.subtitle')}</Text>
            </View>
          )}

          {mySouffles.length > 0 && (
            <View style={[styles.sectionContainer, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}>
                <Text style={styles.sectionTitle}>Mes derniers souffles déposés</Text>
                <FlatList
                    data={mySouffles.slice(0, 10)}
                    renderItem={renderMySouffleItem}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 10, paddingLeft: 5 }}
                />
            </View>
          )}

          <View style={[styles.sectionContainer, { backgroundColor: PALETTE.white_transparent }]}>
            <Text style={styles.sectionTitle}>{t('dashboard.weeklyActivity.title')}</Text>
            <View style={styles.activityChart}>
              {weeklyActivity.map((day) => {
                const maxActivity = Math.max(...weeklyActivity.map(d => d.soufflesCreated + d.soufflesRevealed), 1);
                const height = ((day.soufflesCreated + day.soufflesRevealed) / maxActivity) * 60;
                return (
                  <View key={day.date} style={styles.activityBar}>
                    <View style={[styles.activityBarFill, { height: Math.max(height, 5) }]} />
                    <Text style={styles.activityDay}>{new Date(day.date).toLocaleDateString(currentLanguage, { weekday: 'short' })}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.sectionContainer, { paddingHorizontal: 0, backgroundColor: PALETTE.blue_light_bg }]}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>{t('dashboard.achievements.title')}</Text>
            <Text style={[styles.sectionSubtitle, { paddingHorizontal: 20 }]}>{t('dashboard.achievements.subtitle')}</Text>
            <View style={styles.achievementsList}>{userStats.achievements.map(renderAchievement)}</View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      ) : (
        <View style={styles.anonymousContainer}>
          <BarChart3 size={48} color="#8B7D6B" />
          <Text style={styles.anonymousTitle}>{t('dashboard.anonymous.title')}</Text>
          <Text style={styles.anonymousText}>{t('dashboard.anonymous.text')}</Text>
        </View>
      )}
    </>
  );

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
  backgroundImage: { flex: 1, resizeMode: 'cover' },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: 24, paddingVertical: 20, paddingTop: 60, alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)' },
  title: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', letterSpacing: 1, marginBottom: 6, fontStyle: 'italic' },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', letterSpacing: 0.5, marginBottom: 8, fontStyle: 'italic' },
  welcomeText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  content: { flex: 1, paddingHorizontal: 24 },
  anonymousContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  anonymousTitle: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', marginTop: 20, marginBottom: 15, fontStyle: 'italic' },
  anonymousText: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  statCard: { width: (width - 60) / 2, borderRadius: 18, padding: 20, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  statIcon: { marginBottom: 12 },
  statValue: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', fontWeight: 'bold', marginBottom: 6, fontStyle: 'italic' },
  statTitle: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic' },
  statSubtitle: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', marginTop: 4, fontStyle: 'italic', opacity: 0.7 },
  sectionContainer: { borderRadius: 18, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, },
  emotionDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emotionEmoji: { fontSize: 32, marginRight: 15 },
  emotionLabel: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  emotionSubtext: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', marginTop: 5 },
  sectionTitle: { fontSize: 18, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 20, fontStyle: 'italic', textAlign: 'center' },
  sectionSubtitle: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', marginBottom: 20, fontStyle: 'italic', textAlign: 'center', marginTop: -15 },
  activityChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: 75, paddingHorizontal: 10, paddingTop: 20, paddingBottom: 10 },
  activityBar: { alignItems: 'center', flex: 1 },
  activityBarFill: { width: 20, backgroundColor: '#A8C8E1', borderRadius: 10, marginBottom: 10 },
  activityDay: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic' },
  achievementsList: { gap: 12, paddingHorizontal: 20 },
  achievementCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 15, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(139, 125, 107, 0.1)',
  },
  achievementUnlocked: { 
    backgroundColor: 'rgba(255, 255, 255, 0.9)'
  },
  achievementEmoji: { fontSize: 24, marginRight: 15, marginTop: 2 },
  achievementContent: { flex: 1 },
  achievementTitle: { 
    fontSize: 15,
    fontFamily: 'Georgia', 
    color: '#5D4E37', 
    marginBottom: 4, 
    fontStyle: 'italic' 
  },
  achievementTitleUnlocked: { fontWeight: '500' },
  achievementDescription: { 
    fontSize: 13,
    fontFamily: 'Georgia', 
    color: '#8B7D6B', 
    marginBottom: 8, 
    lineHeight: 18,
    fontStyle: 'italic' 
  },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 4, backgroundColor: 'rgba(139, 125, 107, 0.2)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#A8C8E1', borderRadius: 2 },
  progressText: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic' },
  unlockedText: { fontSize: 11, fontFamily: 'Georgia', color: '#A8C8E1', fontStyle: 'italic' },
  bottomSpacing: { height: 40 },
  souffleHistoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 180,
    height: 120,
    marginRight: 15,
    padding: 15,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.1)',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  souffleHistoryText: {
    fontSize: 12,
    fontFamily: 'Georgia',
    color: '#4D3B2F',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  souffleHistoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  souffleHistoryDate: {
    fontSize: 10,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7D6B',
  },
  souffleReadStatus: {
    padding: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 125, 107, 0.1)',
  },
  souffleRead: {
    backgroundColor: 'rgba(56, 118, 29, 0.15)',
  },
});