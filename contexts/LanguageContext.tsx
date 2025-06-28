import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'fr' | 'en';

interface LanguageContextType {
  currentLanguage: Language;
  changeLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simplified translations for demo
const translations = {
  fr: {
    // Common
    'error': 'Erreur',
    'cancel': 'Annuler',
    'continue': 'Continuer',
    'save': 'Sauvegarder',
    'delete': 'Supprimer',
    'edit': 'Modifier',
    'close': 'Fermer',
    'loading': 'Chargement...',
    'retry': 'Réessayer',
    'success': 'Succès',
    'warning': 'Attention',
    'info': 'Information',
    
    // Welcome
    'welcome.title': 'Bienvenue sur Silagora',
    'welcome.subtitle': 'Découvrez les murmures autour de vous',
    'welcome.startButton': 'Commencer l\'aventure',
    'welcome.alreadyAccountButton': 'J\'ai déjà un compte',
    'welcome.juryAccessButton': 'Accès Jury',
    
    // Auth
    'login.title': 'Connexion',
    'login.subtitle': 'Retrouvez vos murmures',
    'login.emailLabel': 'Adresse email',
    'login.emailPlaceholder': 'votre@email.com',
    'login.submitButton': 'Se connecter',
    'login.errorContactRequired': 'L\'adresse email est requise',
    
    // Create Account
    'createAccount.title': 'Créer un compte',
    'createAccount.subtitle': 'Rejoignez la communauté',
    'createAccount.emailLabel': 'Adresse email',
    'createAccount.emailPlaceholder': 'votre@email.com',
    'createAccount.pseudoLabel': 'Pseudo (optionnel)',
    'createAccount.pseudoPlaceholder': 'Votre pseudo',
    'createAccount.submitButton': 'Créer le compte',
    'createAccount.errorContactRequired': 'L\'adresse email est requise',
    
    // Emotions
    'emotions.': 'Choisir une émotion',
    'emotions.joyeux': 'Joyeux(se)',
    'emotions.triste': 'Triste',
    'emotions.colere': 'En colère',
    'emotions.anxieux': 'Anxieux(se)',
    'emotions.aimant': 'Aimant(e)',
    'emotions.fatigue': 'Fatigué(e)',
    'emotions.detendu': 'Détendu(e)',
    'emotions.pensif': 'Pensif(ve)',
    'emotions.bouleverse': 'Bouleversé(e)',
    'emotions.apaise': 'Apaisé(e)',
    'emotions.perdu': 'Perdu(e)',
    'emotions.ironique': 'Ironique',
    'emotions.silencieux': 'Silencieux(se)',
    'emotions.emu': 'Ému(e)',
    'emotions.honteux': 'Honteux(se)',
    
    // Dashboard
    'dashboard.title': 'Tableau de bord',
    'dashboard.subtitle': 'Votre activité sur Silagora',
    
    // About
    'about.title': 'À propos de Silagora',
    'about.etymology': 'du latin "silere" (se taire) et du grec "agora" (place publique)',
    'about.description': 'Une application poétique pour partager des messages éphémères géolocalisés',
    
    // Moderation
    'moderation.title': 'Modération',
    'moderation.subtitle': 'Gardiens de la bienveillance',
    'moderation.approve': 'Approuver',
    'moderation.reject': 'Rejeter',
    'moderation.notAuthorizedTitle': 'Accès non autorisé',
    'moderation.notAuthorizedText': 'Vous devez être connecté pour accéder à la modération.',
    'moderation.accessDeniedTitle': 'Accès refusé',
    'moderation.accessDeniedText': 'Vous n\'avez pas les permissions nécessaires pour modérer.',
    'moderation.emptyQueue': 'Aucun contenu à modérer',
    'moderation.emptyQueueSubtext': 'Tous les contenus ont été traités',
    'moderation.refresh': 'Actualiser',
    
    // Shop
    'shop.title': 'Boutique',
    'shop.subtitle': 'Enrichissez vos murmures',
    
    // Time
    'justNow': 'à l\'instant',
    'minutesAgo': 'il y a {{count}} min',
    'hoursAgo': 'il y a {{count}}h',
    'daysAgo': 'il y a {{count}} jours',
    
    // Location
    'locating': 'Localisation en cours...',
    'locationRequiredToExplore': 'La localisation est requise pour explorer',
    
    // Unexpected error
    'unexpectedError': 'Une erreur inattendue s\'est produite',
  },
  en: {
    // Common
    'error': 'Error',
    'cancel': 'Cancel',
    'continue': 'Continue',
    'save': 'Save',
    'delete': 'Delete',
    'edit': 'Edit',
    'close': 'Close',
    'loading': 'Loading...',
    'retry': 'Retry',
    'success': 'Success',
    'warning': 'Warning',
    'info': 'Information',
    
    // Welcome
    'welcome.title': 'Welcome to Silagora',
    'welcome.subtitle': 'Discover whispers around you',
    'welcome.startButton': 'Start the adventure',
    'welcome.alreadyAccountButton': 'I already have an account',
    'welcome.juryAccessButton': 'Jury Access',
    
    // Auth
    'login.title': 'Login',
    'login.subtitle': 'Find your whispers',
    'login.emailLabel': 'Email address',
    'login.emailPlaceholder': 'your@email.com',
    'login.submitButton': 'Sign in',
    'login.errorContactRequired': 'Email address is required',
    
    // Create Account
    'createAccount.title': 'Create account',
    'createAccount.subtitle': 'Join the community',
    'createAccount.emailLabel': 'Email address',
    'createAccount.emailPlaceholder': 'your@email.com',
    'createAccount.pseudoLabel': 'Username (optional)',
    'createAccount.pseudoPlaceholder': 'Your username',
    'createAccount.submitButton': 'Create account',
    'createAccount.errorContactRequired': 'Email address is required',
    
    // Emotions
    'emotions.': 'Choose an emotion',
    'emotions.joyeux': 'Joyful',
    'emotions.triste': 'Sad',
    'emotions.colere': 'Angry',
    'emotions.anxieux': 'Anxious',
    'emotions.aimant': 'Loving',
    'emotions.fatigue': 'Tired',
    'emotions.detendu': 'Relaxed',
    'emotions.pensif': 'Thoughtful',
    'emotions.bouleverse': 'Overwhelmed',
    'emotions.apaise': 'Peaceful',
    'emotions.perdu': 'Lost',
    'emotions.ironique': 'Ironic',
    'emotions.silencieux': 'Silent',
    'emotions.emu': 'Moved',
    'emotions.honteux': 'Ashamed',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Your activity on Silagora',
    
    // About
    'about.title': 'About Silagora',
    'about.etymology': 'from Latin "silere" (to be silent) and Greek "agora" (public square)',
    'about.description': 'A poetic app for sharing ephemeral geolocated messages',
    
    // Moderation
    'moderation.title': 'Moderation',
    'moderation.subtitle': 'Guardians of kindness',
    'moderation.approve': 'Approve',
    'moderation.reject': 'Reject',
    'moderation.notAuthorizedTitle': 'Access denied',
    'moderation.notAuthorizedText': 'You must be logged in to access moderation.',
    'moderation.accessDeniedTitle': 'Access denied',
    'moderation.accessDeniedText': 'You don\'t have the necessary permissions to moderate.',
    'moderation.emptyQueue': 'No content to moderate',
    'moderation.emptyQueueSubtext': 'All content has been processed',
    'moderation.refresh': 'Refresh',
    
    // Shop
    'shop.title': 'Shop',
    'shop.subtitle': 'Enrich your whispers',
    
    // Time
    'justNow': 'just now',
    'minutesAgo': '{{count}} min ago',
    'hoursAgo': '{{count}}h ago',
    'daysAgo': '{{count}} days ago',
    
    // Location
    'locating': 'Locating...',
    'locationRequiredToExplore': 'Location is required to explore',
    
    // Unexpected error
    'unexpectedError': 'An unexpected error occurred',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('fr');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('@silagora:language');
      if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('@silagora:language', lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string, params?: any): string => {
    const translation = translations[currentLanguage][key as keyof typeof translations[typeof currentLanguage]];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    if (params && typeof translation === 'string') {
      return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }
    
    return translation as string;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}