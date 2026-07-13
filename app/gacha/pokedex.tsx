import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GACHA_BANNERS,
  GENERATION_NAMES,
  GENERATION_ROMAN,
  GachaCreature,
  POKEMON_GENERATIONS_1_TO_5_TOTAL,
  RARITY_COLORS,
  Rarity,
  getPokemonRarityLabel,
} from '@/constants/gacha';
import { EditorialColors, editorialOverlay } from '@/constants/editorial-theme';
import { PokemonPresentation } from '@/features/gacha/PokemonPresentation';
import { playPokemonCryOnWeb } from '@/features/gacha/pokemon-media';
import { useGachaCollection } from '@/features/gacha/use-gacha-collection';
import { usePokeApiCatalog } from '@/features/gacha/use-pokeapi-catalog';

const Palette = {
  ...EditorialColors,
  overlay: editorialOverlay(0.56),
};

type Filter = 'all' | 'owned' | Rarity;
type GenerationFilter = 'all' | 1 | 2 | 3 | 4 | 5;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'owned', label: 'Collected' },
  { id: 'common', label: 'Common' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'legendary', label: 'Legendary+' },
];

const GENERATION_FILTERS: GenerationFilter[] = ['all', 1, 2, 3, 4, 5];

function PokemonImage({ pokemon, owned, size }: { pokemon: GachaCreature; owned: boolean; size: number }) {
  return (
    <Image
      source={{ uri: pokemon.image }}
      style={{ width: size, height: size }}
      contentFit="contain"
      tintColor={owned ? undefined : '#A7A7A4'}
      transition={150}
    />
  );
}

