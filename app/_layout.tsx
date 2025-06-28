import 'react-native-reanimated';
import React, { useEffect } from 'react';
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

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  // Load fonts for the application
  const [fontsLoaded, fontError] = useFonts({
    'Satisfy-Regular': Satisfy_400Regular,
    'Quicksand-Light': Quicksand_300Light,
    'Quicksand-Regular': Quicksand_400Regular,
    'Quicksand-Medium': Quicksand_500Medium,
  });

  useEffect(() => {
    // Hide the splash screen once fonts are loaded (or on error)
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render anything until fonts are ready
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <LocationProvider>
            <SouffleProvider>
              {/* Main Stack Navigator for the application */}
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
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