import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useAppTheme } from '@/theme/app-theme';
import { Type } from '@/theme/typography';

/** A quiet label for a group of content. */
export function SectionHeading({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useAppTheme();
  return <Text accessibilityRole="header" style={[Type.label, { color: colors.textMuted }, style]}>{children}</Text>;
}
