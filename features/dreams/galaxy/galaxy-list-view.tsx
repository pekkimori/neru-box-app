// features/dreams/galaxy/galaxy-list-view.tsx
// Accessible searchable SectionList grouped by constellation + ISO week
// descending. Includes typed search filtering by label, nebula, or week.
// Same data source as GalaxyCanvas — no duplicated loading logic.

import { useMemo, useCallback, useState } from 'react';
import {
  SectionList,
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Palette, Sp, R } from '../tokens';
import type { GalaxyStar } from './galaxy-geometry';

interface Props {
  stars: GalaxyStar[];
  onStarSelect: (star: GalaxyStar) => void;
}

interface Section {
  title: string;
  key: string;
  data: GalaxyStar[];
}

export function GalaxyListView({ stars, onStarSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo((): GalaxyStar[] => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return stars;
    return stars.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.constellationName.toLowerCase().includes(q) ||
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
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => {
        const first = data[0];
        const sorted = [...data].sort(
          (a, b) => b.completionDate.localeCompare(a.completionDate),
        );
        return {
          key,
          title: `${first.constellationIcon} ${first.constellationName}  ·  ${first.weekLabel}`,
          data: sorted,
        };
      });
  }, [filtered]);

  const renderItem = useCallback(
    ({ item }: { item: GalaxyStar }) => (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => onStarSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.label}, ${item.constellationName}, completed ${item.completionDate}, ${item.coinsEarned} coins earned`}
      >
        <View style={styles.rowIcon}>
          <View style={styles.starDot} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.starLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.starMeta}>
            {item.completionDate}
          </Text>
        </View>
        <Text style={styles.coins}>{item.coinsEarned}</Text>
      </Pressable>
    ),
    [onStarSelect],
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
          placeholder="Search by label, nebula, or week…"
          placeholderTextColor={Palette.warmMuted}
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
  container: { flex: 1 },
  searchBar: {
    paddingHorizontal: Sp.lg,
    paddingTop: Sp.sm,
    paddingBottom: Sp.xs,
  },
  searchInput: {
    backgroundColor: Palette.bgElevated,
    borderWidth: 1,
    borderColor: Palette.gray,
    borderRadius: R.sm,
    paddingHorizontal: Sp.sm,
    paddingVertical: 10,
    color: Palette.warmWhite,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 44,
  },
  list: { paddingHorizontal: Sp.lg, paddingBottom: 120 },
  emptyText: {
    color: Palette.warmDim,
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
    color: Palette.warmWhite,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  sectionCount: {
    color: Palette.warmDim,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Sp.sm,
    borderRadius: R.sm,
    backgroundColor: Palette.bgElevated,
    borderWidth: 1,
    borderColor: Palette.gray,
    marginBottom: Sp.xs,
    minHeight: 52,
  },
  rowPressed: {
    borderColor: Palette.red,
  },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Sp.sm,
  },
  starDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.warmWhite,
  },
  rowContent: { flex: 1 },
  starLabel: {
    color: Palette.warmWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  starMeta: {
    color: Palette.warmDim,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  coins: {
    color: Palette.warmDim,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: Sp.sm,
  },
});
