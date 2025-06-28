const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver to handle native-only modules on web
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.alias = {
  ...config.resolver.alias,
  // Alias react-native-maps to empty module for web
  'react-native-maps': require.resolve('./web/emptyModule.js'),
};

module.exports = config;