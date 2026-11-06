import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { MotionPressable } from '@/components/motion';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { accountStyles } from './styles';

export function AccountButton({ label, onPress, disabled, secondary, loading }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; loading?: boolean;
}) {
  const styles = useThemedStyles(accountStyles);
  const { colors } = useAppTheme();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, (disabled || loading) && styles.disabled]}
    >
      {loading && <ActivityIndicator size="small" color={secondary ? colors.text : colors.onAccent} />}
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </MotionPressable>
  );
}

export function AccountFeedback({ message, error = false }: { message: string | null; error?: boolean }) {
  const styles = useThemedStyles(accountStyles);
  const { colors } = useAppTheme();
  if (!message) return null;
  return (
    <View accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={styles.feedback}>
      <Ionicons name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={17} color={error ? colors.accentStrong : colors.textSecondary} />
      <Text style={[styles.feedbackText, error && styles.error]}>{message}</Text>
    </View>
  );
}
