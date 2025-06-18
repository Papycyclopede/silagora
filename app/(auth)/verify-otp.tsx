import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Shield, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyOTPScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [attempts, setAttempts] = useState(0);

  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOTP, login: resendOTP } = useAuth();
  const { t } = useLanguage();

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // CORRECTION : La logique de redirection est maintenant dans un useEffect
  useEffect(() => {
    // Redirige si l'email n'est pas fourni après le rendu initial
    if (!email) {
      if (router.canGoBack()) {
        router.back();
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [email, isResending]); // Dépend de l'email et du statut de renvoi

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    if (!email) {
      Alert.alert(t('error'), "L'adresse email est manquante.");
      router.back();
      return;
    }

    const codeToVerify = otpCode || code.join('');
    if (codeToVerify.length !== 6) {
      Alert.alert(t('error'), t('verifyOtp.errorIncomplete'));
      return;
    }
    
    setIsLoading(true);

    const result = await verifyOTP(email, codeToVerify);

    setIsLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setAttempts(prev => prev + 1);
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert(t('verifyOtp.errorTitle'), result.error || t('verifyOtp.errorMessage'));
    }
  };
  
  const handleResend = async () => {
    if (!canResend || !email) return;

    setIsResending(true);
    const result = await resendOTP({ contact: email, type: 'email' });
    setIsResending(false);

    if (result.success) {
      setCanResend(false);
      setCountdown(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert(t('verifyOtp.resendTitle'), t('verifyOtp.resendMessage'));
    } else {
      Alert.alert(t('error'), result.error || t('verifyOtp.resendError'));
    }
  };

  // Affiche un écran de chargement si l'email n'est pas encore là
  if (!email) {
      return <View style={styles.container}><ActivityIndicator/></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#8B7355" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{t('verifyOtp.title')}</Text>
          <Text style={styles.subtitle}>{t('verifyOtp.subtitle')}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Shield size={32} color="#8B7355" />
          </View>
        </View>
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>{t('verifyOtp.codeSentTitle')}</Text>
          <Text style={styles.instructionsText}>
            {t('verifyOtp.codeSentTo')}
            {'\n'}
            <Text style={styles.contactText}>{email}</Text>
          </Text>
        </View>
        <Animated.View style={[styles.otpContainer, { transform: [{ translateX: shakeAnimation }] }]}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                attempts > 0 && !digit && styles.otpInputError,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </Animated.View>
        {attempts > 0 && (
          <View style={styles.attemptsInfo}>
            <Text style={styles.attemptsText}>
              {t('verifyOtp.attemptsRemaining', { count: 5 - attempts })}
            </Text>
          </View>
        )}
        <View style={styles.resendSection}>
          {canResend ? (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={isResending}
            >
              {isResending ? <ActivityIndicator color="#8B7355" /> : <RefreshCw size={16} color="#8B7355" />}
              <Text style={styles.resendButtonText}>{t('verifyOtp.resendCode')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownText}>
              {t('verifyOtp.resendCodeWait', { count: countdown })}
            </Text>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (code.join('').length !== 6 || isLoading) && styles.disabledButton,
          ]}
          onPress={() => handleVerify()}
          disabled={code.join('').length !== 6 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#F9F5F0"/>
          ) : (
            <Text style={styles.verifyButtonText}>{t('verifyOtp.submitButton')}</Text>
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
    content: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(139, 115, 85, 0.08)',
        backgroundColor: 'rgba(249, 245, 240, 0.98)',
    },
    backButton: {
        padding: 8,
        marginRight: 15,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Quicksand-Medium',
        color: '#4D3B2F',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: 'Quicksand-Light',
        color: '#8B7355',
        fontStyle: 'italic',
    },
    iconContainer: {
        marginTop: 40,
        marginBottom: 30,
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(139, 115, 85, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(139, 115, 85, 0.2)',
    },
    instructionsSection: {
        alignItems: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    instructionsTitle: {
        fontSize: 18,
        fontFamily: 'Quicksand-Medium',
        color: '#4D3B2F',
        marginBottom: 15,
        textAlign: 'center',
    },
    instructionsText: {
        fontSize: 14,
        fontFamily: 'Quicksand-Regular',
        color: '#8B7355',
        textAlign: 'center',
        lineHeight: 22,
    },
    contactText: {
        fontFamily: 'Quicksand-Medium',
        color: '#4D3B2F',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderWidth: 2,
        borderColor: 'rgba(139, 115, 85, 0.2)',
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        fontSize: 20,
        fontFamily: 'Quicksand-Medium',
        color: '#4D3B2F',
        textAlign: 'center',
    },
    otpInputFilled: {
        borderColor: '#8B7355',
        backgroundColor: 'rgba(139, 115, 85, 0.05)',
    },
    otpInputError: {
        borderColor: '#C17B5C',
        backgroundColor: 'rgba(193, 123, 92, 0.05)',
    },
    attemptsInfo: {
        marginBottom: 20,
    },
    attemptsText: {
        fontSize: 12,
        fontFamily: 'Quicksand-Regular',
        color: '#C17B5C',
        textAlign: 'center',
    },
    resendSection: {
        alignItems: 'center',
        marginBottom: 30,
        height: 50,
        justifyContent: 'center'
    },
    resendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 115, 85, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(139, 115, 85, 0.2)',
    },
    resendButtonText: {
        fontSize: 13,
        fontFamily: 'Quicksand-Medium',
        color: '#8B7355',
        marginLeft: 8,
    },
    countdownText: {
        fontSize: 12,
        fontFamily: 'Quicksand-Regular',
        color: '#8B7355',
        fontStyle: 'italic',
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 25,
        paddingBottom: 40,
        backgroundColor: 'rgba(249, 245, 240, 0.98)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 115, 85, 0.08)',
    },
    verifyButton: {
        backgroundColor: '#8B7355',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#4D3B2F',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    disabledButton: {
        backgroundColor: '#B8A082',
        opacity: 0.6,
    },
    verifyButtonText: {
        fontSize: 16,
        fontFamily: 'Quicksand-Medium',
        color: '#F9F5F0',
        letterSpacing: 0.8,
    },
});
