import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MotionModal as Modal, MotionPressable } from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/features/control/app-theme";
import { useDraggableDrawer } from "@/hooks/useDraggableDrawer";
import type { InstalledApp } from "./model";
import { controlStyles } from "./styles";

export function EditorModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: Palette } = useAppTheme();
  const { backdropOpacity, closeDrawer, panHandlers, translateY } =
    useDraggableDrawer({
      visible,
      onClose,
    });

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={closeDrawer}
    >
      <View style={styles.editorModalRoot}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.editorBackdrop, { opacity: backdropOpacity }]}
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
            { transform: [{ translateY }] },
          ]}
        >
          <View
            {...panHandlers}
            collapsable={false}
            style={styles.editorDragArea}
          >
            <View style={styles.editorHandle} />
            <View style={styles.editorHeader}>
              <View style={styles.editorTitleGroup}>
                <Text style={styles.editorEyebrow}>CONTROL / SETTINGS</Text>
                <Text style={styles.editorTitle}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.editorSubtitle}>{subtitle}</Text>
                ) : null}
              </View>
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
                onPress={closeDrawer}
                style={({ pressed }) => [
                  styles.editorClose,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={22} color={Palette.ink} />
              </MotionPressable>
            </View>
          </View>
          <View style={styles.editorBody}>{children}</View>
        </Animated.View>
      </View>
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

  return (
    <MotionPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[styles.toggleTrack, value && styles.toggleTrackActive]}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </MotionPressable>
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
