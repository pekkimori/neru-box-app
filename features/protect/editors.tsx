import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  MotionPressable as Pressable,
  MotionTouchableOpacity as TouchableOpacity,
} from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/features/settings/app-theme";
import type { SleepScheduleEntry } from "../../hooks/useSleepSchedule";
import { TIME_24_HOUR_PATTERN, durationBetweenTimes } from "../../utils/time";
import { AppMark, SectionLabel, ToggleSwitch } from "./components";
import {
  EFFECT_ROWS,
  INSTALLED_APPS,
  clampMinutes,
  formatDuration,
  type FocusBlock,
  type InstalledApp,
  type Mode,
  type ModeEffects,
  type SelectedApp,
} from "./model";
import { protectStyles } from "./styles";

type UpdateEffect = <Key extends keyof ModeEffects>(
  key: Key,
  value: ModeEffects[Key],
) => void;

export function AppsEditorContent({
  search,
  setSearch,
  selectedApps,
  selectedIds,
  filteredApps,
  toggleApp,
  updateLimit,
}: {
  search: string;
  setSearch: (value: string) => void;
  selectedApps: SelectedApp[];
  selectedIds: ReadonlySet<string>;
  filteredApps: InstalledApp[];
  toggleApp: (id: string) => void;
  updateLimit: (id: string, value: string | number) => void;
}) {
  const styles = useThemedStyles(protectStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={EditorialColors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search installed apps"
          placeholderTextColor={EditorialColors.muted}
          style={styles.searchInput}
          accessibilityLabel="Search installed apps"
        />
      </View>
      <Text style={styles.selectionCount}>
        {selectedApps.length} APPS SELECTED
      </Text>
      {filteredApps.length ? (
        filteredApps.map((app) => {
          const selected = selectedIds.has(app.id);
          const selectedApp = selectedApps.find((item) => item.id === app.id);
          return (
            <View key={app.id} style={styles.appRowWrap}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleApp(app.id)}
                style={({ pressed }) => [
                  styles.appRow,
                  pressed && styles.pressed,
                ]}
              >
                <AppMark app={app} />
                <View style={styles.appCopy}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appCategory}>{app.category}</Text>
                </View>
                <View
                  style={[styles.checkbox, selected && styles.checkboxSelected]}
                >
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color={EditorialColors.onAccent}
                    />
                  ) : null}
                </View>
              </Pressable>
              {selected && selectedApp ? (
                <View style={styles.limitEditor}>
                  <Text style={styles.limitLabel}>Daily limit</Text>
                  <View style={styles.chipRow}>
                    {[15, 30, 60, 120].map((minutes) => (
                      <TouchableOpacity
                        key={minutes}
                        accessibilityLabel={`${app.name}, ${minutes} minute daily limit`}
                        onPress={() => updateLimit(app.id, minutes)}
                        style={[
                          styles.chip,
                          selectedApp.limitMinutes === minutes &&
                            styles.chipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedApp.limitMinutes === minutes &&
                              styles.chipTextActive,
                          ]}
                        >
                          {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <View style={styles.customLimit}>
                      <TextInput
                        value={String(selectedApp.limitMinutes)}
                        onChangeText={(value) => updateLimit(app.id, value)}
                        keyboardType="number-pad"
                        style={styles.limitInput}
                        accessibilityLabel={`${app.name} custom limit in minutes`}
                      />
                      <Text style={styles.unit}>min</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="search-outline"
            size={28}
            color={EditorialColors.muted}
          />
          <Text style={styles.emptyTitle}>No apps found</Text>
          <Text style={styles.emptyCopy}>
            Try a different app name or category.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export function ScheduleEditorContent({
  schedule,
  updateSleep,
  focusBlocks,
  setFocusBlocks,
  updateBlock,
  blockError,
}: {
  schedule: SleepScheduleEntry[];
  updateSleep: (
    id: SleepScheduleEntry["id"],
    patch: Partial<SleepScheduleEntry>,
  ) => void;
  focusBlocks: FocusBlock[];
  setFocusBlocks: Dispatch<SetStateAction<FocusBlock[]>>;
  updateBlock: (id: string, patch: Partial<FocusBlock>) => void;
  blockError: (block: FocusBlock) => string | null;
}) {
  const styles = useThemedStyles(protectStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <SectionLabel>Sleep</SectionLabel>
      {schedule.map((sleep) => (
        <View key={sleep.id} style={styles.formCard}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>{sleep.label}</Text>
              <Text style={styles.formMeta}>
                {sleep.days.join("  ")} ·{" "}
                {formatDuration(
                  durationBetweenTimes(sleep.bedtime, sleep.wakeTime),
                )}
              </Text>
            </View>
            <ToggleSwitch
              value={sleep.enabled}
              onValueChange={(enabled) => updateSleep(sleep.id, { enabled })}
            />
          </View>
          <View style={styles.timeRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BEDTIME</Text>
              <TextInput
                value={sleep.bedtime}
                onChangeText={(bedtime) => updateSleep(sleep.id, { bedtime })}
                style={styles.timeInput}
                accessibilityLabel={`${sleep.label} bedtime`}
              />
            </View>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={EditorialColors.muted}
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WAKE UP</Text>
              <TextInput
                value={sleep.wakeTime}
                onChangeText={(wakeTime) => updateSleep(sleep.id, { wakeTime })}
                style={styles.timeInput}
                accessibilityLabel={`${sleep.label} wake time`}
              />
            </View>
          </View>
          {!TIME_24_HOUR_PATTERN.test(sleep.bedtime) ||
          !TIME_24_HOUR_PATTERN.test(sleep.wakeTime) ? (
            <Text style={styles.errorText}>
              Use 24-hour time, for example 23:00.
            </Text>
          ) : null}
        </View>
      ))}
      <View style={styles.sectionHeader}>
        <SectionLabel>Focus blocks</SectionLabel>
        <TouchableOpacity
          onPress={() =>
            setFocusBlocks((current) => [
              ...current,
              {
                id: String(Date.now()),
                label: "Focus",
                start: "10:00",
                end: "11:00",
                enabled: true,
              },
            ])
          }
        >
          <Text style={styles.textAction}>+ Add block</Text>
        </TouchableOpacity>
      </View>
      {focusBlocks.map((block) => {
        const error = blockError(block);
        return (
          <View
            key={block.id}
            style={[styles.formCard, error && styles.formCardError]}
          >
            <View style={styles.formHeader}>
              <TextInput
                value={block.label}
                onChangeText={(label) => updateBlock(block.id, { label })}
                style={styles.blockName}
                accessibilityLabel="Focus block name"
              />
              <ToggleSwitch
                value={block.enabled}
                onValueChange={(enabled) => updateBlock(block.id, { enabled })}
              />
            </View>
            <View style={styles.timeRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>START</Text>
                <TextInput
                  value={block.start}
                  onChangeText={(start) => updateBlock(block.id, { start })}
                  style={styles.timeInput}
                />
              </View>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={EditorialColors.muted}
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>END</Text>
                <TextInput
                  value={block.end}
                  onChangeText={(end) => updateBlock(block.id, { end })}
                  style={styles.timeInput}
                />
              </View>
              <TouchableOpacity
                accessibilityLabel={`Delete ${block.label}`}
                onPress={() =>
                  setFocusBlocks((current) =>
                    current.filter((item) => item.id !== block.id),
                  )
                }
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color={EditorialColors.red}
                />
              </TouchableOpacity>
            </View>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.validText}>
                {formatDuration(durationBetweenTimes(block.start, block.end))}{" "}
                allocated to Focus
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

export function FocusEditorContent({
  focusDuration,
  setFocusDuration,
  startFocus,
}: {
  focusDuration: string;
  setFocusDuration: (value: string) => void;
  startFocus: (duration: number) => void;
}) {
  const styles = useThemedStyles(protectStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.focusHero}>
        <View style={styles.focusHeroIcon}>
          <Ionicons name="locate" size={28} color={EditorialColors.red} />
        </View>
        <Text style={styles.focusHeroTitle}>How long do you need?</Text>
        <Text style={styles.focusHeroCopy}>
          The timer runs while this screen remains open.
        </Text>
      </View>
      <View style={styles.durationGrid}>
        {[25, 45, 60].map((minutes) => (
          <TouchableOpacity
            key={minutes}
            onPress={() => setFocusDuration(String(minutes))}
            style={[
              styles.durationButton,
              focusDuration === String(minutes) && styles.durationButtonActive,
            ]}
          >
            <Text
              style={[
                styles.durationValue,
                focusDuration === String(minutes) && styles.durationValueActive,
              ]}
            >
              {minutes}
            </Text>
            <Text
              style={[
                styles.durationUnit,
                focusDuration === String(minutes) && styles.durationValueActive,
              ]}
            >
              MINUTES
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.customDurationRow}>
        <Text style={styles.formTitle}>Custom duration</Text>
        <View style={styles.customLimit}>
          <TextInput
            value={focusDuration}
            onChangeText={setFocusDuration}
            keyboardType="number-pad"
            style={styles.limitInput}
            accessibilityLabel="Custom focus duration in minutes"
          />
          <Text style={styles.unit}>min</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => startFocus(clampMinutes(focusDuration, 1, 480))}
        style={styles.primaryButton}
      >
        <Ionicons name="play" size={16} color={EditorialColors.onAccent} />
        <Text style={styles.primaryButtonText}>Start focus</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export function ModeEditorContent({
  editingMode,
  setEditingMode,
  effects,
  updateEffect,
  selectedApps,
}: {
  editingMode: Mode;
  setEditingMode: (mode: Mode) => void;
  effects: Record<Mode, ModeEffects>;
  updateEffect: UpdateEffect;
  selectedApps: SelectedApp[];
}) {
  const styles = useThemedStyles(protectStyles);
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
                    updateEffect("workMinutes", clampMinutes(value, 1, 180))
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
                    updateEffect("breakMinutes", clampMinutes(value, 1, 60))
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
