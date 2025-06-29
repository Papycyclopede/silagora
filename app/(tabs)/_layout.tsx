import { Tabs } from 'expo-router';
import { Chrome as Home, User, Settings, ChartBar as BarChart3, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const canModerate = user?.moderationLevel === 'trusted';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#687fb2',
        tabBarInactiveTintColor: '#8B7355',
        tabBarStyle: {
          backgroundColor: '#F9F5F0',
          borderTopColor: 'rgba(139, 115, 85, 0.1)',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Activité',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      {canModerate && (
        <Tabs.Screen
          name="moderation"
          options={{
            title: 'Modération',
            tabBarIcon: ({ size, color }) => (
              <Shield size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="about"
        options={{
          title: 'À propos',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}