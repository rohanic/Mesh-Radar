// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Audio quick replies and the SOS siren ship as bundled audio files.
config.resolver.assetExts.push('wav');

module.exports = config;
