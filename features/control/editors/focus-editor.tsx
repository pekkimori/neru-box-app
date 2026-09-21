import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TextInput, View } from "react-native";

import { MotionTouchableOpacity as TouchableOpacity } from "@/components/motion";
import { useAppTheme, useThemedStyles } from "@/theme/app-theme";
import { clampMinutes } from "../model";
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

export function RestPromptContent({
  restMinutes,
  startRest,
  dismiss,
}: {
  restMinutes: number;
  startRest: () => void;
  dismiss: () => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const { colors: EditorialColors } = useAppTheme();

  return (
    <View style={styles.editorContent}>
      <View style={styles.focusHero}>
        <View style={styles.focusHeroIcon}>
          <Ionicons name="cafe" size={28} color={EditorialColors.red} />
        </View>
        <Text style={styles.focusHeroTitle}>Nice work. Take a breather?</Text>
        <Text style={styles.focusHeroCopy}>
          Step away for {restMinutes} {restMinutes === 1 ? "minute" : "minutes"}
          {" "}
          before beginning another focus session.
        </Text>
      </View>
      <TouchableOpacity onPress={startRest} style={styles.primaryButton}>
        <Ionicons
          name="timer-outline"
          size={17}
          color={EditorialColors.onAccent}
        />
        <Text style={styles.primaryButtonText}>
          Start {restMinutes} min rest
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={dismiss} style={styles.secondaryButton}>
        <Text style={styles.restDismissButtonText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}
