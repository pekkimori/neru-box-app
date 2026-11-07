import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ButtonIcon, ButtonLabel, IconButton, TextButton } from '@/components/app-controls';
import { AppSwitch } from '@/components/native-controls';
import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { Text, TextInput, View } from "react-native";


import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import type { SleepScheduleEntry } from "../../../hooks/useSleepSchedule";
import { TIME_24_HOUR_PATTERN, durationBetweenTimes } from "../../../utils/time";
import { formatDuration, type FocusBlock } from "../model";
import { controlStyles } from "../styles";
import { TimeField } from "@/components/time-picker";

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
      style={{ flex: 1 }}
      contentContainerStyle={styles.editorContent}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeading>Sleep schedule</SectionHeading>
      {schedule.map((sleep) => (
        <AppBox variant="card" key={sleep.id} style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <SectionHeading>{sleep.label}</SectionHeading>
              <Text style={styles.formMeta}>
                {sleep.days.join("  ")} ·{" "}
                {durationBetweenTimes(sleep.bedtime, sleep.wakeTime) === null ? '' : formatDuration(durationBetweenTimes(sleep.bedtime, sleep.wakeTime))}
              </Text>
            </View>
            <AppSwitch
              label={`${sleep.label} enabled`}
              compact
              value={sleep.enabled}
              onValueChange={(enabled) => updateSleep(sleep.id, { enabled })}
            />
          </View>
          <View style={styles.timeRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BEDTIME</Text>
              <TimeField value={sleep.bedtime} label={`${sleep.label} bedtime`}
                onChange={value => updateSleep(sleep.id, { bedtime: value })} />
            </View>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={EditorialColors.muted}
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WAKE UP</Text>
              <TimeField value={sleep.wakeTime} label={`${sleep.label} wake time`}
                onChange={value => updateSleep(sleep.id, { wakeTime: value })} />
            </View>
          </View>
          {showErrors && (!TIME_24_HOUR_PATTERN.test(sleep.bedtime) ||
          !TIME_24_HOUR_PATTERN.test(sleep.wakeTime)) ? (
            <Text style={styles.errorText}>
              Use 24-hour time, for example 23:00.
            </Text>
          ) : null}
        </AppBox>
      ))}
      <View style={styles.sectionHeader}>
        <SectionHeading>Focus blocks</SectionHeading>
        <TextButton
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
          <ButtonLabel>+ Add block</ButtonLabel>
        </TextButton>
      </View>
      {focusBlocks.map((block) => {
        const error = showErrors ? blockError(block) : null;
        return (
          <AppBox variant="card"
            key={block.id}
            tone={error ? 'danger' : 'neutral'} style={styles.formCard}
          >
            <View style={styles.formHeader}>
              <TextInput
                value={block.label}
                onChangeText={(label) => updateBlock(block.id, { label })}
                style={styles.blockName}
                accessibilityLabel="Focus block name"
              />
              <AppSwitch
                label={`${block.label || 'Focus block'} enabled`}
                compact
                value={block.enabled}
                onValueChange={(enabled) => updateBlock(block.id, { enabled })}
              />
              <IconButton variant="destructive"
                accessibilityLabel={`Delete ${block.label}`}
                onPress={() =>
                  setFocusBlocks((current) =>
                    current.filter((item) => item.id !== block.id),
                  )
                }
              >
                <ButtonIcon
                  name="trash-outline"
                  size={19}
                />
              </IconButton>
            </View>
            <View style={styles.timeRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>START</Text>
                <TimeField value={block.start} label={`${block.label} start time`}
                  onChange={value => updateBlock(block.id, { start: value })} />
              </View>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={EditorialColors.muted}
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>END</Text>
                <TimeField value={block.end} label={`${block.label} end time`}
                  onChange={value => updateBlock(block.id, { end: value })} />
              </View>
            </View>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.validText}>
                {durationBetweenTimes(block.start, block.end) === null ? '' : `${formatDuration(durationBetweenTimes(block.start, block.end))} allocated to Focus`}
              </Text>
            )}
          </AppBox>
        );
      })}
    </ScrollView>
  );
}
