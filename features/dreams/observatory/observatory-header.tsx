// features/dreams/observatory/observatory-header.tsx
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Type } from '@/constants/typography';
import { Palette } from '../tokens';
import { formatDate } from '../time-helpers';

interface Props {
  date: string;
  litCount: number;
  totalPlanned: number;
  coins: number;
  streakDays: number;
}

export function ObservatoryHeader({
  date, litCount, totalPlanned, coins, streakDays,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>DREAMS</Text>
          <Text style={styles.date}>{formatDate(date)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/dreams/plan')}
            accessibilityRole="button"
            accessibilityLabel="Manage week plan"
          >
            <Ionicons name="calendar-outline" size={17} color={Palette.red} />
            <Text style={styles.actionText}>Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/dreams/galaxy')}
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

const styles = StyleSheet.create({
  container: { gap: 12 },
  header: {
    minHeight: 72, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Palette.gray,
  },
  titleCol: { flex: 1 },
  title: { ...Type.pageTitle, color: Palette.warmWhite },
  date: { ...Type.bodySmall, color: Palette.warmDim, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: {
    height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 13, backgroundColor: Palette.redSoft, borderWidth: 1, borderColor: '#F4C8CC',
  },
  actionText: { ...Type.buttonSmall, color: Palette.red },
  iconButton: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Palette.bgElevated, borderWidth: 1, borderColor: Palette.gray,
  },
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
});
