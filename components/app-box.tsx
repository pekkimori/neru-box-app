import { forwardRef } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import { useAppTheme } from '@/theme/app-theme';
import { boxStyle, type BoxOptions } from '@/theme/boxes';

export type AppBoxProps = ViewProps & BoxOptions;

/** A passive container: never adds a touch target, role, or accessibility grouping. */
export const AppBox = forwardRef<ViewInstance, AppBoxProps>(function AppBox({
  variant = 'card', tone, padding, clip, style, ...props
}, ref) {
  const { colors } = useAppTheme();
  return <View {...props} ref={ref} style={[boxStyle(colors, { variant, tone, padding, clip }), style]} />;
});
