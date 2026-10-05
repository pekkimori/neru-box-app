import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const iosUrlScheme = iosClientId?.split('.').reverse().join('.');
  return {
    ...config,
    name: config.name ?? 'neru-box-app',
    slug: config.slug ?? 'neru-box-app',
    ios: {
      ...config.ios,
      ...(process.env.NERU_IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: process.env.NERU_IOS_BUNDLE_IDENTIFIER } : {}),
    },
    android: {
      ...config.android,
      ...(process.env.NERU_ANDROID_PACKAGE ? { package: process.env.NERU_ANDROID_PACKAGE } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      'expo-secure-store',
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, { iosUrlScheme: string }]] : []),
    ],
  };
};
