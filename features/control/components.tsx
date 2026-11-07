import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppEditor } from '@/components/app-editor';
import { AppSheet } from "@/components/app-sheet";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import type { InstalledApp } from "./model";
import { controlStyles } from "./styles";

export function EditorModal({
  visible,
  title,
  onClose,
  onSave,
  saveLabel = 'Save',
  error,
  fill = true,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave?: () => Promise<boolean>;
  saveLabel?: string;
  error?: string;
  fill?: boolean;
  children: React.ReactNode;
}) {
  if (!onSave) return <AppSheet visible={visible} onDismiss={onClose} title={title}>
    {children}
  </AppSheet>;

  return <AppEditor visible={visible} title={title} onDismiss={onClose}
    onSave={onSave} saveLabel={saveLabel} error={error} fill={fill}>{children}</AppEditor>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(controlStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function AppMark({
  app,
  size = 42,
}: {
  app: InstalledApp;
  size?: number;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: Palette } = useAppTheme();

  return (
    <View
      style={[
        styles.appMark,
        { width: size, height: size, backgroundColor: app.tint },
      ]}
    >
      <Ionicons name={app.icon} size={size * 0.52} color={Palette.white} />
    </View>
  );
}
