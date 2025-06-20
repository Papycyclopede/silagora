import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ImageBackground,
  Modal,
  ScrollView,
  Linking,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Edit3, ShoppingBag, Eraser, Navigation, ZoomIn, ZoomOut, Layers, X, RefreshCw, Flag,
  PlayCircle, PauseCircle
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import OptimizedMapView, { MapViewActions } from '@/components/OptimizedMapView';
import SouffleModal from '@/components/SouffleModal';
import PurchaseModal from '@/components/PurchaseModal';
import NotificationSystem from '@/components/NotificationSystem';
import SouffleRevealAnimation from '@/components/SouffleRevealAnimation';
import ImmersiveAudioManager from '@/components/ImmersiveAudioManager';
import SpatialAudioVisualizer from '@/components/SpatialAudioVisualizer';
import ConfirmModal from '@/components/ConfirmModal';
import { useLocation } from '@/contexts/LocationContext';
import { useSouffle } from '@/contexts/SouffleContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import type { Souffle, SuspendedTicket } from '@/types/souffle';
import { getBackgroundById } from '@/utils/backgrounds';
import { getStickerById } from '@/utils/stickers';
import { getEmotionDisplay } from '@/utils/emotionUtils';
import { calculateDistance, isWithinRevealDistance } from '@/utils/distance';
import { getTimeAgo } from '@/utils/time';

const { width } = Dimensions.get('window');

const baseControlButtonStyles: ViewStyle = {
  width: 48,
  height: 48,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(139, 125, 107, 0.15)',
  shadowColor: '#5D4E37',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
};

