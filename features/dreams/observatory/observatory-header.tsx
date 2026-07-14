// features/dreams/observatory/observatory-header.tsx
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { NeruRobot } from '@/components/neru-robot';
import { createEditorialStyles } from '@/constants/editorial-theme';
import {
  pageHeaderActionRowStyle,
  pageHeaderIconControlStyle,
  pageHeaderLabelControlStyle,
} from '@/constants/page-header';
import { useThemedStyles } from '@/features/settings/app-theme';
import { Type } from '@/constants/typography';
import { Palette, useDreamsPalette } from '../tokens';
import { formatDate } from '../time-helpers';

interface Props {
  date: string;
  litCount: number;
  totalPlanned: number;
  coins: number;
  streakDays: number;
  onPlanPress?: () => void;
}

export function ObservatoryHeader({
  date, litCount, totalPlanned, coins, streakDays, onPlanPress,
}: Props) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useDreamsPalette();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <NeruRobot reactToButtons size={42} tabIndex={2} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>TASKS</Text>
            <Text style={styles.date}>{formatDate(date)}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onPlanPress ?? (() => router.push('/tasks/plan'))}
            accessibilityRole="button"
            accessibilityLabel="Manage week plan"
          >
            <Ionicons name="calendar-outline" size={17} color={Palette.red} />
            <Text style={styles.actionText}>Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/tasks/galaxy')}
            accessibilityRole="button"
            accessibilityLabel="Open completed stars archive"
          >
            <Ionicons name="infinite" size={20} color={Palette.warmWhite} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.metric}>
          <View style={styles.metricValueRow}>
            <Ionicons name="star-outline" size={16} color={Palette.red} />
            <Text style={styles.metricValue}>{litCount}/{totalPlanned}</Text>
          </View>
          <Text style={styles.metricLabel}>Stars lit</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <View style={styles.metricValueRow}>
            <View style={styles.coinMark}><Text style={styles.coinMarkText}>N</Text></View>
            <Text style={styles.metricValue}>{coins}</Text>
          </View>
          <Text style={styles.metricLabel}>Coins</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <View style={styles.metricValueRow}>
            <Ionicons name="flame-outline" size={16} color={Palette.red} />
            <Text style={styles.metricValue}>{streakDays}</Text>
          </View>
          <Text style={styles.metricLabel}>Day streak</Text>
        </View>
      </View>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  container: { gap: 12 },
  header: {
    minHeight: 72, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Palette.gray,
  },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleCol: { flex: 1 },
  title: { ...Type.pageTitle, color: Palette.warmWhite },
  date: { ...Type.bodySmall, color: Palette.warmDim, marginTop: 3 },
  actions: pageHeaderActionRowStyle,
  actionButton: pageHeaderLabelControlStyle(Palette),
  actionText: { ...Type.buttonSmall, color: Palette.red },
  iconButton: pageHeaderIconControlStyle(Palette),
  stats: {
    minHeight: 62, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    backgroundColor: Palette.graySoft,
  },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricValue: { ...Type.metricSmall, color: Palette.warmWhite },
  metricLabel: { ...Type.label, color: Palette.warmMuted },
  metricDivider: { width: 1, height: 34, backgroundColor: Palette.gray },
  coinMark: { width: 20, height: 20, borderRadius: 10, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' },
  coinMarkText: { ...Type.captionStrong, color: Palette.onRed },
}));
