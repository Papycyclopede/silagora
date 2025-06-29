const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure we're only targeting mobile platforms
config.resolver.platforms = ['ios', 'android', 'web'];

// Add support for additional asset extensions if needed
config.resolver.assetExts.push(
  // Add any additional asset extensions your project uses
  'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'
);

// Ensure proper source extensions
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json');

// Fix for the callerCallsite error
config.transformer.babelTransformerPath = require.resolve('metro-react-native-babel-transformer');

module.exports = config;