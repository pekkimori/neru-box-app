import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, View } from "react-native";

import { AppButton, AppSegments } from "@/components/native-controls";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { controlStyles } from "../styles";

export function FocusEditorContent({
  focusDuration,
  setFocusDuration,
  startFocus,
}: {
  focusDuration: string;
  setFocusDuration: (value: string) => void;
  startFocus: (duration: number) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <View style={styles.editorContent}>
      <SectionHeading>Focus timer</SectionHeading>
      <View style={styles.focusHero}>
        <AppBox variant="icon" padding="none" tone="accent" style={styles.focusHeroIcon}>
          <Ionicons name="locate" size={28} color={EditorialColors.red} />
        </AppBox>
        <Text style={styles.focusHeroCopy}>
          The timer runs while this screen remains open.
        </Text>
      </View>
      <AppSegments options={[{ value: '25', label: '25 min' }, { value: '45', label: '45 min' }, { value: '60', label: '60 min' }]} value={focusDuration} onChange={setFocusDuration} />
      <View style={styles.customDurationRow}>
        <SectionHeading>Custom duration</SectionHeading>
        <AppBox variant="field" padding="field" style={styles.customLimit}>
          <TextInput
            value={focusDuration}
            onChangeText={setFocusDuration}
            keyboardType="number-pad"
            style={styles.limitInput}
            accessibilityLabel="Custom focus duration in minutes"
          />
          <Text style={styles.unit}>min</Text>
        </AppBox>
      </View>
      <AppButton label="Start focus" onPress={() => startFocus(Number(focusDuration))} />
    </View>
  );
}

export function RestPromptContent({
  restMinutes,
  startRest,
}: {
  restMinutes: number;
  startRest: () => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <View style={styles.editorContent}>
      <SectionHeading>Break timer</SectionHeading>
      <View style={styles.focusHero}>
        <AppBox variant="icon" padding="none" tone="accent" style={styles.focusHeroIcon}>
          <Ionicons name="cafe" size={28} color={EditorialColors.red} />
        </AppBox>
      </View>
      <AppButton label={`Start ${restMinutes} min rest`} onPress={startRest} />
    </View>
  );
}
