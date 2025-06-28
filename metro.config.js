const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure we're only targeting mobile platforms
config.resolver.platforms = ['ios', 'android'];

// Add support for additional asset extensions if needed
config.resolver.assetExts.push(
  // Add any additional asset extensions your project uses
  'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'
);

// Ensure proper source extensions
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json');

// Optimize for mobile development
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;