import { SectionHeading } from '@/components/section-heading';
import { boxStyle } from '@/theme/boxes';
import { AppBox } from '@/components/app-box';
import { FlatList } from '@/components/feedback-scroll-view';
import { ButtonIcon, ButtonLabel, IconButton, InteractiveSurface, TextButton } from '@/components/app-controls';
import { AppLayout, LayoutStyles, Space } from '@/theme/layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import {
  GENERATION_NAMES,
  GENERATION_ROMAN,
  GachaCreature,
  POKEMON_GENERATIONS_1_TO_5_TOTAL,
  RARITY_COLORS,
  Rarity,
  getPokemonRarityLabel,
} from '@/features/gacha/pokemon-catalog';
import {
  createEditorialPalette,
  createEditorialStyles,
  editorialOverlay,
} from '@/theme/editorial-theme';
import { PokemonDetails } from './pokemon-details';
import { PokemonArtwork } from './pokemon-artwork';
import { AppPicker } from '@/components/native-controls';
import { playPokemonCryOnWeb } from '@/features/gacha/pokemon-media';
import { usePokemonCollection } from './use-pokemon-collection';
import { usePokeApiCatalog } from '@/features/gacha/use-pokeapi-catalog';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { AppSheet } from '@/components/app-sheet';

const Palette = createEditorialPalette(() => ({
  overlay: editorialOverlay(0.56),
}));

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

type PokedexScreenProps = {
  presentation?: 'screen' | 'drawer';
  onDismiss?: () => void;
};

