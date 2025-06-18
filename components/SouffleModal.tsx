import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView,
  Alert, Platform, Image, ActivityIndicator,
  // CORRECTION: On importe les composants nécessaires
  Pressable, Keyboard
} from 'react-native';
import { X, MapPin, Clock, Sparkles, ChevronDown, Check } from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AVAILABLE_STICKERS, getStickersByCategory } from '@/utils/stickers';
import type { Sticker } from '@/utils/stickers';
import { AVAILABLE_BACKGROUNDS, SouffleBackground } from '@/utils/backgrounds';
import { validateSouffleContent } from '@/utils/moderation';
import { getEmotionDisplay } from '@/utils/emotionUtils';

const EMOTION_IDS = [
  '', 'joyeux', 'triste', 'colere', 'anxieux', 'aimant', 'fatigue',
  'detendu', 'pensif', 'bouleverse', 'apaise', 'perdu', 'ironique',
  'silencieux', 'emu', 'honteux',
];

export default function SouffleModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const { location } = useLocation();
  const { createSouffle } = useSouffle();
  const { t } = useLanguage();
  const { user, spendPremiumCredit } = useAuth();
  
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState('');
  const [duration, setDuration] = useState<24 | 48>(24);
  const [selectedSticker, setSelectedSticker] = useState<string | undefined>();
  const [showStickers, setShowStickers] = useState(false);
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<string>('default');

  const ownedBackgrounds = user?.ownedBackgrounds || [];
  const maxLength = 280;
  const remainingChars = maxLength - content.length;

  useEffect(() => {
    if (!visible) {
      setContent('');
      setEmotion('');
      setSelectedSticker(undefined);
      setShowStickers(false);
      setShowEmotionPicker(false);
      setIsSubmitting(false);
      setDuration(24);
      setSelectedBackground('default');
    }
  }, [visible]);

  const handleBackgroundSelect = async (background: SouffleBackground) => {
    if (ownedBackgrounds.includes(background.id) || !background.isPremium) {
      setSelectedBackground(background.id);
      return;
    }

    const currentCredits = user?.premiumUsageCredits || 0;
    if (currentCredits > 0) {
      Alert.alert(
        t('shop.item_alert_use_credit_title'),
        t('shop.item_alert_use_credit_message', { count: currentCredits - 1 }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('shop.item_alert_use_credit_cta'),
            onPress: async () => {
              const success = await spendPremiumCredit();
              if (success) {
                setSelectedBackground(background.id);
                Alert.alert(t('shop.item_alert_credit_used_title'), t('shop.item_alert_credit_used_message', { name: background.name }));
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(t('shop.item_alert_premium_required_title'), t('shop.item_alert_premium_required_message'));
    }
  };

  const handleSubmit = async () => {
    if (!location) { Alert.alert(t('error'), t('composeSouffle.positionUnavailable')); return; }
    setIsSubmitting(true);
    const souffleContent = { jeMeSens: emotion || '', messageLibre: content.trim(), ceQueJaimerais: '' };
    const validationResult = validateSouffleContent(souffleContent);
    if (validationResult.status === 'blocked') {
      Alert.alert(t('moderation.blockedMessageTitle'), t('moderation.blockedMessage', { reasons: validationResult.reasons.join('\n- ') }));
      setIsSubmitting(false);
      return;
    }

    let finalContent = souffleContent;
    if (validationResult.status === 'flagged' && validationResult.sanitizedContent) {
      finalContent = JSON.parse(validationResult.sanitizedContent);
      Alert.alert(t('moderation.contentModifiedTitle'), t('moderation.contentModifiedMessage'));
    }
    try {
      const result = await createSouffle({ content: finalContent, latitude: location.latitude, longitude: location.longitude, duration, sticker: selectedSticker, backgroundId: selectedBackground });
      if (result.success) {
        onClose();
        setTimeout(() => Alert.alert(t('composeSouffle.souffleDeposited'), t('composeSouffle.souffleDepositedMessage'), [{ text: t('composeSouffle.wonderful'), style: 'default' }]), 100);
      } else {
        Alert.alert(t('error'), result.error || t('composeSouffle.unexpectedError'), [{ text: t('composeSouffle.understood'), style: 'default' }]);
      }
    } catch (error) {
      console.error('Erreur dans handleSubmit:', error);
      Alert.alert(t('error'), t('composeSouffle.unexpectedError'), [{ text: t('composeSouffle.understood'), style: 'default' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmotionSelect = (emotionId: string) => { setEmotion(emotionId); setShowEmotionPicker(false); };
  const handleStickerToggle = () => setShowStickers(!showStickers);
  const handleStickerSelect = (stickerId: string) => setSelectedSticker(selectedSticker === stickerId ? undefined : stickerId);
  
  const getSelectedEmotionDisplay = () => {
    if (!emotion) return t('emotions.');
    const display = getEmotionDisplay(emotion);
    return `${display?.emoji || ''} ${t(`emotions.${emotion}`)}`;
  };

  const renderStickerCategory = (category: Sticker['category'], titleKey: string) => {
    const stickers = getStickersByCategory(category).filter(sticker => !sticker.isPremium);
    if (stickers.length === 0) return null;
    return (
      <View key={category} style={styles.stickerCategory}>
        <Text style={styles.stickerCategoryTitle}>{t(titleKey)}</Text>
        <View style={styles.stickerGrid}>
          {stickers.map(sticker => (
            <TouchableOpacity
              key={sticker.id}
              style={[styles.stickerItem, selectedSticker === sticker.id && styles.selectedStickerItem]}
              onPress={() => handleStickerSelect(sticker.id)}
            >
              <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* CORRECTION: On entoure le tout d'un `Pressable` pour fermer le clavier */}
      <Pressable style={styles.pressableContainer} onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#8B7D6B" />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('composeSouffle.title')}</Text>
              <View style={styles.decorativeLine} />
              <Text style={styles.subtitle}>{t('composeSouffle.subtitle')}</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Emotion Section */}
              <View style={styles.emotionSection}>
              <Text style={styles.emotionLabel}>{t('composeSouffle.howDoYouFeel')}</Text>
              <TouchableOpacity style={styles.emotionSelector} onPress={() => setShowEmotionPicker(true)}>
                <Text style={[styles.emotionSelectorText, !emotion && styles.emotionPlaceholder]}>
                  {getSelectedEmotionDisplay()}
                </Text>
                <ChevronDown size={18} color="#8B7D6B" />
              </TouchableOpacity>
            </View>
            
            {/* Message Input Section */}
            <View style={styles.textContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={t('composeSouffle.messagePlaceholder')}
                placeholderTextColor="#B8A082"
                multiline
                value={content}
                onChangeText={setContent}
                maxLength={maxLength}
                textAlignVertical="top"
              />
            </View>
            <Text style={[styles.charCountText, remainingChars < 20 && styles.charCountWarning]}>
                {t('composeSouffle.charactersRemaining_other', { count: remainingChars })}
            </Text>

              {/* Backgrounds Section */}
              <View style={styles.backgroundSection}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={14} color="#8B7D6B" />
                  <Text style={styles.sectionTitle}>{t('composeSouffle.souffleBackground')}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
                  {AVAILABLE_BACKGROUNDS.map(bg => {
                    const isOwned = ownedBackgrounds.includes(bg.id);
                    return (
                      <TouchableOpacity
                        key={bg.id}
                        onPress={() => handleBackgroundSelect(bg)}
                        style={[styles.backgroundItem, bg.shape === 'square' ? styles.backgroundItemSquare : styles.backgroundItemCircle, selectedBackground === bg.id && styles.selectedBackgroundItem]}
                      >
                        {bg.source ? <Image source={bg.source} style={[styles.backgroundImagePreview, bg.shape === 'square' ? {borderRadius: 6} : {borderRadius: 30}]} /> : <View style={styles.defaultBackgroundPreview}/>}
                        
                        {isOwned && bg.isPremium && (
                          <View style={styles.ownedIndicator}>
                            <Check size={14} color="#FFF" />
                          </View>
                        )}
                        
                        {bg.isPremium && !isOwned && <Text style={styles.premiumIcon}>✨</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <Text style={styles.backgroundHint}>{t('composeSouffle.backgroundHint')}</Text>
              </View>

            {/* Duration Section */}
            <View style={styles.durationSection}>
                  <View style={styles.sectionHeader}>
                      <Clock size={14} color="#8B7D6B" />
                      <Text style={styles.sectionTitle}>{t('composeSouffle.lifespan')}</Text>
                  </View>
                  <View style={styles.durationButtons}>
                      <TouchableOpacity style={[styles.durationButton, duration === 24 && styles.activeDurationButton]} onPress={() => setDuration(24)}>
                          <Text style={[styles.durationButtonText, duration === 24 && styles.activeDurationButtonText]}>{t('composeSouffle.hours24')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.durationButton, duration === 48 && styles.activeDurationButton]} onPress={() => setDuration(48)}>
                          <Text style={[styles.durationButtonText, duration === 48 && styles.activeDurationButtonText]}>{t('composeSouffle.hours48')}</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, (!content.trim() || !location || isSubmitting) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!content.trim() || !location || isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#F9F5F0" /> : <Text style={styles.submitButtonText}>{t('composeSouffle.depositGently')}</Text>}
            </TouchableOpacity>
          </View>

          {/* Emotion Picker Modal */}
          {showEmotionPicker && (
            <Modal visible={showEmotionPicker} transparent={true} animationType="fade" onRequestClose={() => setShowEmotionPicker(false)}>
              <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEmotionPicker(false)}>
                  <View style={styles.emotionPickerModal}>
                      <Text style={styles.emotionPickerTitle}>{t('composeSouffle.chooseEmotionModalTitle')}</Text>
                      <ScrollView>
                      {EMOTION_IDS.map((emotionId) => (
                          <TouchableOpacity key={emotionId || 'empty'} style={styles.emotionOption} onPress={() => handleEmotionSelect(emotionId)}>
                          <Text style={styles.emotionOptionEmoji}>{getEmotionDisplay(emotionId)?.emoji || '😶'}</Text>
                          <Text style={styles.emotionOptionText}>{t(`emotions.${emotionId}`)}</Text>
                          </TouchableOpacity>
                      ))}
                      </ScrollView>
                  </View>
              </TouchableOpacity>
            </Modal>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressableContainer: {
    flex: 1,
  },
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)'},
  closeButton: { padding: 8 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 16, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  decorativeLine: { width: 50, height: 1, backgroundColor: 'rgba(139, 125, 107, 0.3)', marginVertical: 4 },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic' },
  placeholder: { width: 36 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  emotionSection: { marginBottom: 24 },
  emotionLabel: { fontSize: 14, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 12, fontStyle: 'italic' },
  emotionSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', paddingHorizontal: 16, paddingVertical: 14 },
  emotionSelectorText: { fontSize: 14, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  emotionPlaceholder: { color: '#B8A082' },
  textContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, minHeight: 140, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.12)' },
  textInput: { flex: 1, fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', lineHeight: 24, fontStyle: 'italic' },
  charCountText: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'right', marginTop: 8, fontStyle: 'italic' },
  charCountWarning: { color: '#D4A574' },
  backgroundSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', marginLeft: 8, fontStyle: 'italic' },
  backgroundItem: { width: 60, height: 60, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  defaultBackgroundPreview: { width: '100%', height: '100%', backgroundColor: '#E5D5C8', borderRadius: 30},
  backgroundItemCircle: { borderRadius: 30 },
  backgroundItemSquare: { borderRadius: 8 },
  selectedBackgroundItem: { borderColor: '#A8C8E1' },
  backgroundImagePreview: { width: '100%', height: '100%' },
  premiumIcon: { position: 'absolute', bottom: -2, right: -2, fontSize: 14, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  ownedIndicator: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(76, 175, 80, 0.9)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  backgroundHint: { fontSize: 10, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  durationSection: { marginBottom: 20 },
  durationButtons: { flexDirection: 'row', gap: 16 },
  durationButton: { flex: 1, paddingVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)', alignItems: 'center' },
  activeDurationButton: { backgroundColor: '#A8C8E1', borderColor: '#A8C8E1' },
  durationButtonText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic' },
  activeDurationButtonText: { color: '#F9F7F4' },
  footer: { paddingHorizontal: 24, paddingVertical: 20, backgroundColor: 'rgba(249, 247, 244, 0.98)', borderTopWidth: 1, borderTopColor: 'rgba(139, 125, 107, 0.08)' },
  submitButton: { backgroundColor: '#A8C8E1', paddingVertical: 18, borderRadius: 25, alignItems: 'center' },
  disabledButton: { backgroundColor: '#B8A082', opacity: 0.6 },
  submitButtonText: { fontSize: 14, fontFamily: 'Georgia', color: '#F9F7F4', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(93, 78, 55, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  emotionPickerModal: { backgroundColor: '#F9F7F4', borderRadius: 24, padding: 24, maxWidth: 400, width: '100%', maxHeight: '70%' },
  emotionPickerTitle: { fontSize: 16, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  emotionOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  emotionOptionEmoji: { fontSize: 20, marginRight: 12 },
  emotionOptionText: { fontSize: 14, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  stickerCategory: { marginRight: 20, alignItems: 'center' },
  stickerCategoryTitle: { fontSize: 11, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 10, fontStyle: 'italic' },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 140 },
  stickerItem: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center', margin: 4, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.12)' },
  selectedStickerItem: { backgroundColor: '#A8C8E1', borderColor: '#A8C8E1' },
  stickerEmoji: { fontSize: 18 },
});
