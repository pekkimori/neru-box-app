import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { normalizeApiUrl } from './client';

export function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return normalizeApiUrl(configured);
  if (!__DEV__) throw new Error('Neru is not configured for this build. Please contact support.');

  const host = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.hostname
    : Constants.expoConfig?.hostUri?.split(':')[0];
  return normalizeApiUrl(`http://${host || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')}:3007`);
}
