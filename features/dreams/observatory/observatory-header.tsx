// features/dreams/observatory/observatory-header.tsx
import { Text, View, TouchableOpacity, StyleSheet, type DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette, Sp, R } from '../tokens';
import { formatDate } from '../time-helpers';

interface Props {
  date: string;
  litCount: number;
  totalPlanned: number;
  coins: number;
  starsCount: number;
  onAddStar: () => void;
}

export function ObservatoryHeader({
  date, litCount, totalPlanned, coins, starsCount, onAddStar,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.mainRow}>
        <View style={styles.titleCol}>
          <Text style={styles.kicker}>DREAMS / OBSERVATORY</Text>
          <Text style={styles.date}>{formatDate(date)}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddStar}
          accessibilityRole="button"
          accessibilityLabel="Add task star"
        >
          <Ionicons name="add" size={16} color={Palette.warmWhite} />
          <Text style={styles.addButtonText}>Add Star</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.progressRow}>
          <Ionicons name="star" size={14} color={Palette.warmDim} />
          <Text style={styles.statText}>
            {litCount}/{totalPlanned} lit
          </Text>
          {totalPlanned > 0 && (
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round((litCount / Math.max(totalPlanned, 1)) * 100)}%` as DimensionValue },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.coinRow}>
          <Ionicons name="ellipse" size={10} color={Palette.warmDim} />
          <Text style={styles.statText}>{coins}</Text>
        </View>

        <Text style={styles.starCountText}>{starsCount} stars</Text>

        <TouchableOpacity
          style={styles.planButton}
          onPress={() => router.push('/dreams/plan')}
          accessibilityRole="button"
          accessibilityLabel="Manage week plan"
        >
          <Text style={styles.planButtonText}>Manage Week</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Sp.sm },
  mainRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Sp.sm,
  },
  titleCol: { gap: Sp.xs, flex: 1 },
  kicker: {
    color: Palette.warmDim, fontSize: 12, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.02,
  },
  date: { color: Palette.warmWhite, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.xs,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md,
    backgroundColor: Palette.red, borderWidth: 1, borderColor: Palette.red,
  },
  addButtonText: { color: Palette.warmWhite, fontSize: 13, fontWeight: '800' },
  stats: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm, flexWrap: 'wrap',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.xs },
  statText: { color: Palette.warmDim, fontSize: 13, fontWeight: '800' },
  barBg: {
    width: 56, height: 4, backgroundColor: Palette.graySoft,
    borderRadius: 2, overflow: 'hidden',
  },
  barFill: { height: 4, backgroundColor: Palette.red, borderRadius: 2 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starCountText: { color: Palette.warmDim, fontSize: 13, fontWeight: '800' },
  planButton: {
    marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray,
  },
  planButtonText: { color: Palette.warmDim, fontSize: 13, fontWeight: '800' },
});
