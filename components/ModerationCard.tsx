import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react-native';
import type { Souffle } from '@/types/souffle';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEmotionDisplay } from '@/utils/emotionUtils';
import { getTimeAgo } from '@/utils/time';

interface ModerationCardProps {
  souffle: Souffle;
  onVote: (decision: 'approve' | 'reject') => void;
}

const CARD_COLORS: string[] = [
  'rgba(232, 239, 246, 0.7)',
  'rgba(234, 246, 234, 0.7)',
  'rgba(253, 246, 235, 0.7)',
  'rgba(247, 237, 227, 0.7)',
  'rgba(253, 237, 237, 0.7)',
];

const VOTE_QUORUM = 3;

export default function ModerationCard({ souffle, onVote }: ModerationCardProps) {
  const { t } = useLanguage();

  const approveCount = souffle.moderation.votes.filter(v => v.decision === 'approve').length;
  const rejectCount = souffle.moderation.votes.filter(v => v.decision === 'reject').length;
  const cardColor = CARD_COLORS[souffle.id.charCodeAt(souffle.id.length - 1) % CARD_COLORS.length];
  
  const primaryReason = souffle.moderation.reasons && souffle.moderation.reasons.length > 0
    ? souffle.moderation.reasons[0]
    : null;
    
  const votesNeeded = VOTE_QUORUM - Math.max(approveCount, rejectCount);
  const showVotesNeeded = votesNeeded > 0;

  return (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
            <Clock size={12} color="#8B7D6B" />
            <Text style={styles.headerText}>{t('moderation.deposited_ago', { time: getTimeAgo(souffle.createdAt, t) })}</Text>
        </View>
        {primaryReason && (
          <View style={styles.flagBadge}>
            <AlertTriangle size={12} color="#D97706" />
            <Text style={styles.flagBadgeText}>{t(`moderation.reasons.${primaryReason}`, primaryReason)}</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        {souffle.content.jeMeSens && (
            <Text style={styles.emotionText}>
                {getEmotionDisplay(souffle.content.jeMeSens)?.emoji} {t(`emotions.${souffle.content.jeMeSens}`)}
            </Text>
        )}
        <Text style={styles.messageText}>"{souffle.content.messageLibre}"</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.voteRow}>
          <Text style={styles.voteCount}>👍 {approveCount}</Text>
          {showVotesNeeded && (
            <Text style={styles.votesNeededText}>
              {t('moderation.votesNeededText', { count: votesNeeded })}
            </Text>
          )}
          <Text style={styles.voteCount}>👎 {rejectCount}</Text>
        </View>
        <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => onVote('reject')}>
                <XCircle size={18} color="#F9F5F0" />
                <Text style={styles.buttonText}>{t('moderation.reject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={() => onVote('approve')}>
                <CheckCircle2 size={18} color="#F9F5F0" />
                <Text style={styles.buttonText}>{t('moderation.approve')}</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 107, 0.1)',
    overflow: 'hidden',
    shadowColor: '#5D4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 125, 107, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    color: '#8B7D6B',
    fontStyle: 'italic',
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderColor: 'rgba(217, 119, 6, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  flagBadgeText: {
    fontSize: 10,
    fontFamily: 'Georgia',
    color: '#D97706',
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 20,
  },
  emotionText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    color: '#5D4E37',
    fontStyle: 'italic',
    marginBottom: 15,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Georgia',
    color: '#4D3B2F',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 15,
  },
  voteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 125, 107, 0.1)',
  },
  voteCount: {
    fontSize: 14,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
  },
  votesNeededText: {
    fontSize: 11,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: '#8B7D6B',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectButton: {
    backgroundColor: '#C17B5C',
  },
  approveButton: {
    backgroundColor: '#A8C8E1',
  },
  buttonText: {
    color: '#F9F5F0',
    fontFamily: 'Georgia',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: 'bold',
  },
});