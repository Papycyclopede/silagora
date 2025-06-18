// app/(tabs)/_layout.tsx

import React from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Image, Linking, StyleSheet, Text, useWindowDimensions, View, TouchableOpacity } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import { MapPin, Settings, CircleHelp as HelpCircle, ChartBar as BarChart3, Shield } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapScreen from './index';
import DashboardScreen from './dashboard';
import ModerationScreen from './moderation';
import AboutScreen from './about';
import SettingsScreen from './settings';

const renderScene = SceneMap({
  'index': MapScreen,
  'dashboard': DashboardScreen,
  'moderation': ModerationScreen,
  'about': AboutScreen,
  'settings': SettingsScreen,
});

export default function TabLayout() {
  const { t, currentLanguage } = useLanguage();
  const router = useRouter();
  const segments = useSegments();
  const layout = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();

  const allTabBarRoutes = [
    { key: 'index', title: t('tabs.map'), icon: MapPin },
    { key: 'dashboard', title: t('tabs.dashboard'), icon: BarChart3 },
    { key: 'moderation', title: t('tabs.moderation'), icon: Shield },
    { key: 'about', title: t('tabs.about'), icon: HelpCircle },
    { key: 'settings', title: t('tabs.settings'), icon: Settings },
  ];

  const swipeableRoutes = allTabBarRoutes.filter(route => route.key !== 'bolt');

  const currentTab = segments[segments.length - 1] || 'index';
  const initialIndex = swipeableRoutes.findIndex(route => route.key === currentTab);
  
  const [index, setIndex] = React.useState(initialIndex >= 0 ? initialIndex : 0);

  const handleNavigate = (newIndex: number) => {
    // Si on est déjà sur l'onglet, on ne fait rien pour éviter les re-rendus inutiles
    if (index === newIndex) return;
    
    // Sécurité pour éviter les index hors limites
    if (newIndex < 0 || newIndex >= swipeableRoutes.length) return;
    
    const nextRoute = swipeableRoutes[newIndex];
    if (!nextRoute) return;
    
    // Met à jour l'index local de TabView pour un changement visuel instantané
    setIndex(newIndex);
    
    // Met à jour l'URL de l'application via Expo Router
    const path = nextRoute.key === 'index' ? '/(tabs)' : `/(tabs)/${nextRoute.key}`;
    router.navigate(path as any);
  };
  
  const renderTabBar = (props: any) => {
    return (
        <View style={[styles.tabBar, { paddingBottom: bottom }]}>
        {allTabBarRoutes.map((route, i) => {
            // L'état actif est basé sur l'index de TabView pour une réactivité instantanée
            const isActive = props.navigationState.index === i;
            const color = isActive ? '#A8C8E1' : '#B8A082';
            const Icon = route.icon;

            return (
            <TouchableOpacity 
                key={route.key} 
                style={styles.tabItem}
                onPress={() => handleNavigate(i)}
            >
                {Icon && <Icon size={24} color={color} />}
                <Text style={[styles.tabLabel, { color }]}>{route.title}</Text>
            </TouchableOpacity>
            );
        })}
        
        {/* Le bouton "Bolt" est géré séparément comme un lien externe */}
        <TouchableOpacity 
            key="bolt" 
            style={styles.tabItem}
            onPress={() => Linking.openURL('https://bolt.new/')}
            activeOpacity={0.7}
        >
            <Image
            source={require('../../assets/images/white_circle_360x360.png')}
            style={styles.badgeIcon}
            />
            <Text style={[styles.tabLabel, { color: '#B8A082' }]}>Built on Bolt</Text>
        </TouchableOpacity>
        </View>
    );
  };

  return (
    <TabView
      key={currentLanguage} // La clé change avec la langue pour forcer une réinitialisation propre
      navigationState={{ index, routes: swipeableRoutes }}
      renderScene={renderScene}
      onIndexChange={handleNavigate} // Le swipe appelle la même fonction que le clic
      initialLayout={{ width: layout.width }}
      renderTabBar={renderTabBar}
      tabBarPosition="bottom"
      swipeEnabled={true}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fef9e3',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 125, 107, 0.08)',
    paddingTop: 8,
    height: 70,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9, 
    fontFamily: 'Georgia', 
    fontStyle: 'italic', 
    textAlign: 'center',
    marginTop: 4,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 14,
  },
});