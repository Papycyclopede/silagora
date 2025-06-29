import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground
} from 'react-native';
import { router } from 'expo-router';
import { Wind, Heart, MapPin, Users, Crown } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_LAUNCHED_KEY = '@silagora:has_launched';

export default function WelcomeScreen() {
  const { t, changeLanguage } = useLanguage();
  const { signInAsMaster } = useAuth();

  const iconColors = ['#687fb2', '#8B7355', '#a0a8b0', '#6b8e9a'];
  const features = [
    { icon: <Wind size={24} color={iconColors[0]} />, title: t('welcome.feature1.title'), description: t('welcome.feature1.description')},
    { icon: <MapPin size={24} color={iconColors[1]} />, title: t('welcome.feature2.title'), description: t('welcome.feature2.description')},
    { icon: <Heart size={24} color={iconColors[2]} />, title: t('welcome.feature3.title'), description: t('welcome.feature3.description')},
    { icon: <Users size={24} color={iconColors[3]} />, title: t('welcome.feature4.title'), description: t('welcome.feature4.description')},
  ];

  const handleMasterAccess = async () => {
    const result = await signInAsMaster();
    if (result.success) {
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
      // La connexion est réussie, l'écouteur `onAuthStateChange` s'occupera du reste.
      // On redirige simplement vers l'application principale.
      router.replace('/(tabs)');
    }
  };

  const handleNavigation = async (path: string) => {
    try {
      await AsyncStorage.setItem(HAS_LAUNCHED_KEY, 'true');
      router.push(path as any);
    } catch (e) {
      console.error("Failed to set launch status:", e);
      router.push(path as any);
    }
  };
  
  const handleLanguageSelect = async (lang: string) => {
    await changeLanguage(lang);
  };

  return (
    <ImageBackground
        source={require('../../assets/images/fond.png')}
        style={styles.backgroundImage}
    >
        <View style={styles.container}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Silagora</Text>
                    <Text style={styles.etymology}>{t('about.etymology')}</Text>
                </View>
                <View style={styles.introSection}>
                    <Text style={styles.introText}>{t('about.description')}</Text>
                </View>
                <View style={styles.featuresSection}>
                {features.map((feature, index) => (
                    <View key={index} style={styles.featureCard}>
                    <View style={[styles.featureIconContainer, { backgroundColor: `${iconColors[index]}33`}]}>{feature.icon}</View>
                    <View style={styles.featureContent}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureDescription}>{feature.description}</Text>
                    </View>
                    </View>
                ))}
                </View>
            </ScrollView>
            <View style={styles.actionSection}>
                <TouchableOpacity
                    style={styles.masterButton}
                    onPress={handleMasterAccess}
                >
                    <Crown size={16} color="#4D3B2F" />
                    <Text style={styles.masterButtonText}>{t('welcome.juryAccessButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleNavigation('/(auth)/create-account')}
                >
                <Text style={styles.primaryButtonText}>{t('welcome.startButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleNavigation('/(auth)/login')}
                >
                <Text style={styles.secondaryButtonText}>{t('welcome.alreadyAccountButton')}</Text>
                </TouchableOpacity>
                <View style={styles.bottomLinks}>
                    <TouchableOpacity style={styles.languageButton} onPress={() => handleLanguageSelect('fr')}>
                        <Text style={styles.bottomLinkText}>Français</Text>
                    </TouchableOpacity>
                    <Text style={styles.bottomLinkSeparator}>•</Text>
                    <TouchableOpacity style={styles.languageButton} onPress={() => handleLanguageSelect('en')}>
                        <Text style={styles.bottomLinkText}>English</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, },
  container: { flex: 1, backgroundColor: 'rgba(249, 245, 240, 0.75)', },
  content: { flex: 1, paddingHorizontal: 24, },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 20, },
  title: { fontSize: 64, fontFamily: 'Georgia', color: '#687fb2', textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, marginBottom: 5, },
  etymology: { fontSize: 13, fontFamily: 'Georgia', fontStyle: 'italic', color: '#8B7355', marginTop: -5, paddingHorizontal: 20, textAlign: 'center', },
  introSection: { backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 16, padding: 20, marginVertical: 30, },
  introText: { fontSize: 16, fontFamily: 'Georgia', color: '#4D3B2F', textAlign: 'center', lineHeight: 24, fontStyle: 'italic', },
  featuresSection: { marginBottom: 40, },
  featureCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, },
  featureIconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 20, },
  featureContent: { flex: 1, },
  featureTitle: { fontSize: 17, fontFamily: 'Georgia', color: '#4D3B2F', marginBottom: 4, },
  featureDescription: { fontSize: 14, fontFamily: 'Georgia', color: '#8B7355', lineHeight: 20, },
  actionSection: { paddingHorizontal: 24, paddingVertical: 25, paddingBottom: 40, backgroundColor: 'transparent', },
  primaryButton: { backgroundColor: '#687fb2', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginBottom: 15, shadowColor: '#687fb2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, },
  primaryButtonText: { fontSize: 16, fontFamily: 'Georgia', color: '#F9F5F0', letterSpacing: 0.8, },
  secondaryButton: { backgroundColor: 'transparent', paddingVertical: 18, borderRadius: 30, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(104, 127, 178, 0.5)', },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Georgia', color: '#687fb2', letterSpacing: 0.5, },
  masterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 25, backgroundColor: 'rgba(255, 223, 0, 0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(218, 165, 32, 0.4)', },
  masterButtonText: { fontSize: 13, fontFamily: 'Georgia', color: '#4D3B2F', marginLeft: 8, },
  bottomLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 20, },
  languageButton: { paddingHorizontal: 8, },
  bottomLinkText: { fontSize: 12, fontFamily: 'Georgia', color: '#8B7355', textDecorationLine: 'underline', },
  bottomLinkSeparator: { fontSize: 12, color: '#8B7355', marginHorizontal: 8, },
});