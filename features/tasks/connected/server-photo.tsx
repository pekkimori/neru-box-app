import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../auth/auth-provider';

export function ServerPhoto({ uri, label, style }: { uri: string; label: string; style?: StyleProp<ViewStyle> }) {
  const { client, user } = useAuth();
  const owner = user?.id;
  const [state, setState] = useState<{ owner?: string; uri: string; source?: string; error?: string }>({ uri, owner });
  useEffect(() => {
    if (!client || !user) return;
    const controller = new AbortController();
    setState({ uri, owner });
    void client.getPhoto(uri, controller.signal).then(source => {
      if (!controller.signal.aborted) setState({ uri, source, owner });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ uri, owner, error: error instanceof Error ? error.message : 'Photo unavailable' });
    });
    return () => controller.abort();
  }, [client, user, uri, owner]);
  const current = state.owner === owner && state.uri === uri;
  return <View style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
    {current && state.source ? <Image source={{ uri: state.source }} accessibilityLabel={label} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      : current && state.error ? <Text accessibilityRole="alert" style={{ padding: 8, fontSize: 12 }}>{state.error}</Text> : <ActivityIndicator accessibilityLabel={`Loading ${label}`} />}
  </View>;
}
