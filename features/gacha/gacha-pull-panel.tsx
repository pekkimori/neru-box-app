import { AppBox } from '@/components/app-box';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/native-controls';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { RARITY_COLORS, RARITY_LABELS, RARITY_WEIGHTS, SINGLE_PULL_COST, TEN_PULL_COST } from './pokemon-catalog';

export function GachaPullPanel({ coins, catalogReady, isPulling, pullingCount, onPull, loading, error, onRetry }: {
  coins: number; catalogReady: boolean; isPulling: boolean;
  pullingCount: 1 | 10 | null; onPull: (count: 1 | 10) => unknown;
  loading: boolean; error: string | null; onRetry: () => unknown;
}) {
  const styles = useThemedStyles(themedStyles);
  return <AppBox variant="card" padding="lg" style={styles.panel}>
    <View style={styles.odds}>
      {(Object.keys(RARITY_WEIGHTS) as (keyof typeof RARITY_WEIGHTS)[]).map(rarity =>
        <View key={rarity} style={styles.oddsItem}>
          <View style={[styles.dot, { backgroundColor: RARITY_COLORS[rarity] }]} />
          <Text style={styles.copy}>{RARITY_LABELS[rarity]} {RARITY_WEIGHTS[rarity]}%</Text>
        </View>)}
    </View>
    <AppButton label={`Pull ×1 · ${SINGLE_PULL_COST} N`} variant="secondary" loading={pullingCount === 1}
      disabled={isPulling || !catalogReady || coins < SINGLE_PULL_COST} onPress={() => onPull(1)} />
    <AppButton label={`Pull ×10 · ${TEN_PULL_COST} N · Save 20`} loading={pullingCount === 10}
      disabled={isPulling || !catalogReady || coins < TEN_PULL_COST} onPress={() => onPull(10)} />
    {loading && <Text style={styles.copy}>Loading Generations I–V from PokéAPI…</Text>}
    {!!error && <AppButton label="Catalog unavailable · Retry" variant="secondary" onPress={() => onRetry()} />}
    {coins < SINGLE_PULL_COST && <Text style={styles.copy}>Complete Tasks to earn more research coins.</Text>}
  </AppBox>;
}

const Palette = createEditorialPalette();
const themedStyles = createEditorialStyles(() => ({
  panel: { marginTop: 20, gap: 12 },
  odds: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  oddsItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  copy: { ...Type.caption, color: Palette.secondary },
}));
