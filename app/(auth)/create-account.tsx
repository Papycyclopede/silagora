import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, User, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateAccountScreen() {
  const [email, setEmail] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- MODIFICATION 1 : On récupère la fonction createAccount du contexte ---
  const { createAccount } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('createAccount.errorContactRequired'));
      return;
    }
    setIsLoading(true);

    // --- MODIFICATION 2 : On appelle la nouvelle fonction createAccount avec les données ---
    const result = await createAccount({
      contact: email.trim(),
      type: 'email', // On force le type email
      pseudo: pseudo.trim() || undefined,
    });

    setIsLoading(false);

    if (result.success) {
      // --- MODIFICATION 3 : On navigue vers l'écran OTP en passant l'email ---
      // C'est nécessaire pour que l'écran suivant sache quel email vérifier.
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email: email.trim() },
      });
    } else {
      Alert.alert(t('error'), result.error || t('unexpectedError'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#8B7355" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('createAccount.title')}</Text>
          <Text style={styles.subtitle}>{t('createAccount.subtitle')}</Text>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Suppression de la sélection de type de contact, car on n'utilise que l'email */}
        <View style={styles.demoNotice}>
          <AlertTriangle size={20} color="#B45309" />
          <View style={styles.demoNoticeTextContainer}>
            <Text style={styles.demoNoticeTitle}>Authentification Réelle</Text>
            <Text style={styles.demoNoticeText}>Un code de vérification vous sera envoyé par e-mail. Pas de simulation !</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>
            {t('createAccount.emailLabel')}
          </Text>
          <View style={styles.inputContainer}>
            <Mail size={18} color="#8B7355" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('createAccount.emailPlaceholder')}
              placeholderTextColor="#B8A082"
              value={email}
              onChangeText={setEmail}
              keyboardType={'email-address'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.inputLabel}>{t('createAccount.pseudoLabel')}</Text>
          <Text style={styles.inputHint}>
            {t('createAccount.pseudoHint')}
          </Text>
          <View style={styles.inputContainer}>
            <User size={18} color="#8B7355" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('createAccount.pseudoPlaceholder')}
              placeholderTextColor="#B8A082"
              value={pseudo}
              onChangeText={setPseudo}
              maxLength={20}
            />
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!email.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!email.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#F9F5F0" />
          ) : (
            <Text style={styles.createButtonText}>
              {t('createAccount.submitButton')}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          {t('createAccount.terms')}
        </Text>
      </View>
    </View>
  );
}

// Les styles restent inchangés, à part la suppression de ceux liés aux boutons de choix
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.08)',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    fontStyle: 'italic',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 12,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.15)',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  inputIcon: {
    marginRight: 12,
    opacity: 0.7,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Quicksand-Regular',
    color: '#4D3B2F',
    paddingVertical: 16,
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  demoNoticeTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  demoNoticeTitle: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#92400E',
    marginBottom: 4,
  },
  demoNoticeText: {
    fontSize: 12,
    fontFamily: 'Quicksand-Regular',
    color: '#B45309',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 25,
    paddingBottom: 40,
    backgroundColor: 'rgba(249, 245, 240, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  createButton: {
    backgroundColor: '#687fb2',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#687fb2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#a0a8b0',
    shadowColor: 'transparent',
    elevation: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    letterSpacing: 0.8,
  },
  termsText: {
    fontSize: 11,
    fontFamily: 'Quicksand-Light',
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
