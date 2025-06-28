import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { AudioProvider } from '@/contexts/AudioContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SouffleProvider } from '@/contexts/SouffleContext';

// Import react-native-reanimated at the root level
import 'react-native-reanimated';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <LanguageProvider>
      <AudioProvider>
        <LocationProvider>
          <AuthProvider>
            <SouffleProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </SouffleProvider>
          </AuthProvider>
        </LocationProvider>
      </AudioProvider>
    </LanguageProvider>
  );
}