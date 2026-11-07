import { useCallback, useMemo, useRef, useState, type SetStateAction } from 'react';
import { useAccountValue } from '@/hooks/useAccountValue';
import { useEditorDraft } from '@/hooks/useEditorDraft';
import { useSleepSchedule, type SleepScheduleEntry } from '@/hooks/useSleepSchedule';
import {
  TIME_24_HOUR_PATTERN, durationBetweenTimes as durationBetween, getMinuteOfDay,
  splitTimeRange as getTimelineSegments, isMinuteInRange, parseTimeMinutes as timeToMinutes
} from '@/utils/time';
import { savedApps, savedEffects, type SelectedAppDraft, type ModeEffectsDraft } from './editor-draft-model';
import { DEFAULT_EFFECTS, INSTALLED_APPS, getFocusBlockError, type ControlEditor, type FocusBlock, type Mode, type ModeEffects, type SelectedApp } from './model';
import { useFocusSession } from './use-focus-session';

/** Settings drafts, validation, sessions, and timeline derivation for Control. */
export function useControlScreen() {
  const [editor, setEditor] = useState<ControlEditor>(null);
  const appsSettings = useAccountValue<SelectedApp[]>('control-apps', [
    { id: "instagram", limitMinutes: 30 },
    { id: "youtube", limitMinutes: 60 },
    { id: "messages", limitMinutes: 120 },
    { id: "spotify", limitMinutes: 90 },
  ]);
  const [search, setSearch] = useState("");
  const blocksSettings = useAccountValue<FocusBlock[]>('control-focus-blocks', [
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
  const effectsSettings = useAccountValue<Record<Mode, ModeEffects>>('control-effects', DEFAULT_EFFECTS);
  const sleepSettings = useSleepSchedule();
  const { schedule, activeSleep, isSleepWindow, error: sleepError, retry: retrySleep } = sleepSettings;
  const { value: selectedApps, error: appsError, retry: retryApps } = appsSettings;
  const { value: focusBlocks, error: blocksError, retry: retryBlocks } = blocksSettings;
  const { value: effects, error: effectsError, retry: retryEffects } = effectsSettings;
  const [editingMode, setEditingMode] = useState<Mode>("focus");
  const durationSettings = useAccountValue("control-focus-duration", "25");
  const appsDraft = useEditorDraft<SelectedAppDraft[]>(selectedApps, appsSettings.revision, (value, options) => appsSettings.saveAsync(savedApps(value), options));
  const blocksDraft = useEditorDraft(focusBlocks, blocksSettings.revision, blocksSettings.saveAsync);
  const effectsDraft = useEditorDraft<Record<Mode, ModeEffectsDraft>>(effects, effectsSettings.revision, (value, options) => effectsSettings.saveAsync(savedEffects(value), options));
  const sleepDraft = useEditorDraft(schedule, sleepSettings.revision, sleepSettings.saveScheduleAsync);
  const durationDraft = useEditorDraft(durationSettings.value, durationSettings.revision, durationSettings.saveAsync);
  const [editorError, setEditorError] = useState('');
  const editorSaving = useRef(false);
  const setSelectedApps = (next: SetStateAction<SelectedAppDraft[]>) => { setEditorError(''); appsDraft.setValue(next); };
  const setFocusBlocks = (next: SetStateAction<FocusBlock[]>) => { setEditorError(''); blocksDraft.setValue(next); };
  const setEffects = (next: SetStateAction<Record<Mode, ModeEffectsDraft>>) => { setEditorError(''); effectsDraft.setValue(next); };
  const saveSchedule = (next: SetStateAction<SleepScheduleEntry[]>) => { setEditorError(''); sleepDraft.setValue(next); };
  const setFocusDuration = (next: string) => { setEditorError(''); durationDraft.setValue(next); };

  const openEditor = (next: ControlEditor) => {
    appsDraft.begin(); blocksDraft.begin(); effectsDraft.begin(); sleepDraft.begin(); durationDraft.begin();
    setEditorError('');
    setEditor(next);
  };

  const saveEditor = async () => {
    if (editorSaving.current) return false;
    editorSaving.current = true;
    setEditorError('');
    try {
      if (editor === 'schedule') {
        for (const entry of sleepDraft.value) {
          if (!TIME_24_HOUR_PATTERN.test(entry.bedtime) || !TIME_24_HOUR_PATTERN.test(entry.wakeTime)) {
            throw new Error(`${entry.label}: use 24-hour time, for example 23:00.`);
          }
        }
        for (const block of blocksDraft.value) {
          const error = block.enabled
            ? getFocusBlockError(block, blocksDraft.value, sleepDraft.value)
            : (!TIME_24_HOUR_PATTERN.test(block.start) || !TIME_24_HOUR_PATTERN.test(block.end)) ? 'Use 24-hour time, for example 09:30' : null;
          if (error) throw new Error(`${block.label || 'Focus block'}: ${error}`);
          if (!block.label.trim()) throw new Error('Enter a name for each focus block.');
        }
        await sleepDraft.commit();
        await blocksDraft.commit();
      } else if (editor === 'apps') {
        savedApps(appsDraft.value); savedEffects(effectsDraft.value);
        await appsDraft.commit();
        await effectsDraft.commit();
      } else if (editor === 'mode') {
        await effectsDraft.commit();
      } else if (editor === 'focus') {
        const minutes = Number(durationDraft.value);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) throw new Error('Enter a focus duration between 1 and 480 minutes.');
        await durationDraft.commit();
      }
      return true;
    } catch (cause) {
      setEditorError(cause instanceof Error ? cause.message : 'Could not save your changes. Please try again.');
      return false;
    } finally {
      editorSaving.current = false;
    }
  };
  const handleFocusComplete = useCallback(() => setEditor("rest"), []);
  const {
    session,
    now,
    remainingSeconds,
    startSession,
    startRestSession,
    endSession, error: sessionError, retry: retrySession,
  } = useFocusSession(handleFocusComplete);

  const selectedIds = useMemo(
    () => new Set(appsDraft.value.map((app) => app.id)),
    [appsDraft.value],
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
  const activeMode: Mode | "rest" = session?.kind ?? scheduledMode;
  const scheduledFocusMinutes = validFocusBlocks.reduce(
    (total, block) => total + (durationBetween(block.start, block.end) ?? 0),
    0,
  );
  const modeMeta = {
    normal: {
      label: "Normal",
      icon: "radio-button-on" as const,
    },
    focus: {
      label: "Focus",
      icon: "locate" as const,
    },
    sleep: {
      label: "Sleep",
      icon: "moon" as const,
    },
    rest: {
      label: "Rest",
      icon: "cafe" as const,
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
        item.id === id ? { ...item, limitMinutes: value } : item,
      ),
    );
  const updateSleep = (
    id: SleepScheduleEntry["id"],
    patch: Partial<SleepScheduleEntry>,
  ) => {
    setEditorError('');
    saveSchedule((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };
  const updateBlock = (id: string, patch: Partial<FocusBlock>) => {
    setEditorError('');
    setFocusBlocks((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };
  const updateEffect = <Key extends keyof ModeEffectsDraft>(
    key: Key,
    value: ModeEffectsDraft[Key],
  ) =>
    setEffects((current) => ({
      ...current,
      [editingMode]: { ...current[editingMode], [key]: value },
    }));

  const startFocus = async (duration: number) => {
    if (await saveEditor()) {
      startSession(duration);
      setEditor(null);
    }
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return {
    editor,
    setEditor,
    search,
    setSearch,
    sleepError,
    retrySleep,
    selectedApps,
    appsError,
    retryApps,
    blocksError,
    retryBlocks,
    effects,
    effectsError,
    retryEffects,
    editingMode,
    setEditingMode,
    durationSettings,
    appsDraft,
    blocksDraft,
    effectsDraft,
    sleepDraft,
    durationDraft,
    editorError,
    setFocusBlocks,
    setFocusDuration,
    openEditor,
    saveEditor,
    session,
    remainingSeconds,
    startRestSession,
    endSession,
    sessionError,
    retrySession,
    selectedIds,
    filteredApps,
    validFocusBlocks,
    date,
    sleepTimelineSegments,
    scheduledFocusMinutes,
    modeMeta,
    toggleApp,
    updateLimit,
    updateSleep,
    updateBlock,
    updateEffect,
    startFocus,
    formatCountdown
  };
}
