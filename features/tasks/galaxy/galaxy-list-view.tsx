// features/tasks/galaxy/galaxy-list-view.tsx
// Accessible searchable SectionList grouped by constellation + ISO week
// descending. Includes typed search filtering by label, nebula, or week.
// Same data source as GalaxyCanvas — no duplicated loading logic.

import { useMemo, useCallback, useState } from 'react';
import {
  SectionList,
  Text,
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Sp, R } from '../tokens';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { compareByCompletion } from './galaxy-edges';
import { GalaxyPalette } from './galaxy-theme';

interface Props { stars: GalaxyStar[]; }

interface Section {
  title: string;
  key: string;
  data: GalaxyStar[];
}

export function GalaxyListView({ stars }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo((): GalaxyStar[] => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return stars;
    return stars.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.constellationName.toLowerCase().includes(q) ||
        formatCompletionDate(s.completionDate).toLowerCase().includes(q) ||
        s.weekLabel.toLowerCase().includes(q) ||
        s.isoWeek.toLowerCase().includes(q),
    );
  }, [stars, query]);

  const sections = useMemo((): Section[] => {
    const groups = new Map<string, GalaxyStar[]>();
    for (const s of filtered) {
      const key = `${s.constellationId}:${s.isoWeek}`;
      const g = groups.get(key) ?? [];
      g.push(s);
      groups.set(key, g);
    }
    return [...groups.entries()]
      .sort((a, b) => (
        b[1][0].isoWeek.localeCompare(a[1][0].isoWeek)
        || a[1][0].constellationName.localeCompare(b[1][0].constellationName)
      ))
      .map(([key, data]) => {
        const first = data[0];
        const sorted = [...data].sort(
          (a, b) => b.completionDate.localeCompare(a.completionDate)
            || compareByCompletion(b, a),
        );
        return {
          key,
          title: `${first.constellationName}  ·  ${first.weekLabel}`,
          data: sorted,
        };
      });
  }, [filtered]);

  const renderItem = useCallback(
    ({ item }: { item: GalaxyStar }) => (
      <View
        style={styles.row}
        accessibilityLabel={`${item.label}, ${item.constellationName}, completed ${formatCompletionDate(item.completionDate)}, ${item.coinsEarned} coins earned`}
      >
        <View style={styles.rowIcon}>
          <View style={[styles.starHalo, { backgroundColor: `${item.domainColor}26` }]}>
            <View style={[styles.starDot, { backgroundColor: item.domainColor }]} />
          </View>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.starLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.starMeta}>
            {formatCompletionDate(item.completionDate)}
          </Text>
        </View>
        <Text style={styles.coins}>{item.coinsEarned}</Text>
      </View>
    ),
    [],
  );

  const renderHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>
          {section.data.length} star{section.data.length !== 1 ? 's' : ''}
        </Text>
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: GalaxyStar) => `${item.starId}-${item.completionDate}`,
    [],
  );

  const listEmpty = useMemo(
    () =>
      query.trim().length > 0 ? (
        <Text style={styles.emptyText}>No stars match &ldquo;{query}&rdquo;</Text>
      ) : null,
    [query],
  );

  if (stars.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by task, domain, or date…"
          placeholderTextColor={GalaxyPalette.textMuted}
          accessibilityLabel="Search stars"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={listEmpty}
        accessibilityLabel={`Star list: ${filtered.length} of ${stars.length} stars`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GalaxyPalette.bg },
  searchBar: {
    paddingHorizontal: Sp.lg,
    paddingTop: Sp.sm,
    paddingBottom: Sp.xs,
  },
  searchInput: {
    backgroundColor: GalaxyPalette.surface,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
    borderRadius: R.sm,
    paddingHorizontal: Sp.sm,
    paddingVertical: 10,
    color: GalaxyPalette.text,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 44,
  },
  list: { paddingHorizontal: Sp.lg, paddingBottom: 120 },
  emptyText: {
    color: GalaxyPalette.textDim,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Sp.lg,
    paddingBottom: Sp.sm,
  },
  sectionTitle: {
    color: GalaxyPalette.text,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  sectionCount: {
    color: GalaxyPalette.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Sp.sm,
    borderRadius: R.sm,
    backgroundColor: GalaxyPalette.surface,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
    marginBottom: Sp.xs,
    minHeight: 52,
  },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sp.sm,
  },
  starHalo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowContent: { flex: 1 },
  starLabel: {
    color: GalaxyPalette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  starMeta: {
    color: GalaxyPalette.textDim,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  coins: {
    color: GalaxyPalette.textDim,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: Sp.sm,
  },
});
