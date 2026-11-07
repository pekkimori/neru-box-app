import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { AppSwitch } from '@/components/native-controls';
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";

import { AppCheckbox, AppSegments } from "@/components/native-controls";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { AppMark } from "../components";
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
      style={{ flex: 1 }}
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeading>Choose a mode</SectionHeading>
      <AppSegments options={[{ value: 'normal', label: 'Normal' }, { value: 'focus', label: 'Focus' }, { value: 'sleep', label: 'Sleep' }]} value={editingMode} onChange={setEditingMode} />
      <SectionHeading>Effects</SectionHeading>
      <AppBox variant="group" style={styles.settingsCard}>
        {EFFECT_ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[styles.settingRow, index > 0 && styles.menuBorder]}
          >
            <AppBox variant="icon" style={styles.settingIcon}>
              <Ionicons name={row.icon} size={20} color={EditorialColors.ink} />
            </AppBox>
            <View style={styles.menuCopy}>
              <Text style={styles.menuTitle}>{row.label}</Text>
              <Text style={styles.menuDetail}>{row.detail}</Text>
            </View>
            <AppSwitch
              label={row.label}
              compact
              value={effects[editingMode][row.key]}
              onValueChange={(value) => updateEffect(row.key, value)}
            />
          </View>
        ))}
      </AppBox>
      {effects[editingMode].pomodoro ? (
        <AppBox variant="card" style={styles.formCard}>
          <SectionHeading>Pomodoro timing</SectionHeading>
          <View style={styles.timeRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WORK</Text>
              <AppBox variant="field" padding="field" style={styles.minuteField}>
                <TextInput
                  value={String(effects[editingMode].workMinutes)}
                  onChangeText={(value) =>
                    updateEffect("workMinutes", value)
                  }
                  keyboardType="number-pad"
                  style={styles.minuteInput}
                />
                <Text style={styles.unit}>min</Text>
              </AppBox>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BREAK</Text>
              <AppBox variant="field" padding="field" style={styles.minuteField}>
                <TextInput
                  value={String(effects[editingMode].breakMinutes)}
                  onChangeText={(value) =>
                    updateEffect("breakMinutes", value)
                  }
                  keyboardType="number-pad"
                  style={styles.minuteInput}
                />
                <Text style={styles.unit}>min</Text>
              </AppBox>
            </View>
          </View>
        </AppBox>
      ) : null}
      {editingMode !== "normal" ? (
        <>
          <SectionHeading>Apps allowed in this mode</SectionHeading>
          <AppBox variant="group" style={styles.settingsCard}>
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
                  <View key={app.id} style={[styles.allowedRow, index > 0 && styles.menuBorder]}>
                    <AppMark app={app} size={34} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppCheckbox label={app.name} value={checked} onValueChange={(value) => updateEffect('allowedAppIds',
                        value ? [...effects[editingMode].allowedAppIds, app.id] : effects[editingMode].allowedAppIds.filter(id => id !== app.id))} />
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <SectionHeading>No limited apps yet</SectionHeading>
                <Text style={styles.emptyCopy}>
                  Select apps in Apps & limits first.
                </Text>
              </View>
            )}
          </AppBox>
        </>
      ) : (
        <AppBox variant="notice" style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={EditorialColors.secondary}
          />
          <Text style={styles.infoText}>
            Normal is the default for every unassigned time. All selected apps
            use their shared daily limit.
          </Text>
        </AppBox>
      )}
    </ScrollView>
  );
}
