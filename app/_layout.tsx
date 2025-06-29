import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { AudioProvider } from '@/contexts/AudioContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SouffleProvider } from '@/contexts/SouffleContext';
import { NavigationContainer } from '@react-navigation/native';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <NavigationContainer independent={true}>
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
    </NavigationContainer>
  );
}