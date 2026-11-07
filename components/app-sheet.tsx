import { BottomSheet, RNHostView } from '@expo/ui';
import type { ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/app-theme';
import { AppLayout } from '@/theme/layout';
import { NativeControlHost } from './native-controls';

/** Freely dismissible native presentation; forms with an explicit save use AppDialog. */
export function AppSheet({ visible, onDismiss, title, children }: {
  visible: boolean; onDismiss: () => void; title: string; children: ReactNode;
}) {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  // The presenter has no inline content. A screen-sized SwiftUI host can
  // intercept touches on the React Native screen even while its sheet is shut.
  // Browser sheets stay in the host's DOM tree, so their controls must remain clickable.
  return <NativeControlHost matchContents={false} pointerEvents={Platform.OS === 'web' ? 'box-none' : 'none'}
    style={{ position: 'absolute', width: 0, height: 0 }}>
    <BottomSheet isPresented={visible} onDismiss={onDismiss} contentPadding={0} containerColor={colors.card}>
      {/* SwiftUI proposes the sheet width; Yoga measures only the height.
          Measuring both axes makes the percentage-width RN child collapse. */}
      <RNHostView matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={{ height: Math.min(height * 0.78, AppLayout.overlayMaxHeight), width: '100%', backgroundColor: colors.card }}>
          <View style={{ width: '100%', maxWidth: AppLayout.contentMaxWidth, alignSelf: 'center', flex: 1 }} role="dialog" aria-label={title} accessibilityViewIsModal>
            <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
          </View>
        </SafeAreaView>
      </RNHostView>
    </BottomSheet>
  </NativeControlHost>;
}
