import { Ionicons } from "@expo/vector-icons";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { MotionTouchableOpacity as TouchableOpacity } from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import type { SleepScheduleEntry } from "../../../hooks/useSleepSchedule";
import { TIME_24_HOUR_PATTERN, durationBetweenTimes } from "../../../utils/time";
import { SectionLabel, ToggleSwitch } from "../components";
import { formatDuration, type FocusBlock } from "../model";
import { controlStyles } from "../styles";
import { TimeField, TimePicker } from "../time-picker";

export function ScheduleEditorContent({
  schedule,
  updateSleep,
  focusBlocks,
  setFocusBlocks,
  updateBlock,
  blockError,
  showErrors = false,
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
  showErrors?: boolean;
}) {
  const scroll = useRef<ScrollView>(null);
  const cardPositions = useRef(new Map<string, number>());
  const revealPicker = (id: string, offset: number) => requestAnimationFrame(() => {
    scroll.current?.scrollTo({ y: (cardPositions.current.get(id) ?? 0) + offset, animated: true });
  });
  const [activeTime, setActiveTime] = useState<string | null>(null);
  const toggleTime = (id: string) => setActiveTime(current => current === id ? null : id);
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <SectionLabel>Sleep</SectionLabel>
      {schedule.map((sleep) => (
        <View key={sleep.id} onLayout={event => cardPositions.current.set(sleep.id, event.nativeEvent.layout.y)} style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.formTitle}>{sleep.label}</Text>
              <Text style={styles.formMeta}>
                {sleep.days.join("  ")} ·{" "}
                {durationBetweenTimes(sleep.bedtime, sleep.wakeTime) === null ? '' : formatDuration(durationBetweenTimes(sleep.bedtime, sleep.wakeTime))}
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
              <TimeField value={sleep.bedtime} label={`${sleep.label} bedtime`}
                expanded={activeTime === `${sleep.id}-bedtime`}
                onPress={() => toggleTime(`${sleep.id}-bedtime`)} />
            </View>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={EditorialColors.muted}
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WAKE UP</Text>
              <TimeField value={sleep.wakeTime} label={`${sleep.label} wake time`}
                expanded={activeTime === `${sleep.id}-wakeTime`}
                onPress={() => toggleTime(`${sleep.id}-wakeTime`)} />
            </View>
          </View>
          {(['bedtime', 'wakeTime'] as const).map(field => activeTime === `${sleep.id}-${field}` && (
            <TimePicker key={field} onLayout={event => revealPicker(sleep.id, event.nativeEvent.layout.y)} value={sleep[field]} label={`${sleep.label} ${field === 'bedtime' ? 'bedtime' : 'wake time'}`}
              onChange={value => updateSleep(sleep.id, { [field]: value })} onDone={() => setActiveTime(null)} />
          ))}
          {showErrors && (!TIME_24_HOUR_PATTERN.test(sleep.bedtime) ||
          !TIME_24_HOUR_PATTERN.test(sleep.wakeTime)) ? (
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
        const error = showErrors ? blockError(block) : null;
        return (
          <View
            key={block.id}
            onLayout={event => cardPositions.current.set(block.id, event.nativeEvent.layout.y)}
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
            <View style={styles.timeRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>START</Text>
                <TimeField value={block.start} label={`${block.label} start time`}
                  expanded={activeTime === `${block.id}-start`}
                  onPress={() => toggleTime(`${block.id}-start`)} />
              </View>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={EditorialColors.muted}
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>END</Text>
                <TimeField value={block.end} label={`${block.label} end time`}
                  expanded={activeTime === `${block.id}-end`}
                  onPress={() => toggleTime(`${block.id}-end`)} />
              </View>
            </View>
            {(['start', 'end'] as const).map(field => activeTime === `${block.id}-${field}` && (
              <TimePicker key={field} onLayout={event => revealPicker(block.id, event.nativeEvent.layout.y)} value={block[field]} label={`${block.label} ${field} time`}
                onChange={value => updateBlock(block.id, { [field]: value })} onDone={() => setActiveTime(null)} />
            ))}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.validText}>
                {durationBetweenTimes(block.start, block.end) === null ? '' : `${formatDuration(durationBetweenTimes(block.start, block.end))} allocated to Focus`}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
