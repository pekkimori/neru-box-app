import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { MotionTouchableOpacity as TouchableOpacity } from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import type { SleepScheduleEntry } from "../../../hooks/useSleepSchedule";
import { TIME_24_HOUR_PATTERN, durationBetweenTimes } from "../../../utils/time";
import { SectionLabel, ToggleSwitch } from "../components";
import { formatDuration, type FocusBlock } from "../model";
import { controlStyles } from "../styles";

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
  const styles = useThemedStyles(controlStyles);
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
                  accessibilityLabel={`${block.label} start time`}
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
                  accessibilityLabel={`${block.label} end time`}
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
                {durationBetweenTimes(block.start, block.end) === null ? '' : `${formatDuration(durationBetweenTimes(block.start, block.end))} allocated to Focus`}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