export default function PokedexScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { gachaResults } = useGachaCollection();
  const { catalog, loading, error, refresh } = usePokeApiCatalog();
  const [filter, setFilter] = useState<Filter>('all');
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GachaCreature | null>(null);

  const ownedCounts = useMemo(() => gachaResults.reduce<Record<string, number>>((counts, result) => {
    const key = result.id ? String(result.id) : result.name;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {}), [gachaResults]);

  const getOwnedCount = (pokemon: GachaCreature) => ownedCounts[String(pokemon.id)] ?? ownedCounts[pokemon.name] ?? 0;
  const discovered = catalog.filter((pokemon) => getOwnedCount(pokemon) > 0).length;
  const totalCopies = gachaResults.length;
  const completion = Math.round((discovered / POKEMON_GENERATIONS_1_TO_5_TOTAL) * 100);
  const selectedOwned = selected ? getOwnedCount(selected) : 0;
  const columnCount = width >= 700 ? 6 : width >= 500 ? 5 : 4;
  const gridWidth = Math.min(width, 760) - 40;
  const cardWidth = (gridWidth - (columnCount - 1) * 6) / columnCount;
  const gridArtworkSize = Math.min(88, Math.max(48, cardWidth - 14));

  const openPokemonDetail = (pokemon: GachaCreature) => {
    if (Platform.OS === 'web') {
      const result = gachaResults.find((item) => item.id === pokemon.id || item.name === pokemon.name);
      playPokemonCryOnWeb(result?.cry, pokemon.id);
    }
    setSelected(pokemon);
  };

  const visiblePokemon = catalog.filter((pokemon) => {
    const owned = getOwnedCount(pokemon) > 0;
    const matchesFilter = filter === 'all' || (filter === 'owned' ? owned : pokemon.rarity === filter);
    const matchesGeneration = generationFilter === 'all' || pokemon.generation === generationFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || pokemon.name.toLowerCase().includes(normalizedQuery) || String(pokemon.id).includes(normalizedQuery);
    return matchesFilter && matchesGeneration && matchesQuery;
  });

  const listHeader = (
    <>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Gacha" hitSlop={8} onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={20} color={Palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>NERU FIELD ARCHIVE</Text>
            <Text style={styles.title}>Pokédex</Text>
          </View>
          <View style={styles.headerIndex}>
            <Text style={styles.headerIndexValue}>{discovered}</Text>
            <Text style={styles.headerIndexLabel}>FOUND</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryEyebrow}>COLLECTION PROGRESS</Text>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>{String(discovered).padStart(2, '0')}</Text>
              <Text style={styles.summaryTotal}>/ {POKEMON_GENERATIONS_1_TO_5_TOTAL}</Text>
            </View>
            <Text style={styles.summaryCopy}>{discovered === POKEMON_GENERATIONS_1_TO_5_TOTAL ? 'Archive complete. Every species has field data.' : `${POKEMON_GENERATIONS_1_TO_5_TOTAL - discovered} species still awaiting registration.`}</Text>
          </View>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={styles.metricValue}>{completion}%</Text>
              <Text style={styles.metricLabel}>COMPLETE</Text>
            </View>
            <View style={styles.metricRule} />
            <View style={styles.summaryMetric}>
              <Text style={styles.metricValue}>{totalCopies}</Text>
              <Text style={styles.metricLabel}>TOTAL PULLS</Text>
            </View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completion}%` }]} /></View>
        </View>

        <View style={styles.toolsHeader}>
          <Text style={styles.sectionLabel}>SPECIES INDEX</Text>
          <Text style={styles.resultCount}>{visiblePokemon.length} results</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={Palette.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or National Pokédex number"
            placeholderTextColor={Palette.muted}
            style={styles.searchInput}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={Palette.muted} /></Pressable> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.generationFilters} accessibilityRole="radiogroup">
          {GENERATION_FILTERS.map((generation) => {
            const active = generationFilter === generation;
            const label = generation === 'all' ? 'All generations' : `Gen ${GENERATION_ROMAN[generation]}`;
            return (
              <Pressable key={generation} accessibilityRole="radio" accessibilityLabel={generation === 'all' ? label : `${label}, ${GENERATION_NAMES[generation]}`} accessibilityState={{ selected: active }} onPress={() => setGenerationFilter(generation)} style={[styles.generationFilter, active && styles.generationFilterActive]}>
                <Text style={[styles.generationFilterText, active && styles.generationFilterTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="radiogroup">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setFilter(item.id)} style={[styles.filter, active && styles.filterActive]}>
                {item.id !== 'all' && item.id !== 'owned' ? <View style={[styles.filterDot, { backgroundColor: RARITY_COLORS[item.id] }]} /> : null}
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        key={`pokedex-${columnCount}`}
        data={visiblePokemon}
        keyExtractor={(pokemon) => String(pokemon.id)}
        numColumns={columnCount}
        ListHeaderComponent={listHeader}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={columnCount * 6}
        maxToRenderPerBatch={columnCount * 6}
        windowSize={7}
        renderItem={({ item: pokemon }) => {
          const count = getOwnedCount(pokemon);
          const owned = count > 0;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={owned ? `${pokemon.name}, owned ${count}` : `Undiscovered Pokémon number ${pokemon.id}`} onPress={() => openPokemonDetail(pokemon)} style={({ pressed }) => [styles.card, { width: cardWidth }, owned && styles.cardOwned, pressed && styles.pressed]}>
              <View style={styles.cardTopline}>
                <Text style={styles.cardNumber}>#{String(pokemon.id).padStart(3, '0')}</Text>
                {owned ? <View style={[styles.rarityMark, { backgroundColor: RARITY_COLORS[pokemon.rarity] }]} /> : <Ionicons name="lock-closed" size={9} color={Palette.muted} />}
              </View>
              <View style={styles.imageStage}>
                <PokemonImage pokemon={pokemon} owned={owned} size={gridArtworkSize} />
              </View>
              <Text style={[styles.cardName, !owned && styles.cardNameLocked]} numberOfLines={1}>{owned ? pokemon.name : 'Undiscovered'}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>{owned ? getPokemonRarityLabel(pokemon) : `GEN ${GENERATION_ROMAN[pokemon.generation]}`}</Text>
                {owned ? <Text style={styles.copyCount}>×{count}</Text> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator color={Palette.red} /> : <Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={24} color={Palette.muted} />}
            <Text style={styles.emptyTitle}>{loading ? 'Loading 649 species' : error ? 'PokéAPI catalog unavailable' : 'No matching species'}</Text>
            <Text style={styles.emptyCopy}>{loading ? 'Syncing Generations I–V and preparing the local cache.' : error ? error : 'Try another search, generation, or collection filter.'}</Text>
            {error ? <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}><Ionicons name="refresh" size={14} color={Palette.red} /><Text style={styles.retryText}>Retry PokéAPI</Text></Pressable> : null}
          </View>
        }
        ListFooterComponent={<View style={styles.bottomSpace} />}
      />

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} accessibilityLabel="Close Pokémon details" />
          {selected ? (
            <View style={styles.detailCard}>
              <View style={styles.detailTopline}>
                <View>
                  <Text style={styles.detailNumber}>NATIONAL INDEX / #{String(selected.id).padStart(3, '0')}</Text>
                  <Text style={styles.detailBanner}>{GACHA_BANNERS.find((banner) => banner.id === selected.bannerIds[0])?.title}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => setSelected(null)}><Ionicons name="close" size={22} color={Palette.secondary} /></Pressable>
              </View>
              <View style={styles.detailImage}>
                <View style={[styles.detailCircle, { backgroundColor: `${RARITY_COLORS[selected.rarity]}15` }]} />
                {selectedOwned > 0
                  ? <PokemonPresentation pokemon={selected} active={selected !== null} size={190} autoPlayCry={Platform.OS !== 'web'} />
                  : <PokemonImage pokemon={selected} owned={false} size={190} />}
                {selectedOwned === 0 ? <Ionicons name="lock-closed" size={26} color={Palette.muted} style={styles.detailLock} /> : null}
              </View>
              <Text style={styles.detailTitle}>{selectedOwned > 0 ? selected.name : 'Undiscovered'}</Text>
              <View style={styles.detailTags}>
                <View style={[styles.rarityTag, { borderColor: RARITY_COLORS[selected.rarity] }]}><Text style={[styles.rarityTagText, { color: RARITY_COLORS[selected.rarity] }]}>{getPokemonRarityLabel(selected)}</Text></View>
                {selectedOwned > 0 ? selected.types.map((type) => <View key={type} style={styles.typeTag}><Text style={styles.typeTagText}>{type}</Text></View>) : null}
              </View>
              <Text style={styles.detailCopy}>{selectedOwned > 0 ? selected.description : `Field data is encrypted until this species is encountered through the ${GACHA_BANNERS.find((banner) => banner.id === selected.bannerIds[0])?.title} banner.`}</Text>
              <View style={styles.detailStatRow}>
                <View><Text style={styles.detailStatLabel}>CAPTURE RATE</Text><Text style={styles.detailStatValue}>{selected.captureRate} / 255</Text></View>
                <View style={styles.detailStatRight}><Text style={styles.detailStatLabel}>COPIES REGISTERED</Text><Text style={styles.detailStatValue}>{selectedOwned}</Text></View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.white },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.7 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Palette.line },
  backButton: { width: 38, height: 38, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 12 },
  eyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 1.4, color: Palette.muted },
  title: { marginTop: 3, fontSize: 23, fontWeight: '900', color: Palette.ink },
  headerIndex: { alignItems: 'flex-end' },
  headerIndexValue: { fontSize: 19, fontWeight: '900', color: Palette.ink },
  headerIndexLabel: { marginTop: 1, fontSize: 7, fontWeight: '800', letterSpacing: 1, color: Palette.muted },
  summaryCard: { marginTop: 20, borderRadius: 10, backgroundColor: Palette.ink, padding: 18, position: 'relative', overflow: 'hidden' },
  summaryMain: { paddingRight: 120 },
  summaryEyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 1.4, color: '#999999' },
  summaryValueRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline' },
  summaryValue: { fontSize: 40, lineHeight: 42, fontWeight: '900', color: Palette.white, fontVariant: ['tabular-nums'] },
  summaryTotal: { marginLeft: 6, fontSize: 14, fontWeight: '800', color: '#8F8F8F' },
  summaryCopy: { marginTop: 7, fontSize: 11, lineHeight: 16, color: '#C7C7C7' },
  summaryMetrics: { position: 'absolute', right: 18, top: 20, bottom: 22, width: 92, justifyContent: 'center', gap: 10, borderLeftWidth: 1, borderLeftColor: '#3A3A3A', paddingLeft: 15 },
  summaryMetric: {},
  metricValue: { fontSize: 16, fontWeight: '900', color: Palette.white },
  metricLabel: { marginTop: 2, fontSize: 7, fontWeight: '800', letterSpacing: 0.8, color: '#898989' },
  metricRule: { height: 1, backgroundColor: '#3A3A3A' },
  progressTrack: { height: 4, marginTop: 16, backgroundColor: '#3A3A3A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Palette.red, borderRadius: 2 },
  toolsHeader: { marginTop: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.45, color: Palette.muted },
  resultCount: { fontSize: 11, fontWeight: '700', color: Palette.secondary },
  searchBox: { height: 46, marginTop: 12, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 13, fontWeight: '600', color: Palette.ink },
  generationFilters: { gap: 7, paddingTop: 12, paddingRight: 20 },
  generationFilter: { minHeight: 34, borderWidth: 1, borderColor: Palette.line, borderRadius: 7, paddingHorizontal: 12, justifyContent: 'center' },
  generationFilterActive: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  generationFilterText: { fontSize: 10, fontWeight: '800', color: Palette.secondary },
  generationFilterTextActive: { color: Palette.red },
  filters: { gap: 7, paddingVertical: 10, paddingRight: 20 },
  filter: { minHeight: 34, borderWidth: 1, borderColor: Palette.line, borderRadius: 7, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterActive: { borderColor: Palette.ink, backgroundColor: Palette.ink },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { fontSize: 10, fontWeight: '800', color: Palette.secondary },
  filterTextActive: { color: Palette.white },
  gridRow: { gap: 6, marginBottom: 6 },
  card: { borderWidth: 1, borderColor: Palette.line, borderRadius: 7, paddingTop: 7, paddingHorizontal: 7, paddingBottom: 4, backgroundColor: Palette.surface },
  cardOwned: { backgroundColor: Palette.white },
  cardTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardNumber: { fontSize: 7, fontWeight: '800', letterSpacing: 0.55, color: Palette.muted },
  rarityMark: { width: 14, height: 2, borderRadius: 1 },
  imageStage: { height: 70, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 9, fontWeight: '900', color: Palette.ink },
  cardNameLocked: { color: Palette.muted },
  cardFooter: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { fontSize: 6, fontWeight: '800', letterSpacing: 0.35, color: Palette.muted },
  copyCount: { fontSize: 8, fontWeight: '900', color: Palette.secondary },
  empty: { minHeight: 210, borderWidth: 1, borderColor: Palette.line, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 9, fontSize: 14, fontWeight: '900', color: Palette.ink },
  emptyCopy: { marginTop: 4, maxWidth: 280, fontSize: 11, lineHeight: 16, color: Palette.secondary, textAlign: 'center' },
  retryButton: { minHeight: 38, marginTop: 12, borderWidth: 1, borderColor: Palette.line, borderRadius: 7, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { fontSize: 11, fontWeight: '800', color: Palette.red },
  bottomSpace: { height: Platform.OS === 'ios' ? 34 : 24 },
  modalOverlay: { flex: 1, backgroundColor: Palette.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  detailCard: { width: '100%', maxWidth: 410, borderRadius: 12, backgroundColor: Palette.white, padding: 18 },
  detailTopline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  detailNumber: { fontSize: 8, fontWeight: '800', letterSpacing: 1.1, color: Palette.muted },
  detailBanner: { marginTop: 4, fontSize: 11, fontWeight: '800', color: Palette.secondary },
  detailImage: { height: 220, marginTop: 12, borderRadius: 9, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  detailCircle: { position: 'absolute', width: 190, height: 190, borderRadius: 95 },
  detailLock: { position: 'absolute' },
  detailTitle: { marginTop: 16, fontSize: 27, fontWeight: '900', color: Palette.ink },
  detailTags: { marginTop: 8, flexDirection: 'row', gap: 6 },
  rarityTag: { minHeight: 25, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, justifyContent: 'center' },
  rarityTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  typeTag: { minHeight: 25, borderRadius: 6, backgroundColor: Palette.surface, paddingHorizontal: 8, justifyContent: 'center' },
  typeTagText: { fontSize: 8, fontWeight: '800', color: Palette.secondary, textTransform: 'uppercase' },
  detailCopy: { marginTop: 13, fontSize: 13, lineHeight: 19, color: Palette.secondary },
  detailStatRow: { marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: Palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailStatLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, color: Palette.muted },
  detailStatValue: { fontSize: 16, fontWeight: '900', color: Palette.ink },
  detailStatRight: { alignItems: 'flex-end' },
});
