import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { AuthButton } from './auth-ui';
import { errorMessage } from '@/lib/api/client';

export type GoogleButtonProps = {
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onToken: (idToken: string) => Promise<void>;
  onError: (message: string | null) => void;
};

export function GoogleButton({ busy, onBusy, onToken, onError }: GoogleButtonProps) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    || (Platform.OS === 'ios' && !iosClientId)) return null;

  const signIn = async () => {
    if (busy) return;
    onBusy(true);
    onError(null);
    try {
      // Lazy import lets email/password auth continue to work in Expo Go.
      const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false });
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        if (!response.data.idToken) throw new Error('Google did not return a sign-in credential. Please try again.');
        await onToken(response.data.idToken);
      }
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      onBusy(false);
    }
  };
  return <AuthButton secondary label="Continue with Google" disabled={busy} onPress={() => { void signIn(); }} />;
}
