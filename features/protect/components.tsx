import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

import {
  EditorialColors,
  editorialOverlay,
} from "../../constants/editorial-theme";
import type { InstalledApp } from "./model";
import { protectStyles as styles } from "./styles";

const Palette = {
  ...EditorialColors,
  overlay: editorialOverlay(0.42),
};

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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.editorModalRoot}>
        <Pressable
          style={styles.editorBackdrop}
          onPress={onClose}
          accessibilityLabel={`Close ${title}`}
        />
        <View style={styles.editorSheet}>
          <View style={styles.editorHandle} />
          <View style={styles.editorHeader}>
            <View style={styles.editorTitleGroup}>
              <Text style={styles.editorEyebrow}>PROTECT / SETTINGS</Text>
              <Text style={styles.editorTitle}>{title}</Text>
              {subtitle ? (
                <Text style={styles.editorSubtitle}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              onPress={onClose}
              style={({ pressed }) => [
                styles.editorClose,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={22} color={Palette.ink} />
            </Pressable>
          </View>
          <View style={styles.editorBody}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function ToggleSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[styles.toggleTrack, value && styles.toggleTrackActive]}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </Pressable>
  );
}

export function AppMark({
  app,
  size = 42,
}: {
  app: InstalledApp;
  size?: number;
}) {
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