export default function SouffleApp() {
  const [showSouffleModal, setShowSouffleModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [selectedSouffle, setSelectedSouffle] = useState<Souffle | null>(null);
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isEchoSimulationActive = false;
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const mapViewRef = useRef<MapViewActions>(null);
  const insets = useSafeAreaInsets();
  const { location, loading: locationLoading, error: locationError, requestLocation, permissionPermanentlyDenied } = useLocation();
  const { clearSimulatedSouffles, revealSouffle, claimSuspendedTicket, reportSouffle } = useSouffle();
  const { t } = useLanguage();
  const { user, spendTicket, isAuthenticated } = useAuth();
  const { settings: audioSettings, playInteractionSound } = useAudio();
  const { notifications, removeNotification, showSuccess, showError, showMagic, showInfo } = useNotifications();

  async function togglePlayAudio(url: string, souffleId: string) {
    if (isAudioPlaying && audioSound && currentlyPlayingId === souffleId) {
      await audioSound.stopAsync();
      return;
    }
    if (audioSound) {
      await audioSound.unloadAsync();
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setAudioSound(sound);
      setCurrentlyPlayingId(souffleId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsAudioPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setCurrentlyPlayingId(null);
            sound.unloadAsync();
          }
        } else {
            setIsAudioPlaying(false);
            setCurrentlyPlayingId(null);
        }
      });
      await sound.playAsync();
    } catch (e) {
      console.error("Erreur lors de la lecture de l'audio:", e);
      showError("Erreur Audio", "Impossible de lire ce souffle.");
      setIsAudioPlaying(false);
      setCurrentlyPlayingId(null);
    }
  }

  useEffect(() => {
    return audioSound
      ? () => {
          audioSound.unloadAsync();
        }
      : undefined;
  }, [audioSound]);

  const handleSelectSouffle = (souffle: Souffle) => {
    setSelectedSouffle(souffle);
  };

  const handleReveal = (souffle: Souffle) => {
    setSelectedSouffle(souffle);
    setShowRevealAnimation(true);
    showMagic(t('souffleRevealedTitle'), t('souffleRevealedMessage'), { duration: 3000 });
  };

  const onRevealAnimationComplete = useCallback(() => {
    setShowRevealAnimation(false);
  }, []);

  const handleWriteMode = () => {
    if (!location) {
      showError(t('locationRequired'), t('locationRequiredForDeposit'));
      Alert.alert(
        t('locationRequired'),
         t('locationRequiredForDeposit'),
         [{ text: t('later'), style: 'cancel' }, { text: t('activate'), onPress: requestLocation }]
      );
      return;
    }
    setMode('write');
    setShowSouffleModal(true);
  };

  const handleSouffleModalClose = () => {
    setShowSouffleModal(false);
    setMode('read');
  };

  const handleMarkerPress = useCallback(async (souffle: Souffle) => {
    if (mode !== 'read' || !location) return;

    playInteractionSound('navigate');

    if (souffle.userId === user?.id || souffle.isRevealed) {
      handleSelectSouffle(souffle);
      return;
    }

    const canReveal = isWithinRevealDistance(location.latitude, location.longitude, souffle.latitude, souffle.longitude);

    if (canReveal) {
      await revealSouffle(souffle.id);
      handleReveal({ ...souffle, isRevealed: true });
    } else {
      if (!user) {
        Alert.alert(t('common.functionalityReserved'), t('common.accountRequiredForDistantReveal'));
        return;
      }

      const distance = Math.round(calculateDistance(location.latitude, location.longitude, souffle.latitude, souffle.longitude));
      const ticketCount = user?.ticketCount || 0;

      Alert.alert(t('common.tooFarToRevealTitle'), t('common.tooFarToRevealMessage', { distance, ticketCount }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
             text: t('common.useOneTicket'),
             onPress: async () => {
              const ticketSpent = await spendTicket();
              if (ticketSpent) {
                await revealSouffle(souffle.id);
                handleReveal({ ...souffle, isRevealed: true });
              } else {
                Alert.alert(t('common.ticketsExhausted'), t('common.visitShopForMoreTickets'));
              }
            },
            style: 'default'
           }
        ]
      );
    }
  }, [mode, location, user, revealSouffle, spendTicket, playInteractionSound, t]);

  const handleTicketPress = useCallback(async (ticket: SuspendedTicket) => {
    if (!location || !isAuthenticated) {
        Alert.alert(t('common.connectionRequiredTitle'), t('common.connectionRequiredMessage'));
        return;
    }
    const canClaim = isWithinRevealDistance(location.latitude, location.longitude, ticket.latitude, ticket.longitude);
    if (canClaim) {
        const success = await claimSuspendedTicket(ticket.id);
        if (success) Alert.alert(t('common.giftClaimedTitle'), t('common.giftClaimedMessage'));
    } else {
        Alert.alert(t('common.tooFarGiftTitle'), t('common.tooFarGiftMessage'));
    }
  }, [location, isAuthenticated, claimSuspendedTicket, t]);

  const handleRetryLocation = async () => {
    if (permissionPermanentlyDenied) {
      Alert.alert(
        t('locationPermissionDeniedTitle'),
        t('locationPermissionDeniedMessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('openSettings'), onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }
    try {
      showInfo(t('locating'), t('prepareContemplativeSpace'));
      await requestLocation();
      showSuccess(t('locationFound'), t('spaceReady'));
    }
    catch (error) {
      console.error('Erreur lors de la relance de localisation:', error);
      showError(t('locationErrorTitle'), t('locationErrorMessage'));
    }
  };

  const handleClearMap = () => {
    playInteractionSound('navigate');
    setShowClearConfirm(true);
  };

  const onConfirmClearMap = async () => {
    await clearSimulatedSouffles();
    showSuccess(t('mapCleared'), t('mapClearedMessage'));
    setShowClearConfirm(false);
  };
  
  const handleLocateMe = () => mapViewRef.current?.locateMe();
  const handleZoomIn = () => mapViewRef.current?.zoomIn();
  const handleZoomOut = () => mapViewRef.current?.zoomOut();
  const handleToggleMapType = () => mapViewRef.current?.toggleMapType();

  const handleReportSouffle = async (souffle: Souffle) => {
    closeModalAndStopSound();
    Alert.alert(
        t('moderation.reportTitle'),
        t('moderation.reportMessage'),
        [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('moderation.reportConfirm'),
                style: 'destructive',
                onPress: async () => {
                    const result = await reportSouffle(souffle.id);
                    if (result.success) {
                        showSuccess(t('moderation.reportSuccessTitle'), t('moderation.reportSuccessMessage'));
                    } else {
                        showError(t('moderation.reportErrorTitle'), t('moderation.reportErrorMessage'));
                    }
                }
            }
        ]
    );
  };
  
  const closeModalAndStopSound = () => {
    if (audioSound) {
      audioSound.stopAsync();
      audioSound.unloadAsync();
    }
    setAudioSound(null);
    setIsAudioPlaying(false);
    setCurrentlyPlayingId(null);
    setSelectedSouffle(null);
  };

  const renderModalContent = () => {
    if (!selectedSouffle) return null;

    const modalBackground = getBackgroundById(selectedSouffle.backgroundId);
    const isPremium = modalBackground?.source && modalBackground?.shape === 'square';
    const isPlayingThisSouffle = isAudioPlaying && currentlyPlayingId === selectedSouffle.id;

    const textContent = (
        <>
            {selectedSouffle.content.jeMeSens && (
              <View style={styles.modalEmotionContainer}>
                <Text style={[styles.modalEmotionText, isPremium ? styles.modalEmotionTextPremium : null]}>
                  {getEmotionDisplay(selectedSouffle.content.jeMeSens)?.emoji} {t(`emotions.${selectedSouffle.content.jeMeSens}`)}
                </Text>
              </View>
            )}
            <Text style={[styles.modalText, isPremium ? styles.modalTextPremium : null]}>
              {selectedSouffle.content.messageLibre}
            </Text>
            {selectedSouffle.pseudo && (
                <Text style={[styles.modalAuthor, isPremium ? styles.modalAuthorPremium : null]}>
                    — {selectedSouffle.pseudo}
                </Text>
            )}
        </>
    );

    return (
      <View style={[ styles.modalTextContainer, isPremium ? { backgroundColor: 'transparent', borderWidth: 0 } : null ]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeaderContainer}>
            <Text style={[styles.modalTitle, isPremium ? styles.modalTitlePremium : null]}>
              {t('souffleRevealed')}
            </Text>
            {selectedSouffle.audio_url && (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => togglePlayAudio(selectedSouffle.audio_url!, selectedSouffle!.id)}
              >
                {isPlayingThisSouffle
                  ? <PauseCircle size={28} color={isPremium ? '#fff' : '#5D4E37'} />
                  : <PlayCircle size={28} color={isPremium ? '#fff' : '#5D4E37'} />
                }
              </TouchableOpacity>
            )}
          </View>
          {isPremium ? (
              <View style={styles.premiumTextWrapper}>
                  {textContent}
              </View>
          ) : (
              textContent
          )}
          {selectedSouffle.sticker && (
            <Text style={styles.modalSticker}>
              {getStickerById(selectedSouffle.sticker)?.emoji}
            </Text>
          )}
          <Text style={[styles.modalTime, isPremium ? styles.modalTimePremium : null]}>
            {getTimeAgo(new Date(selectedSouffle.createdAt), t)}
          </Text>
          {user && selectedSouffle.userId !== user.id && (
              <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => handleReportSouffle(selectedSouffle)}
              >
                  <Flag size={12} color={isPremium ? '#eee' : '#C17B5C'} />
                  <Text style={[styles.reportButtonText, isPremium ? { color: '#eee' }: null]}>Signaler ce message</Text>
              </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <ImageBackground source={require('../../assets/images/fond.png')} style={styles.backgroundImage}>
      <View style={styles.container}>
        <ImmersiveAudioManager currentMode={mode} selectedSouffle={selectedSouffle} />
        <SpatialAudioVisualizer isVisible={audioSettings.enabled && audioSettings.spatialAudio} intensity={mode === 'write' ? 0.8 : 0.5} />
        <NotificationSystem notifications={notifications} onDismiss={removeNotification} />
        <SouffleRevealAnimation visible={showRevealAnimation} onComplete={onRevealAnimationComplete} />

        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
            <TouchableOpacity style={styles.headerButton} onPress={handleClearMap}>
                <Eraser size={16} color="#8B7D6B" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <Text style={styles.title}>{t('title')}</Text>
                <Text style={styles.subtitle}>{t('subtitle')}</Text>
                <View style={styles.decorativeLine} />
            </View>
            <TouchableOpacity style={styles.shopButton} onPress={() => { playInteractionSound('navigate'); setShowPurchaseModal(true); }}>
                <ShoppingBag size={16} color="#8B7D6B" />
            </TouchableOpacity>
        </View>

        <View style={styles.mainContainer}>
          <View style={styles.mapWrapper}>
            <OptimizedMapView
               ref={mapViewRef}
               mode={mode}
               isEchoSimulationActive={isEchoSimulationActive}
              onMarkerPress={handleMarkerPress}
              onTicketPress={handleTicketPress}
            />
          </View>
          <View style={styles.controlBar}>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.controlButtonCircle} onPress={handleLocateMe}>
                <Navigation size={20} color="#5D4E37" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButtonCircle} onPress={handleZoomIn}>
                <ZoomIn size={20} color="#5D4E37" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButtonCircle} onPress={handleZoomOut}>
                <ZoomOut size={20} color="#5D4E37" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButtonCircle} onPress={handleToggleMapType}>
                <Layers size={20} color="#5D4E37" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleWriteMode}>
              <Edit3 size={16} color={'#5D4E37'} />
              <Text style={[styles.buttonText, { color: '#5D4E37' }]}>{t('write')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.statusIconContainer}>
              <View style={[styles.breathingDot, audioSettings.enabled && audioSettings.contextualSounds && styles.breathingDotActive]} />
            </View>
            {location ? (
                <Text style={styles.statusText}>
                    {mode === 'read' ? t('approachAura') : t('chooseLocation')}
                </Text>
            ) : locationLoading ? (
                <Text style={styles.statusText}>{t('locating')}</Text>
            ) : (
                <View style={styles.locationErrorSection}>
                    <Text style={styles.locationErrorText}>
                        {permissionPermanentlyDenied ? "Permission de localisation refusée" : t('locationRequiredToExplore')}
                    </Text>
                    <TouchableOpacity style={styles.locationRetryButton} onPress={handleRetryLocation}>
                        <RefreshCw size={12} color="#8B7D6B" />
                        <Text style={styles.locationRetryButtonText}>{t('retry')}</Text>
                    </TouchableOpacity>
                </View>
            )}
          </View>
        </View>

        <SouffleModal visible={showSouffleModal} onClose={handleSouffleModalClose} />
        <PurchaseModal visible={showPurchaseModal} onClose={() => { playInteractionSound('navigate'); setShowPurchaseModal(false); }} />
        
        <Modal visible={!!selectedSouffle && !showRevealAnimation} transparent animationType="fade" onRequestClose={closeModalAndStopSound}>
          <TouchableOpacity style={styles.modalOverlaySouffle} activeOpacity={1} onPress={closeModalAndStopSound}>
            {selectedSouffle && getBackgroundById(selectedSouffle.backgroundId)?.shape === 'square' && getBackgroundById(selectedSouffle.backgroundId)?.source ? (
                <ImageBackground source={getBackgroundById(selectedSouffle.backgroundId)?.source} style={[styles.modalContentBaseSouffle, styles.modalContentSquareSouffle]} imageStyle={{ borderRadius: 25 }}>
                    {renderModalContent()}
                </ImageBackground>
            ) : (
                <View style={[styles.modalContentBaseSouffle, styles.modalContentOptimizedSouffle]}>
                    {renderModalContent()}
                </View>
            )}
          </TouchableOpacity>
        </Modal>

        <ConfirmModal
          visible={showClearConfirm}
          title={t('clearSimulatedSoufflesTitle')}
          message={t('clearSimulatedSoufflesMessage')}
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={onConfirmClearMap}
          confirmText={t('clear')}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, resizeMode: 'cover' },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingHorizontal: 10,
     paddingBottom: 10,
    backgroundColor: 'transparent',
     borderBottomWidth: 1,
     borderBottomColor: 'rgba(139, 125, 107, 0.08)'
   },
  headerContent: { flex: 1, alignItems: 'center' },
  headerButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)'},
  title: { fontSize: 40, fontFamily: 'Satisfy-Regular', color: '#687fb2' },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', fontStyle: 'italic', color: '#8B7D6B', textAlign: 'center', lineHeight: 16, paddingHorizontal: 20 },
  decorativeLine: { width: 80, height: 1, backgroundColor: 'rgba(139, 125, 107, 0.2)', marginTop: 8, marginBottom: 12 },
  shopButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)'},
  mainContainer: { flex: 1, flexDirection: 'row' },
  mapWrapper: { flex: 1, overflow: 'hidden', margin: 10, marginRight: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.1)'},
  controlBar: { width: 70, paddingVertical: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'flex-start', gap: 12 },
  controlButtonCircle: { ...baseControlButtonStyles, backgroundColor: 'rgba(168, 200, 225, 0.8)', borderRadius: 24 },
  separator: { height: 1, width: '60%', backgroundColor: 'rgba(139, 125, 107, 0.2)', marginVertical: 6 },
  bottomBar: { backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: 'rgba(139, 125, 107, 0.08)', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 20 : 15, paddingTop: 15 },
  actionButtons: { justifyContent: 'center', marginBottom: 15 },
  actionButton: { backgroundColor: 'rgba(168, 200, 225, 0.8)', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: 'rgba(168, 200, 225, 0.8)', width: '60%', alignSelf: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { fontSize: 14, fontFamily: 'Georgia', fontStyle: 'italic', letterSpacing: 0.3 },
  statusIndicator: { backgroundColor: 'rgba(255, 255, 255, 0.8)', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)' },
  statusIconContainer: { marginRight: 12 },
  breathingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A8C8E1', opacity: 0.6 },
  breathingDotActive: { opacity: 1, shadowColor: '#A8C8E1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
  statusText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.3, flex: 1, lineHeight: 16 },
  locationErrorSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  locationErrorText: { fontSize: 12, fontFamily: 'Georgia', color: '#C17B5C', textAlign: 'center', fontStyle: 'italic', marginBottom: 8, lineHeight: 16 },
  locationRetryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 125, 107, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.2)' },
  locationRetryButtonText: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', marginLeft: 6 },
  modalOverlaySouffle: { flex: 1, backgroundColor: 'rgba(93, 78, 55, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentBaseSouffle: { borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.2)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12, overflow: 'hidden' },
  modalContentOptimizedSouffle: { backgroundColor: '#F9F7F4', borderRadius: 25, maxWidth: 320, width: '100%', maxHeight: '80%', flexShrink: 1, },
  modalContentSquareSouffle: { width: width * 0.9, height: width * 0.9, maxWidth: 400, maxHeight: 400, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  modalTextContainer: { backgroundColor: 'rgba(249, 247, 244, 0.85)', padding: 28, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.7)', },
  modalHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { flex: 1, fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', fontStyle: 'italic' },
  playButton: { padding: 8, marginLeft: 16 },
  modalEmotionContainer: { backgroundColor: 'rgba(139, 125, 107, 0.08)', borderRadius: 12, padding: 10, marginBottom: 16, alignSelf: 'center' },
  modalEmotionText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic' },
  modalText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', textAlign: 'center', lineHeight: 20, marginBottom: 16, fontStyle: 'italic' },
  modalAuthor: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'right', fontStyle: 'italic', marginTop: -10, marginBottom: 16, marginRight: 10, },
  modalSticker: { fontSize: 26, textAlign: 'center', marginBottom: 16 },
  modalTime: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', fontStyle: 'italic' },
  modalTextContainerPremium: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, padding: 20 },
  modalTitlePremium: { fontSize: 21, color: '#FFF', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, fontWeight: 'bold' },
  modalEmotionTextPremium: { fontSize: 18, color: '#FFF', fontWeight: '700'},
  modalTextPremium: { fontSize: 26, color: '#FFF', fontWeight: '700', lineHeight: 34 },
  modalAuthorPremium: { color: '#FFF' },
  modalTimePremium: { fontSize: 16, color: '#FFF', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, marginTop: 5 },
  reportButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(139, 125, 107, 0.1)', },
  reportButtonText: { fontSize: 11, fontFamily: 'Georgia', color: '#C17B5C', marginLeft: 6, fontStyle: 'italic' },
  premiumTextWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 10,
  },
});