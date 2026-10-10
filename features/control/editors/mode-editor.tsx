import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { AppMark, SectionLabel, ToggleSwitch } from "../components";
import {
  EFFECT_ROWS,
  INSTALLED_APPS,
  type Mode,
  type SelectedApp,
} from "../model";
import { controlStyles } from "../styles";
import type { ModeEffectsDraft } from '../editor-draft-model';

type UpdateEffect = <Key extends keyof ModeEffectsDraft>(
  key: Key,
  value: ModeEffectsDraft[Key],
) => void;

export function ModeEditorContent({
  editingMode,
  setEditingMode,
  effects,
  updateEffect,
  selectedApps,
}: {
  editingMode: Mode;
  setEditingMode: (mode: Mode) => void;
  effects: Record<Mode, ModeEffectsDraft>;
  updateEffect: UpdateEffect;
  selectedApps: SelectedApp[];
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <View accessibilityRole="tablist" style={styles.modeTabs}>
        {(["normal", "focus", "sleep"] as Mode[]).map((mode) => (
          <Pressable
            key={mode}
            accessibilityRole="tab"
            accessibilityState={{ selected: editingMode === mode }}
            onPress={() => setEditingMode(mode)}
            style={[
              styles.modeTab,
              editingMode === mode && styles.modeTabActive,
            ]}
          >
            <Ionicons
              name={
                mode === "normal"
                  ? "radio-button-on"
                  : mode === "focus"
                    ? "locate"
                    : "moon"
              }
              size={16}
              color={
                editingMode === mode
                  ? EditorialColors.onAccent
                  : EditorialColors.secondary
              }
            />
            <Text
              style={[
                styles.modeTabText,
                editingMode === mode && styles.modeTabTextActive,
              ]}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <SectionLabel>Effects</SectionLabel>
      <View style={styles.settingsCard}>
        {EFFECT_ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[styles.settingRow, index > 0 && styles.menuBorder]}
          >
            <View style={styles.settingIcon}>
              <Ionicons name={row.icon} size={20} color={EditorialColors.ink} />
            </View>
            <View style={styles.menuCopy}>
              <Text style={styles.menuTitle}>{row.label}</Text>
              <Text style={styles.menuDetail}>{row.detail}</Text>
            </View>
            <ToggleSwitch
              value={effects[editingMode][row.key]}
              onValueChange={(value) => updateEffect(row.key, value)}
            />
          </View>
        ))}
      </View>
      {effects[editingMode].pomodoro ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Pomodoro timing</Text>
          <View style={styles.timeRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WORK</Text>
              <View style={styles.minuteField}>
                <TextInput
                  value={String(effects[editingMode].workMinutes)}
                  onChangeText={(value) =>
                    updateEffect("workMinutes", value)
                  }
                  keyboardType="number-pad"
                  style={styles.minuteInput}
                />
                <Text style={styles.unit}>min</Text>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BREAK</Text>
              <View style={styles.minuteField}>
                <TextInput
                  value={String(effects[editingMode].breakMinutes)}
                  onChangeText={(value) =>
                    updateEffect("breakMinutes", value)
                  }
                  keyboardType="number-pad"
                  style={styles.minuteInput}
                />
                <Text style={styles.unit}>min</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
      {editingMode !== "normal" ? (
        <>
          <SectionLabel>Apps allowed in this mode</SectionLabel>
          <View style={styles.settingsCard}>
            {selectedApps.length ? (
              selectedApps.map((selected, index) => {
                const app = INSTALLED_APPS.find(
                  (item) => item.id === selected.id,
                );
                if (!app) return null;
                const checked = effects[editingMode].allowedAppIds.includes(
                  app.id,
                );
                return (
                  <Pressable
                    key={app.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() =>
                      updateEffect(
                        "allowedAppIds",
                        checked
                          ? effects[editingMode].allowedAppIds.filter(
                              (id) => id !== app.id,
                            )
                          : [...effects[editingMode].allowedAppIds, app.id],
                      )
                    }
                    style={[styles.allowedRow, index > 0 && styles.menuBorder]}
                  >
                    <AppMark app={app} size={34} />
                    <Text style={[styles.appName, styles.allowedName]}>
                      {app.name}
                    </Text>
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxSelected,
                      ]}
                    >
                      {checked ? (
                        <Ionicons
                          name="checkmark"
                          size={17}
                          color={EditorialColors.onAccent}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No limited apps yet</Text>
                <Text style={styles.emptyCopy}>
                  Select apps in Apps & limits first.
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={EditorialColors.secondary}
          />
          <Text style={styles.infoText}>
            Normal is the default for every unassigned time. All selected apps
            use their shared daily limit.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
