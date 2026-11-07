import { AppBox } from '@/components/app-box';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { accountStyles } from './styles';

export function AccountFeedback({ message, error = false }: { message: string | null; error?: boolean }) {
  const styles = useThemedStyles(accountStyles);
  const { colors } = useAppTheme();
  if (!message) return null;
  return (
    <AppBox variant="notice" tone={error ? 'danger' : 'neutral'} accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={styles.feedback}>
      <Ionicons name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={17} color={error ? colors.accentStrong : colors.textSecondary} />
      <Text style={[styles.feedbackText, error && styles.error]}>{message}</Text>
    </AppBox>
  );
}
