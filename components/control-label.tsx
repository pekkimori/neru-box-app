import type { ReactNode } from 'react';
import { View } from 'react-native';

export function ControlLabel({ children }: { children: ReactNode }) {
  return <View style={{ gap: 8 }}>{children}</View>;
}
