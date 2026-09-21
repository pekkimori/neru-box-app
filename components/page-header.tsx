import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { NeruRobot, type NeruRobotState } from '@/components/neru-robot';
import { useCoins } from '@/hooks/useCoins';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { playTapFeedback } from '@/utils/interaction-feedback';

const Palette = createEditorialPalette();

export type PageHeaderAction = {
  accessibilityLabel: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
};

type PageHeaderProps = {
  title: string;
  tabIndex: number;
  actions?: readonly PageHeaderAction[];
  robotState?: NeruRobotState;
  typingPulse?: number;
  style?: StyleProp<ViewStyle>;
};

export function PageHeader({
  title,
  tabIndex,
  actions = [],
  robotState = 'idle',
  typingPulse,
  style,
}: PageHeaderProps) {
  const styles = useThemedStyles(themedStyles);
  const { colors } = useAppTheme();
  const { coins } = useCoins();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.identity}>
        <NeruRobot
          reactToButtons
          size={42}
          state={robotState}
          tabIndex={tabIndex}
          typingPulse={typingPulse}
        />
        <Text numberOfLines={1} style={styles.title}>
          {title.toUpperCase()}
        </Text>
      </View>

      <View style={styles.controls}>
        <View
          accessibilityLabel={`${coins} coins`}
          accessibilityRole="text"
          style={styles.coinPill}
        >
          <View style={styles.coinMark}>
            <Text style={styles.coinMarkText}>N</Text>
          </View>
          <Text numberOfLines={1} style={styles.coinValue}>
            {coins}
          </Text>
        </View>

        {actions.map((action) => (
          <Pressable
            key={action.accessibilityLabel}
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.disabled }}
            disabled={action.disabled}
            hitSlop={4}
            onPress={action.onPress}
            onPressIn={() => playTapFeedback()}
            style={({ pressed }) => [
              styles.actionButton,
              action.active && styles.actionButtonActive,
              action.disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={action.active ? colors.onAccent : colors.text}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  header: {
    zIndex: 10,
    width: '100%',
    // NERU's tab-change jump rises roughly 14px above its resting position.
    // Keep enough room inside the sticky header so the safe-area boundary does
    // not cut off the top of the mascot.
    height: 72,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    backgroundColor: Palette.background,
  },
  identity: {
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'visible',
  },
  title: {
    ...Type.pageTitle,
    flexShrink: 1,
    color: Palette.text,
  },
  controls: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 6,
  },
  coinPill: {
    minWidth: 50,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    backgroundColor: Palette.card,
  },
  coinMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.accent,
  },
  coinMarkText: { ...Type.captionStrong, color: Palette.onAccent },
  coinValue: {
    ...Type.metricSmall,
    maxWidth: 48,
    color: Palette.text,
    fontVariant: ['tabular-nums'],
  },
  actionButton: {
    width: 40,
    height: 40,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 8,
    backgroundColor: Palette.card,
  },
  actionButtonActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accent,
  },
  disabled: { opacity: 0.36 },
  pressed: { opacity: 0.62 },
}));
