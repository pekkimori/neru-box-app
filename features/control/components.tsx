import Animated from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { MotionModal as Modal } from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { useDraggableDrawer } from "@/hooks/useDraggableDrawer";
import type { InstalledApp } from "./model";
import { controlStyles } from "./styles";

export function EditorModal({
  visible,
  title,
  subtitle,
  onClose,
  onSave,
  error,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave?: () => Promise<boolean>;
  error?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(controlStyles);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const closeAfterSave = useRef(false);
  const { backdropStyle, closeDrawer, panGesture, sheetStyle } =
    useDraggableDrawer({
      visible,
      onClose,
      onBeforeClose: () => {
        if (!onSave || closeAfterSave.current) {
          closeAfterSave.current = false;
          return true;
        }
        void saveAndClose();
        return false;
      },
    });

  const saveAndClose = async () => {
    if (inFlight.current || !onSave) return;
    inFlight.current = true;
    setSaving(true);
    try {
      if (await onSave()) {
        closeAfterSave.current = true;
        closeDrawer();
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={closeDrawer}
    >
      <GestureHandlerRootView style={styles.editorModalRoot}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.editorBackdrop, backdropStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
            accessibilityLabel={`Close ${title}`}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.editorSheet,
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View
              collapsable={false}
              style={styles.editorDragArea}
            >
              <View style={styles.editorGrabArea}><View style={styles.editorHandle} /></View>
              <View style={styles.editorHeader}>
                <View style={styles.editorTitleGroup}>
                  <Text style={styles.editorEyebrow}>CONTROL / SETTINGS</Text>
                  <Text style={styles.editorTitle}>{title}</Text>
                  {subtitle ? (
                    <Text style={styles.editorSubtitle}>{subtitle}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </GestureDetector>
          <View style={styles.editorBody} pointerEvents={saving ? 'none' : 'auto'}>{children}</View>
          {onSave && <View style={{ padding: 16, gap: 12 }}>
            {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel={`Save ${title}`} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { void saveAndClose(); }} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Discard changes to ${title}`} disabled={saving} onPress={() => { closeAfterSave.current = true; closeDrawer(); }} style={styles.secondaryButton}>
              <Text style={styles.restDismissButtonText}>Discard changes</Text>
            </Pressable>
          </View>}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(controlStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function ToggleSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors } = useAppTheme();

  return (
    <Switch
      {...(Platform.OS === "web"
        ? { activeThumbColor: colors.onAccent }
        : {})}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      ios_backgroundColor={colors.line}
      onValueChange={onValueChange}
      thumbColor={value ? colors.onAccent : colors.surfaceRaised}
      trackColor={{ false: colors.line, true: colors.accent }}
      value={value}
      style={styles.nativeSwitch}
    />
  );
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
