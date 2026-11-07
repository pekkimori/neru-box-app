import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Text, View } from 'react-native';
import { AppDialog } from './app-dialog';
import { AppButton } from './native-controls';
import { useAppTheme } from '@/theme/app-theme';
import { LayoutStyles } from '@/theme/layout';
import { Type } from '@/theme/typography';

export interface AppEditorHandle { submit: () => void }

/** Saving editors share one submission guard and keep their draft open on failure. */
export function AppEditor({ ref, visible, title, onDismiss, onSave, saveLabel = 'Save',
  dismissLabel = 'Dismiss', error, disabled = false, fill = false, children }: {
    ref?: Ref<AppEditorHandle>; visible: boolean; title: string; onDismiss: () => void;
    onSave: () => boolean | Promise<boolean>; saveLabel?: string; dismissLabel?: string;
    error?: string | null; disabled?: boolean; fill?: boolean; children: ReactNode;
  }) {
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const save = async () => {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      if (await onSave()) onDismiss();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save your changes. Please try again.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  useImperativeHandle(ref, () => ({ submit: () => { void save(); } }));
  const dismiss = () => {
    if (inFlight.current) return;
    setSaveError(null);
    onDismiss();
  };
  return <AppDialog visible={visible} title={title} fill={fill} busy={saving} onDismiss={dismiss}
    footer={<>
      {!!(error || saveError) && <Text accessibilityRole="alert" style={{ ...Type.bodySmall, color: colors.accentStrong }}>{error || saveError}</Text>}
      <View style={LayoutStyles.presentationActions}>
        <AppButton label={saveLabel} style={LayoutStyles.presentationAction} disabled={disabled} loading={saving} onPress={() => { void save(); }} />
        <AppButton label={dismissLabel} style={LayoutStyles.presentationAction} variant="secondary" disabled={saving} onPress={dismiss} />
      </View>
    </>}>
    {children}
  </AppDialog>;
}
