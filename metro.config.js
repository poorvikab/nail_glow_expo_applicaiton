// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Supabase ships .mjs modules that reference peer packages like
// @supabase/realtime-js. Metro doesn't resolve .mjs by default in
// all Expo SDK versions, so we ensure it's included.
config.resolver.sourceExts = [
  ...new Set([...(config.resolver.sourceExts || []), 'mjs']),
];

module.exports = config;
