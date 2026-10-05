import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionTouchableOpacity as TouchableOpacity } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { APP_ACCENT_PRESETS } from "@/theme/editorial-theme";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { EditorModal, SectionLabel } from "@/features/control/components";
import {
    AppsEditorContent,
    FocusEditorContent,
    ModeEditorContent,
    RestPromptContent,
    ScheduleEditorContent,
} from "@/features/control/editors";
import {
    DEFAULT_EFFECTS,
    INSTALLED_APPS,
    clampMinutes,
    formatDuration,
    getFocusBlockError,
    type ControlEditor,
    type FocusBlock,
    type Mode,
    type ModeEffects,
    type SelectedApp,
} from "@/features/control/model";
import { controlStyles } from "@/features/control/styles";
import { useFocusSession } from "@/features/control/use-focus-session";
import {
    useSleepSchedule,
    type SleepScheduleEntry,
} from "@/hooks/useSleepSchedule";
import {
    durationBetweenTimes as durationBetween,
    getMinuteOfDay,
    splitTimeRange as getTimelineSegments,
    isMinuteInRange,
    parseTimeMinutes as timeToMinutes,
} from "@/utils/time";

export default function ControlScreen() {
  const {
    appearance,
    accentPreset,
    colors: Palette,
    setMode,
    setAccentId,
  } = useAppTheme();
  const styles = useThemedStyles(controlStyles, appearance);
  const [editor, setEditor] = useState<ControlEditor>(null);
  const [selectedApps, setSelectedApps] = useState<SelectedApp[]>([
    { id: "instagram", limitMinutes: 30 },
    { id: "youtube", limitMinutes: 60 },
    { id: "messages", limitMinutes: 120 },
    { id: "spotify", limitMinutes: 90 },
  ]);
  const [search, setSearch] = useState("");
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([
    {
      id: "morning",
      label: "Deep work",
      start: "09:00",
      end: "10:30",
      enabled: true,
    },
    {
      id: "afternoon",
      label: "Study",
      start: "15:30",
      end: "16:30",
      enabled: true,
    },
  ]);
  const [effects, setEffects] =
    useState<Record<Mode, ModeEffects>>(DEFAULT_EFFECTS);
  const { schedule, saveSchedule, activeSleep, isSleepWindow } =
    useSleepSchedule();
  const [editingMode, setEditingMode] = useState<Mode>("focus");
  const [focusDuration, setFocusDuration] = useState("25");
  const handleFocusComplete = useCallback(() => setEditor("rest"), []);
  const {
    session,
    now,
    remainingSeconds,
    startSession,
    startRestSession,
    endSession,
  } = useFocusSession(handleFocusComplete);

  const selectedIds = useMemo(
    () => new Set(selectedApps.map((app) => app.id)),
    [selectedApps],
  );
  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return INSTALLED_APPS.filter(
      (app) =>
        !query ||
        app.name.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query),
    ).sort(
      (a, b) => Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)),
    );
  }, [search, selectedIds]);

  const blockError = (block: FocusBlock) => {
    return getFocusBlockError(block, focusBlocks, schedule);
  };

  const validFocusBlocks = focusBlocks.filter(
    (block) => block.enabled && !blockError(block),
  );
  const enabledSleepSchedules = schedule.filter(
    (entry) => entry.enabled,
  ).length;
  const date = new Date(now);
  const currentMinute = getMinuteOfDay(date);
  const isInRange = (start: string, end: string) => {
    const startMinute = timeToMinutes(start);
    const endMinute = timeToMinutes(end);
    if (startMinute === null || endMinute === null) return false;
    return isMinuteInRange(currentMinute, startMinute, endMinute);
  };
  const sleepTimelineSegments = activeSleep
    ? getTimelineSegments(activeSleep.bedtime, activeSleep.wakeTime)
    : [];
  const scheduledMode: Mode = isSleepWindow
    ? "sleep"
    : validFocusBlocks.some((block) => isInRange(block.start, block.end))
      ? "focus"
      : "normal";
  const activeMode: Mode | "rest" = session?.kind ?? scheduledMode;
  const scheduledFocusMinutes = validFocusBlocks.reduce(
    (total, block) => total + (durationBetween(block.start, block.end) ?? 0),
    0,
  );
  const modeMeta = {
    normal: {
      label: "Normal",
      icon: "radio-button-on" as const,
      detail: "Your default limits are active.",
    },
    focus: {
      label: "Focus",
      icon: "locate" as const,
      detail: session
        ? "A timed focus session is running."
        : "Scheduled focus settings are active.",
    },
    sleep: {
      label: "Sleep",
      icon: "moon" as const,
      detail: "Your wind-down settings are active.",
    },
    rest: {
      label: "Rest",
      icon: "cafe" as const,
      detail: "A short recovery break is running.",
    },
  }[activeMode];

  const toggleApp = (id: string) => {
    const selected = selectedIds.has(id);
    setSelectedApps((current) =>
      selected
        ? current.filter((item) => item.id !== id)
        : [...current, { id, limitMinutes: 30 }],
    );
    if (selected)
      setEffects((current) => ({
        ...current,
        focus: {
          ...current.focus,
          allowedAppIds: current.focus.allowedAppIds.filter(
            (appId) => appId !== id,
          ),
        },
        sleep: {
          ...current.sleep,
          allowedAppIds: current.sleep.allowedAppIds.filter(
            (appId) => appId !== id,
          ),
        },
      }));
  };

  const updateLimit = (id: string, value: string | number) =>
    setSelectedApps((current) =>
      current.map((item) =>
        item.id === id ? { ...item, limitMinutes: clampMinutes(value) } : item,
      ),
    );
  const updateSleep = (
    id: SleepScheduleEntry["id"],
    patch: Partial<SleepScheduleEntry>,
  ) =>
    saveSchedule((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateBlock = (id: string, patch: Partial<FocusBlock>) =>
    setFocusBlocks((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateEffect = <Key extends keyof ModeEffects>(
    key: Key,
    value: ModeEffects[Key],
  ) =>
    setEffects((current) => ({
      ...current,
      [editingMode]: { ...current[editingMode], [key]: value },
    }));

  const startFocus = (duration: number) => {
    startSession(duration);
    setEditor(null);
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Control"
          tabIndex={0}
          actions={[
            { accessibilityLabel: "Open your account", icon: "person-circle-outline", onPress: () => router.push('/account') },
            {
              accessibilityLabel: session
                ? `End ${session.kind} session`
                : "Start focus session",
              icon: session ? "stop-outline" : "play-outline",
              active: Boolean(session),
              onPress: () => (session ? endSession() : setEditor("focus")),
            },
            {
              accessibilityLabel: "Open mode settings",
              icon: "options-outline",
              onPress: () => setEditor("mode"),
            },
          ]}
        />

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.modeIdentity}>
              <View style={styles.modeIcon}>
                <Ionicons
                  name={modeMeta.icon}
                  size={22}
                  color={Palette.onAccent}
                />
              </View>
              <View>
                <Text style={styles.statusLabel}>Active now</Text>
                <Text style={styles.modeTitle}>{modeMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.clock}>
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Text style={styles.statusDetail}>{modeMeta.detail}</Text>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {formatDuration(scheduledFocusMinutes)}
              </Text>
              <Text style={styles.metricLabel}>FOCUS PLANNED</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{selectedApps.length}</Text>
              <Text style={styles.metricLabel}>APPS LIMITED</Text>
            </View>
          </View>
          {session ? (
            <View style={styles.sessionRow}>
              <Text style={styles.sessionTime}>
                {formatCountdown(remainingSeconds)}
              </Text>
              <TouchableOpacity
                onPress={endSession}
                style={styles.secondaryButton}
                accessibilityLabel={`End ${session.kind} session`}
              >
                <Text style={styles.secondaryButtonText}>
                  End {session.kind === "rest" ? "rest" : "session"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditor("focus")}
              style={styles.primaryButton}
            >
              <Ionicons name="play" size={16} color={Palette.onAccent} />
              <Text style={styles.primaryButtonText}>Start focus</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <SectionLabel>Today</SectionLabel>
          <TouchableOpacity onPress={() => setEditor("schedule")}>
            <Text style={styles.textAction}>Edit schedule</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timelineCard}>
          <View style={styles.timelineTrack}>
            {validFocusBlocks.map((block) => {
              const start = timeToMinutes(block.start) ?? 0;
              const length = durationBetween(block.start, block.end) ?? 0;
              return (
                <View
                  key={block.id}
                  style={[
                    styles.timelineFocus,
                    {
                      left: `${(start / 1440) * 100}%`,
                      width: `${Math.min(length / 1440, 1 - start / 1440) * 100}%`,
                    },
                  ]}
                />
              );
            })}
            {sleepTimelineSegments.map((segment, index) => (
              <View
                key={`sleep-${index}`}
                style={[
                  styles.timelineSleep,
                  {
                    left: `${(segment.start / 1440) * 100}%`,
                    width: `${(segment.duration / 1440) * 100}%`,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.hourRow}>
            {["00", "06", "12", "18", "24"].map((hour) => (
              <Text key={hour} style={styles.hour}>
                {hour}
              </Text>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Palette.line }]}
              />
              <Text style={styles.legendText}>Normal</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Palette.red }]}
              />
              <Text style={styles.legendText}>Focus</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Palette.blue }]}
              />
              <Text style={styles.legendText}>Sleep</Text>
            </View>
          </View>
        </View>

        <SectionLabel>Configure</SectionLabel>
        <View style={styles.menuCard}>
          {[
            {
              editor: "apps" as ControlEditor,
              icon: "apps-outline" as const,
              title: "Apps & limits",
              detail: `${selectedApps.length} selected · shared daily limits`,
            },
            {
              editor: "schedule" as ControlEditor,
              icon: "calendar-outline" as const,
              title: "Schedule",
              detail: `${validFocusBlocks.length} focus blocks · ${
                enabledSleepSchedules === 0
                  ? "sleep off"
                  : `${enabledSleepSchedules} sleep ${enabledSleepSchedules === 1 ? "schedule" : "schedules"}`
              }`,
            },
            {
              editor: "mode" as ControlEditor,
              icon: "options-outline" as const,
              title: "Mode settings",
              detail: "Mute, filters, Pomodoro and access",
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.detail}`}
              onPress={() => setEditor(item.editor)}
              style={[styles.menuRow, index > 0 && styles.menuBorder]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={21} color={Palette.ink} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDetail}>{item.detail}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Palette.muted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <SectionLabel>Appearance</SectionLabel>
        <View style={styles.appearanceCard}>
          <View style={styles.appearanceHeader}>
            <View style={styles.appearanceIcon}>
              <Ionicons
                name="color-palette-outline"
                size={20}
                color={Palette.red}
              />
            </View>
            <View style={styles.appearanceCopy}>
              <Text style={styles.appearanceTitle}>App theme</Text>
              <Text style={styles.appearanceDetail}>
                {appearance.mode === "dark" ? "Dark" : "Light"} ·{" "}
                {accentPreset.label}
              </Text>
            </View>
          </View>

          <Text style={styles.appearanceFieldLabel}>COLOR MODE</Text>
          <View style={styles.appearanceModeRow} accessibilityRole="radiogroup">
            {[
              {
                id: "light" as const,
                label: "Light",
                icon: "sunny-outline" as const,
              },
              {
                id: "dark" as const,
                label: "Dark",
                icon: "moon-outline" as const,
              },
            ].map((mode) => {
              const selected = appearance.mode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${mode.label} mode`}
                  onPress={() => setMode(mode.id)}
                  style={[
                    styles.appearanceMode,
                    selected && styles.appearanceModeActive,
                  ]}
                >
                  <Ionicons
                    name={mode.icon}
                    size={18}
                    color={selected ? Palette.onAccent : Palette.secondary}
                  />
                  <Text
                    style={[
                      styles.appearanceModeText,
                      selected && styles.appearanceModeTextActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={17}
                      color={Palette.onAccent}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.appearanceFieldLabel}>ACCENT PALETTE</Text>
          <View style={styles.accentGrid} accessibilityRole="radiogroup">
            {APP_ACCENT_PRESETS.map((preset) => {
              const selected = appearance.accentId === preset.id;
              const swatch =
                appearance.mode === "dark" ? preset.dark : preset.light;
              return (
                <TouchableOpacity
                  key={preset.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${preset.label} accent. ${preset.description}`}
                  onPress={() => setAccentId(preset.id)}
                  style={[
                    styles.accentOption,
                    selected && styles.accentOptionActive,
                  ]}
                >
                  <View
                    style={[styles.accentSwatch, { backgroundColor: swatch }]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={Palette.onAccent}
                      />
                    ) : null}
                  </View>
                  <View style={styles.accentCopy}>
                    <Text style={styles.accentName}>{preset.label}</Text>
                    <Text style={styles.accentDescription}>
                      {preset.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      <EditorModal
        visible={editor === "apps"}
        title="Apps & limits"
        subtitle="Choose apps and set one daily limit for each."
        onClose={() => {
          setEditor(null);
          setSearch("");
        }}
      >
        <AppsEditorContent
          search={search}
          setSearch={setSearch}
          selectedApps={selectedApps}
          selectedIds={selectedIds}
          filteredApps={filteredApps}
          toggleApp={toggleApp}
          updateLimit={updateLimit}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "schedule"}
        title="Schedule"
        subtitle="Normal fills every unassigned part of your day."
        onClose={() => setEditor(null)}
      >
        <ScheduleEditorContent
          schedule={schedule}
          updateSleep={updateSleep}
          focusBlocks={focusBlocks}
          setFocusBlocks={setFocusBlocks}
          updateBlock={updateBlock}
          blockError={blockError}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "focus"}
        title="Start focus"
        subtitle="A one-off session that overrides today's schedule."
        onClose={() => setEditor(null)}
      >
        <FocusEditorContent
          focusDuration={focusDuration}
          setFocusDuration={setFocusDuration}
          startFocus={startFocus}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "rest"}
        title="Focus complete"
        subtitle="Make space to recharge before the next round."
        onClose={() => setEditor(null)}
      >
        <RestPromptContent
          restMinutes={effects.focus.breakMinutes}
          startRest={() => {
            startRestSession(effects.focus.breakMinutes);
            setEditor(null);
          }}
          dismiss={() => setEditor(null)}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "mode"}
        title="Mode settings"
        subtitle="Configure each mode independently."
        onClose={() => setEditor(null)}
      >
        <ModeEditorContent
          editingMode={editingMode}
          setEditingMode={setEditingMode}
          effects={effects}
          updateEffect={updateEffect}
          selectedApps={selectedApps}
        />
      </EditorModal>
    </SafeAreaView>
  );
}
