const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');
config.watchFolders = [path.resolve(__dirname, '../shared')];

// The web demo swaps native-only modules for browser versions in web/shims. Code inside web/
// itself still reaches the real packages.
const WEB_SHIMS = {
  'expo-file-system': 'expoFileSystem.ts',
  'expo-image-picker': 'expoImagePicker.ts',
  'expo-secure-store': 'expoSecureStore.ts',
  'expo-sms': 'expoSms.ts',
  'react-native-fast-tflite': 'fastTflite.ts',
};

const WEB_DEMO_FOLDER = path.resolve(__dirname, 'web') + path.sep;
const resolveDefault = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromWebDemo = context.originModulePath.startsWith(WEB_DEMO_FOLDER);
  const shim = platform === 'web' && !fromWebDemo && WEB_SHIMS[moduleName];
  if (shim) return { type: 'sourceFile', filePath: path.resolve(__dirname, 'web/shims', shim) };
  return (resolveDefault ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
