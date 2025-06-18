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
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('login.errorContactRequired'));
      return;
    }
    setIsLoading(true);

    const result = await login({
      contact: email.trim(),
      type: 'email',
    });
    
    setIsLoading(false);

    if (result.success) {
      // On navigue vers l'écran OTP en passant l'email pour la vérification
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
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t('login.welcomeBack')}</Text>
          <Text style={styles.welcomeText}>
            {t('login.instructions')}
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.inputLabel}>
            {t('login.emailLabel')}
          </Text>
          <View style={styles.inputContainer}>
            <Mail size={18} color="#8B7355" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor="#B8A082"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            {t('login.helpText')}
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => router.push('/(auth)/create-account')}
          >
            <Text style={styles.helpButtonText}>{t('login.createNewAccount')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.loginButton,
            (!email.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!email.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#F9F5F0" />
          ) : (
            <Text style={styles.loginButtonText}>
              {t('login.submitButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  welcomeSection: {
    backgroundColor: 'rgba(104, 127, 178, 0.1)',
    borderRadius: 15,
    padding: 25,
    marginTop: 30,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: 'Satisfy-Regular',
    color: '#4D3B2F',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 22,
    textAlign: 'center',
  },
  section: {
    marginTop: 35,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#4D3B2F',
    marginBottom: 12,
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
  helpSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'Quicksand-Regular',
    color: '#8B7355',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 15,
  },
  helpButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: 'Quicksand-Medium',
    color: '#687fb2',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 25,
    paddingBottom: 40,
    backgroundColor: 'rgba(249, 245, 240, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.08)',
  },
  loginButton: {
    backgroundColor: '#687fb2',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
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
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Quicksand-Medium',
    color: '#F9F5F0',
    letterSpacing: 0.8,
  },
});
