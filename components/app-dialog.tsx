import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { DismissSurface } from '@/components/app-controls';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppTheme } from '@/theme/app-theme';
import { boxBackdropColor } from '@/theme/boxes';
import { AppLayout, LayoutStyles } from '@/theme/layout';
import { AppButton } from './native-controls';

/** Editors use explicit actions; closing this dialog never saves a draft. */
export function AppDialog({ visible, title, onDismiss, busy = false, fill = false, children, footer }: {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  busy?: boolean;
  /** Give editors with a ScrollView a bounded body between the header and actions. */
  fill?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const dismiss = () => { if (!busy) onDismiss(); };

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={dismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: AppLayout.overlayPadding }}>
          <DismissSurface accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" disabled={busy}
            onPress={dismiss} style={[StyleSheet.absoluteFill, { backgroundColor: boxBackdropColor(colors) }]} />
          <AppBox variant="dialog" padding="none" accessibilityViewIsModal role="dialog" aria-label={title}
            style={{ width: '100%', maxWidth: fill ? AppLayout.contentMaxWidth : AppLayout.dialogMaxWidth, maxHeight: '100%', height: fill ? Math.min(height * 0.86, AppLayout.overlayMaxHeight) : undefined, alignSelf: 'center', flexShrink: 1, overflow: 'hidden' }}>
            <View style={{ minHeight: 0, flexShrink: 1, flex: fill ? 1 : undefined }} pointerEvents={busy ? 'none' : 'auto'}>
              {fill ? children : <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>}
            </View>
            <View style={[LayoutStyles.presentationFooter, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
              {footer ?? <AppButton label="Dismiss" variant="secondary" disabled={busy} onPress={dismiss} />}
            </View>
          </AppBox>
        </SafeAreaView>
      </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
