// app/_layout.tsx (corrigé)

import 'intl-pluralrules';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Satisfy_400Regular,
} from '@expo-google-fonts/satisfy';
import {
  Quicksand_300Light,
  Quicksand_400Regular,
  Quicksand_500Medium,
} from '@expo-google-fonts/quicksand';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AudioProvider } from '@/contexts/AudioContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { SouffleProvider } from '@/contexts/SouffleContext';

// Empêche le splash screen de se masquer automatiquement
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  // Chargement des polices pour l'application
  const [fontsLoaded, fontError] = useFonts({
    'Satisfy-Regular': Satisfy_400Regular,
    'Quicksand-Light': Quicksand_300Light,
    // --- CORRECTION APPLIQUÉE ICI ---
    'Quicksand-Regular': Quicksand_400Regular, // 'Quicksland' a été corrigé en 'Quicksand'
    'Quicksand-Medium': Quicksand_500Medium,
  });

  useEffect(() => {
    // Masque l'écran de démarrage une fois que les polices sont chargées (ou en cas d'erreur)
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // N'affiche rien tant que les polices ne sont pas prêtes
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <LocationProvider>
            <SouffleProvider>
              {/* Le Stack Navigator principal de l'application */}
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="_initial" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </SouffleProvider>
          </LocationProvider>
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}