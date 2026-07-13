import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EditorialColors, editorialOverlay } from "@/constants/editorial-theme";
import { EditorModal, SectionLabel } from "@/features/protect/components";
import {
  AppsEditorContent,
  FocusEditorContent,
  ModeEditorContent,
  ScheduleEditorContent,
} from "@/features/protect/editors";
import {
  DEFAULT_EFFECTS,
  INSTALLED_APPS,
  clampMinutes,
  formatDuration,
  getFocusBlockError,
  type FocusBlock,
  type Mode,
  type ModeEffects,
  type ProtectEditor,
  type SelectedApp,
} from "@/features/protect/model";
import { useFocusSession } from "@/features/protect/use-focus-session";
import { protectStyles as styles } from "@/features/protect/styles";
import {
  useSleepSchedule,
  type SleepScheduleEntry,
} from "@/hooks/useSleepSchedule";
import {
  durationBetweenTimes as durationBetween,
  getMinuteOfDay,
  isMinuteInRange,
  parseTimeMinutes as timeToMinutes,
  splitTimeRange as getTimelineSegments,
} from "@/utils/time";

const Palette = {
  ...EditorialColors,
  overlay: editorialOverlay(0.42),
};

export default function ProtectScreen() {
  const [editor, setEditor] = useState<ProtectEditor>(null);
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
  const { session, now, remainingSeconds, startSession, endSession } =
    useFocusSession();

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
  const activeMode: Mode = session ? "focus" : scheduledMode;
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>PROTECT</Text>
            <Text style={styles.eyebrow}>Digital wellbeing</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerAction,
                session && styles.headerActionActive,
              ]}
              onPress={() => (session ? endSession() : setEditor("focus"))}
              accessibilityRole="button"
              accessibilityLabel={
                session ? "End focus session" : "Start focus session"
              }
            >
              <Ionicons
                name={session ? "stop" : "play"}
                size={17}
                color={session ? Palette.white : Palette.red}
              />
              <Text
                style={[
                  styles.headerActionText,
                  session && styles.headerActionTextActive,
                ]}
              >
                {session ? "End" : "Focus"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setEditor("mode")}
              accessibilityRole="button"
              accessibilityLabel="Open mode settings"
            >
              <Ionicons name="options-outline" size={20} color={Palette.ink} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.modeIdentity}>
              <View style={styles.modeIcon}>
                <Ionicons
                  name={modeMeta.icon}
                  size={22}
                  color={Palette.white}
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
              >
                <Text style={styles.secondaryButtonText}>End session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditor("focus")}
              style={styles.primaryButton}
            >
              <Ionicons name="play" size={16} color={Palette.white} />
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
              editor: "apps" as ProtectEditor,
              icon: "apps-outline" as const,
              title: "Apps & limits",
              detail: `${selectedApps.length} selected · shared daily limits`,
            },
            {
              editor: "schedule" as ProtectEditor,
              icon: "calendar-outline" as const,
              title: "Schedule",
              detail: `${validFocusBlocks.length} focus blocks · sleep enabled`,
            },
            {
              editor: "mode" as ProtectEditor,
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
