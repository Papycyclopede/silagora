const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver to handle native-only modules on web
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.alias = {
  ...config.resolver.alias,
  // Alias react-native-maps to empty module for web
  'react-native-maps': require.resolve('./web/emptyModule.js'),
  // Alias other native-only modules that might cause issues
  'expo-haptics': require.resolve('./web/emptyModule.js'),
  'expo-local-authentication': require.resolve('./web/emptyModule.js'),
  'expo-sensors': require.resolve('./web/emptyModule.js'),
  'react-native-reanimated': require.resolve('./web/reanimatedWeb.js'),
};

// Add platform-specific extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];

module.exports = config;