const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { resolver } = defaultConfig;

const config = {
  resolver: {
    ...resolver,
    sourceExts: [...resolver.sourceExts, 'mjs', 'cjs'],
    platforms: ['ios', 'android', 'web'],
    assetExts: [...resolver.assetExts, 'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);