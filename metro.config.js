/**
 * Metro configuration for React Native
 * https://reactnative.dev/docs/metro
 *
 * @format
 */

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Device backups and Xcode archives are local evidence, never app sources.
    blockList: [
      defaultConfig.resolver.blockList,
      /[\\/]\.roqia-feasibility[\\/].*/,
    ].flat(),
  },
};

module.exports = mergeConfig(defaultConfig, config);
