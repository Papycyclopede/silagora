import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
  ImageBackground,
} from 'react-native';
import {
  Globe, Shield, LogOut, User, UserPlus, ShoppingBag,
  HelpCircle, RotateCcw, X, ChevronRight, Crown, Ticket, Sparkles as CreditIcon
} from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import PurchaseModal from '../../components/PurchaseModal';

const PALETTE = {
  sand_light: 'rgba(244, 228, 188, 0.6)',
  white_semi_transparent: 'rgba(255, 255, 255, 0.75)',
  green_light: 'rgba(184, 230, 184, 0.5)',
};

interface SettingCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backgroundColor?: string;
}

function SettingCard({ icon, title, subtitle, children, backgroundColor = PALETTE.white_semi_transparent }: SettingCardProps) {
  return (
    <View style={[styles.settingCard, { backgroundColor }]}>
      <View style={styles.settingHeader}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={styles.settingTitleContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
         </View>
      </View>
      <View style={styles.settingContent}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t, currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const { user, logout, isAuthenticated, signInAsMaster } = useAuth();
  
  const [hideLocation, setHideLocation] = useState(true);
  const [moderatedReading, setModeratedReading] = useState(true);
  const [participateModeration, setParticipateModeration] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showModerationInfo, setShowModerationInfo] = useState(false);
  
  const isMaster = user?.isMaster;

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const saveSettings = async () => {
      try {
        const settingsToSave = { hideLocation, moderatedReading, participateModeration };
        await AsyncStorage.setItem('@souffle:privacy_settings', JSON.stringify(settingsToSave));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
      }
    };
    saveSettings();
  }, [hideLocation, moderatedReading, participateModeration]);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('@souffle:privacy_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setHideLocation(parsed.hideLocation ?? true);
        setModeratedReading(parsed.moderatedReading ?? true);
        setParticipateModeration(parsed.participateModeration ?? false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  const handleLanguageChange = async (languageCode: string) => {
     await changeLanguage(languageCode);
     setShowLanguageModal(false);
  };
  
  const handleCreateAccount = () => router.push('/(auth)/create-account');
  const handleLogin = () => router.push('/(auth)/login');
  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'), t('settings.logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('settings.logout'), style: 'destructive', onPress: async () => await logout() },
      ]
    );
  };

  const handleToggleMasterMode = async () => {
    if (isMaster) {
      await logout();
      Alert.alert(t('settings.demoMode.alertDisabledTitle'), t('settings.demoMode.alertDisabledMessage'));
    } else {
      const result = await signInAsMaster();
      if (result.success) {
        Alert.alert(t('settings.demoMode.alertEnabledTitle'), t('settings.demoMode.alertEnabledMessage'));
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('error'), result.error || t('unexpectedError'));
      }
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      t('settings.resetSettingsTitle'), t('settings.resetSettingsMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('settings.clear'), style: 'destructive',
          onPress: async () => {
            setHideLocation(true);
            setModeratedReading(true);
            setParticipateModeration(false);
            await AsyncStorage.removeItem('@souffle:privacy_settings');
            Alert.alert(t('settings.settingsCleared'), t('settings.settingsClearedMessage'));
          },
        },
      ]
    );
  };
  
  const getCurrentLanguageName = () => {
    const lang = availableLanguages.find((l: { code: string; native: string; name: string }) => l.code === currentLanguage);
    return lang?.native || t('settings.languageDefault');
  };

  const MainContent = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabs.settings')}</Text>
        <Text style={styles.subtitle}>{t('settings.personalizeJourney')}</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SettingCard
          icon={<User size={18} color="#8B7D6B" />}
          title={t('settings.account')}
          subtitle={isAuthenticated ? t('settings.accountInfo') : t('settings.createAccountPrompt')}
          backgroundColor={PALETTE.sand_light}
        >
          {isAuthenticated && user ? (
            <>
              <View style={styles.profileInfo}><Text style={styles.profileLabel}>{t('settings.pseudo')}</Text><Text style={styles.profileValue}>{user.pseudo || 'Anonyme'}</Text></View>
              <View style={styles.profileInfo}><Text style={styles.profileLabel}>{t('settings.memberSince')}</Text><Text style={styles.profileValue}>{user.createdAt.toLocaleDateString(currentLanguage)}</Text></View>
              
              <View style={styles.inventoryContainer}>
                <View style={styles.inventoryItem}>
                    <Ticket size={14} color="#5D4E37"/>
                    <Text style={styles.inventoryText}>{user.ticketCount || 0} Tickets</Text>
                </View>
                 <View style={styles.inventoryItem}>
                    <CreditIcon size={14} color="#C19A6B"/>
                    <Text style={styles.inventoryText}>{user.premiumUsageCredits || 0} Crédits Premium</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><LogOut size={14} color="#C17B5C" /><Text style={styles.logoutButtonText}>{t('settings.logout')}</Text></TouchableOpacity>
            </>
          ) : (
            <View style={styles.anonymousSection}>
              <Text style={styles.anonymousText}>{t('settings.anonymousText')}</Text>
              <View style={styles.accountButtons}>
                <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}><UserPlus size={14} color="#F9F7F4" /><Text style={styles.createAccountButtonText}>{t('settings.createAccount')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}><Text style={styles.loginButtonText}>{t('settings.alreadyHaveAccount')}</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </SettingCard>
        
        <SettingCard icon={<ShoppingBag size={18} color="#8B7D6B"/>} title={t('shop.title')} subtitle={t('shop.subtitle')} backgroundColor={PALETTE.green_light}>
            <TouchableOpacity style={styles.shopButton} onPress={() => setShowPurchaseModal(true)}>
                <Text style={styles.shopButtonText}>{t('settings.discoverShop')}</Text>
                <ChevronRight size={14} color="#8B7D6B"/>
            </TouchableOpacity>
        </SettingCard>

        {/* CORRECTION: La carte de langue est bien présente */}
        <SettingCard icon={<Globe size={18} color="#8B7D6B"/>} title={t('settings.appLanguage')} subtitle={t('settings.languageSubtitle')}>
            <TouchableOpacity style={styles.languageSelector} onPress={() => setShowLanguageModal(true)}>
                <Text style={styles.languageText}>{getCurrentLanguageName()}</Text>
                <ChevronRight size={14} color="#8B7D6B"/>
            </TouchableOpacity>
        </SettingCard>
        
        <SettingCard icon={<Shield size={18} color="#8B7D6B" />} title={t('settings.privacy')} subtitle={t('settings.privacySubtitle')} backgroundColor={PALETTE.sand_light}>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('settings.hideExactLocation')}</Text><Switch value={hideLocation} onValueChange={setHideLocation} trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }} thumbColor="#F9F7F4" /></View>
          <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('settings.moderatedReading')}</Text><Switch value={moderatedReading} onValueChange={setModeratedReading} trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }} thumbColor="#F9F7F4" /></View>
          {isAuthenticated && (
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>{t('settings.participateModeration')}</Text>
                <TouchableOpacity onPress={() => setShowModerationInfo(true)}><HelpCircle size={14} color="#8B7D6B" /></TouchableOpacity>
              </View>
              <Switch value={participateModeration} onValueChange={setParticipateModeration} trackColor={{ false: '#E5D5C8', true: '#A8C8E1' }} thumbColor="#F9F7F4" />
            </View>
          )}
        </SettingCard>

        <SettingCard icon={<Crown size={18} color="#C19A6B" />} title={t('settings.demoMode.title')} subtitle={t('settings.demoMode.subtitle')} backgroundColor={'rgba(193, 154, 107, 0.1)'}>
          <TouchableOpacity style={styles.demoButton} onPress={handleToggleMasterMode}>
            <Text style={styles.demoButtonText}>
              {isMaster ? t('settings.demoMode.disable') : t('settings.demoMode.enable')}
            </Text>
          </TouchableOpacity>
        </SettingCard>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetSettings}>
            <RotateCcw size={14} color="#C17B5C"/>
            <Text style={styles.resetButtonText}>{t('settings.resetPreferences')}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* Modals */}
      <PurchaseModal visible={showPurchaseModal} onClose={() => setShowPurchaseModal(false)} />
      <Modal visible={showLanguageModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}><X size={20} color="#8B7D6B" /></TouchableOpacity>
                <Text style={styles.modalTitle}>{t('settings.appLanguage')}</Text>
                <View style={{width: 20}}/>
            </View>
            <ScrollView style={styles.modalContent}>
                {availableLanguages.map((lang: any) => ( 
                    <TouchableOpacity key={lang.code} style={[styles.languageOption, currentLanguage === lang.code && styles.selectedLanguageOption]} onPress={() => handleLanguageChange(lang.code)}>
                        <Text style={[styles.languageOptionText, currentLanguage === lang.code && styles.selectedLanguageOptionText]}>{lang.native}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </Modal>
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
  title: { fontSize: 24, fontFamily: 'Georgia', color: '#5D4E37', letterSpacing: 1, fontStyle: 'italic' },
  subtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textAlign: 'center', letterSpacing: 0.5, marginTop: 6, fontStyle: 'italic' },
  content: { flex: 1, paddingHorizontal: 24 },
  settingCard: { borderRadius: 20, padding: 20, marginVertical: 10, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)', shadowColor: '#5D4E37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  settingHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  settingIcon: { marginRight: 16, marginTop: 2 },
  settingTitleContainer: { flex: 1 },
  settingTitle: { fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', marginBottom: 4, fontStyle: 'italic' },
  settingSubtitle: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic', lineHeight: 16 },
  settingContent: { marginLeft: 34 },
  profileInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileLabel: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', fontStyle: 'italic' },
  profileValue: { fontSize: 12, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  inventoryContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderColor: 'rgba(139, 125, 107, 0.1)', },
  inventoryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, },
  inventoryText: { fontSize: 12, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic', marginLeft: 8, },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(193, 123, 92, 0.08)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(193, 123, 92, 0.15)', marginTop: 16 },
  logoutButtonText: { fontSize: 12, fontFamily: 'Georgia', color: '#C17B5C', marginLeft: 8, fontStyle: 'italic' },
  anonymousSection: { backgroundColor: 'rgba(139, 125, 107, 0.04)', borderRadius: 16, padding: 16 },
  anonymousText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7D6B', marginBottom: 16, lineHeight: 16, fontStyle: 'italic' },
  accountButtons: { gap: 10 },
  createAccountButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#A8C8E1', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16 },
  createAccountButtonText: { fontSize: 12, fontFamily: 'Georgia', color: '#F9F7F4', marginLeft: 8, fontStyle: 'italic' },
  loginButton: { alignItems: 'center', paddingVertical: 10 },
  loginButtonText: { fontSize: 11, fontFamily: 'Georgia', color: '#8B7D6B', textDecorationLine: 'underline', fontStyle: 'italic' },
  shopButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(139, 125, 107, 0.06)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.15)' },
  shopButtonText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  languageSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(139, 125, 107, 0.06)', padding: 12, borderRadius: 16 },
  languageText: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  demoButton: { backgroundColor: '#8B7355', paddingVertical: 14, borderRadius: 18, alignItems: 'center', shadowColor: '#4D3B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  demoButtonText: { fontSize: 13, fontFamily: 'Georgia', color: '#F9F7F4', fontStyle: 'italic' },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(193, 123, 92, 0.06)', padding: 16, borderRadius: 18, marginVertical: 20, borderWidth: 1, borderColor: 'rgba(193, 123, 92, 0.12)' },
  resetButtonText: { fontSize: 12, fontFamily: 'Georgia', color: '#C17B5C', marginLeft: 8, fontStyle: 'italic' },
  bottomSpacing: { height: 40 },
  modalContainer: { flex: 1, backgroundColor: '#F9F7F4' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 125, 107, 0.08)', backgroundColor: 'rgba(249, 247, 244, 0.98)' },
  modalTitle: { fontSize: 16, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  modalContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  languageOption: { backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(139, 125, 107, 0.08)' },
  selectedLanguageOption: { backgroundColor: '#A8C8E1' },
  languageOptionText: { fontSize: 15, fontFamily: 'Georgia', color: '#5D4E37', fontStyle: 'italic' },
  selectedLanguageOptionText: { color: '#F9F7F4' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  switchLabel: { fontSize: 13, fontFamily: 'Georgia', color: '#5D4E37', flex: 1, marginRight: 16, fontStyle: 'italic' },
  switchLabelContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16, justifyContent: 'space-between' },
});