export function PokedexScreen({ presentation = 'screen', onDismiss }: PokedexScreenProps) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const router = useRouter();
  const isDrawer = presentation === 'drawer';
  const dismiss = onDismiss ?? (() => router.back());
  const { width } = useWindowDimensions();
  const { catalog, loading, error, refresh } = usePokeApiCatalog();
  const [filter, setFilter] = useState<Filter>('all');
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GachaCreature | null>(null);

  const { gachaResults, getOwnedCount, discovered } = usePokemonCollection(catalog);
  const totalCopies = gachaResults.length;
  const completion = Math.round((discovered / POKEMON_GENERATIONS_1_TO_5_TOTAL) * 100);
  const selectedOwned = selected ? getOwnedCount(selected) : 0;
  const columnCount = width>= 700 ? 6 : width>= 500 ? 5 : 4;
  const gridWidth = Math.min(width, AppLayout.contentMaxWidth) - AppLayout.contentPadding * 2;
  const cardWidth = (gridWidth - (columnCount - 1) * Space.sm) / columnCount;
  const gridArtworkSize = Math.min(88, Math.max(48, cardWidth - 14));

  const openPokemonDetail = (pokemon: GachaCreature) => {
    if (Platform.OS === 'web') {
      const result = gachaResults.find((item) => item.id === pokemon.id || item.name === pokemon.name);
      playPokemonCryOnWeb(result?.cry, pokemon.id);
    }
    setSelected(pokemon);
  };

  const visiblePokemon = catalog.filter((pokemon) => {
    const owned = getOwnedCount(pokemon)> 0;
    const matchesFilter = filter === 'all' || (filter === 'owned' ? owned : pokemon.rarity === filter);
    const matchesGeneration = generationFilter === 'all' || pokemon.generation === generationFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || pokemon.name.toLowerCase().includes(normalizedQuery) || String(pokemon.id).includes(normalizedQuery);
    return matchesFilter && matchesGeneration && matchesQuery;
  });

  const listHeader = (
    <>
      {!isDrawer ? (
        <View style={styles.header}>
          <IconButton accessibilityRole="button" accessibilityLabel="Back to Gacha" hitSlop={8} onPress={dismiss}>
            <ButtonIcon name="arrow-back" size={20} />
          </IconButton>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Pokédex</Text>
          </View>
          <View style={styles.headerIndex}>
            <Text style={styles.headerIndexValue}>{discovered}</Text>
            <Text style={styles.headerIndexLabel}>FOUND</Text>
          </View>
        </View>
      ) : null}

        <AppBox variant="inset" padding="lg" style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <SectionHeading>Collection progress</SectionHeading>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>{String(discovered).padStart(2, '0')}</Text>
              <Text style={styles.summaryTotal}>/ {POKEMON_GENERATIONS_1_TO_5_TOTAL}</Text>
            </View>
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
        </AppBox>

        <View style={styles.toolsHeader}>
          <Text style={styles.sectionLabel}>SPECIES INDEX</Text>
          <Text style={styles.resultCount}>{visiblePokemon.length} results</Text>
        </View>

        <AppBox variant="field" padding="field" style={styles.searchBox}>
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
          {query ? <IconButton accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><ButtonIcon name="close-circle" size={18} /></IconButton> : null}
        </AppBox>

        <AppPicker label="Generation" value={generationFilter} onChange={setGenerationFilter}
          options={GENERATION_FILTERS.map(value => ({ value, label: value === 'all' ? 'All generations' : `Gen ${GENERATION_ROMAN[value]} · ${GENERATION_NAMES[value]}` }))} />
        <AppPicker label="Collection" value={filter} onChange={setFilter}
          options={FILTERS.map(({ id, label }) => ({ value: id, label }))} />
    </>
  );

  const content = (
    <>
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
          const owned = count> 0;
          return (
            <InteractiveSurface accessibilityRole="button" accessibilityLabel={owned ? `${pokemon.name}, owned ${count}` : `Undiscovered Pokémon number ${pokemon.id}`} onPress={() => openPokemonDetail(pokemon)} style={({ pressed }) => [styles.card, { width: cardWidth }, owned && styles.cardOwned, pressed && styles.pressed]}>
              <View style={styles.cardTopline}>
                <Text style={styles.cardNumber}>#{String(pokemon.id).padStart(3, '0')}</Text>
                {owned ? <View style={[styles.rarityMark, { backgroundColor: RARITY_COLORS[pokemon.rarity] }]} /> : <Ionicons name="lock-closed" size={9} color={Palette.muted} />}
              </View>
              <View style={styles.imageStage}>
                <PokemonArtwork pokemon={pokemon} hidden={!owned} size={gridArtworkSize} />
              </View>
              <Text style={[styles.cardName, !owned && styles.cardNameLocked]} numberOfLines={1}>{owned ? pokemon.name : 'Undiscovered'}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>{owned ? getPokemonRarityLabel(pokemon) : `GEN ${GENERATION_ROMAN[pokemon.generation]}`}</Text>
                {owned ? <Text style={styles.copyCount}>×{count}</Text> : null}
              </View>
            </InteractiveSurface>
          );
        }}
        ListEmptyComponent={
          <AppBox variant="empty" style={styles.empty}>
            {loading ? <ActivityIndicator color={Palette.red} /> : <Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={24} color={Palette.muted} />}
            {isDrawer ? <SectionHeading>{loading ? 'Loading 649 species' : error ? 'PokéAPI catalog unavailable' : 'No matching species'}</SectionHeading> : <Text style={styles.emptyTitle}>{loading ? 'Loading 649 species' : error ? 'PokéAPI catalog unavailable' : 'No matching species'}</Text>}
            <Text style={styles.emptyCopy}>{loading ? 'Syncing Generations I–V and preparing the local cache.' : error ? error : 'Try another search, generation, or collection filter.'}</Text>
            {error ? <TextButton accessibilityRole="button" onPress={refresh}><ButtonIcon name="refresh" size={14} /><ButtonLabel>Retry PokéAPI</ButtonLabel></TextButton> : null}
          </AppBox>
        }
        ListFooterComponent={<View style={styles.bottomSpace} />}
      />

      <PokemonDetails pokemon={selected} ownedCount={selectedOwned} onDismiss={() => setSelected(null)} />
    </>
  );

  if (isDrawer) {
    return <AppSheet visible onDismiss={dismiss} title="Pokédex">{content}</AppSheet>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.background },
  content: { ...LayoutStyles.frame, paddingTop: Space.lg },
  pressed: { opacity: 0.7 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Palette.line },
  headerCopy: { flex: 1, marginLeft: 12 },
  title: { marginTop: 3, fontSize: 23, fontWeight: '900', color: Palette.ink },
  headerIndex: { alignItems: 'flex-end' },
  headerIndexValue: { fontSize: 19, fontWeight: '900', color: Palette.ink },
  headerIndexLabel: { marginTop: 1, fontSize: 7, fontWeight: '800', letterSpacing: 1, color: Palette.muted },
  summaryCard: { marginTop: 20, position: 'relative', overflow: 'hidden' },
  summaryMain: { paddingRight: 120 },
  summaryValueRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline' },
  summaryValue: { fontSize: 40, lineHeight: 42, fontWeight: '900', color: Palette.onInverse, fontVariant: ['tabular-nums'] },
  summaryTotal: { marginLeft: 6, fontSize: 14, fontWeight: '800', color: Palette.secondary },
  summaryMetrics: { position: 'absolute', right: 18, top: 20, bottom: 22, width: 92, justifyContent: 'center', gap: 10, borderLeftWidth: 1, borderLeftColor: Palette.line, paddingLeft: 15 },
  summaryMetric: {},
  metricValue: { fontSize: 16, fontWeight: '900', color: Palette.onInverse },
  metricLabel: { marginTop: 2, fontSize: 7, fontWeight: '800', letterSpacing: 0.8, color: Palette.muted },
  metricRule: { height: 1, backgroundColor: Palette.line },
  progressTrack: { height: 4, marginTop: 16, backgroundColor: Palette.line, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: Palette.red, borderRadius: 2 },
  toolsHeader: { marginTop: Space.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.45, color: Palette.muted },
  resultCount: { fontSize: 11, fontWeight: '700', color: Palette.secondary },
  searchBox: { height: 46, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, height: '100%', fontSize: 13, fontWeight: '600', color: Palette.ink },
  gridRow: { gap: Space.sm, marginBottom: Space.sm },
  card: { ...boxStyle(Palette, { variant: 'card', padding: 'sm' }) },
  cardOwned: { backgroundColor: Palette.card },
  cardTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardNumber: { fontSize: 7, fontWeight: '800', letterSpacing: 0.55, color: Palette.muted },
  rarityMark: { width: 14, height: 2, borderRadius: 1 },
  imageStage: { height: 70, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 9, fontWeight: '900', color: Palette.ink },
  cardNameLocked: { color: Palette.muted },
  cardFooter: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { fontSize: 6, fontWeight: '800', letterSpacing: 0.35, color: Palette.muted },
  copyCount: { fontSize: 8, fontWeight: '900', color: Palette.secondary },
  empty: { minHeight: 210, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 9, fontSize: 14, fontWeight: '900', color: Palette.ink },
  emptyCopy: { marginTop: 4, maxWidth: 280, fontSize: 11, lineHeight: 16, color: Palette.secondary, textAlign: 'center' },
  bottomSpace: { height: Space.xl }
}));
