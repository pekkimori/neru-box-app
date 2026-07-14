import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MotionModal as Modal,
  MotionPressable as Pressable,
  MotionTouchableOpacity as TouchableOpacity,
} from '@/components/motion';
import { NeruRobot } from '@/components/neru-robot';
import {
  GACHA_BANNERS,
  GachaBanner,
  GachaCreature,
  POKEMON_GENERATIONS_1_TO_5_TOTAL,
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_WEIGHTS,
  SINGLE_PULL_COST,
  TEN_PULL_COST,
  getBannerPool,
  getPokemonRarityLabel,
} from '@/constants/gacha';
import {
  createEditorialPalette,
  createEditorialStyles,
  editorialOverlay,
} from '@/constants/editorial-theme';
import {
  pageHeaderActionRowStyle,
  pageHeaderIconControlStyle,
  pageHeaderLabelControlStyle,
} from '@/constants/page-header';
import { Type } from '@/constants/typography';
import { CatchAnimationModal } from '@/features/gacha/CatchAnimationModal';
import { PokemonPresentation } from '@/features/gacha/PokemonPresentation';
import { getFeaturedPokemon } from '@/features/gacha/gacha-pull';
import { playPokemonCryOnWeb } from '@/features/gacha/pokemon-media';
import { useGachaCollection } from '@/features/gacha/use-gacha-collection';
import { useGachaPull } from '@/features/gacha/use-gacha-pull';
import { usePokeApiCatalog } from '@/features/gacha/use-pokeapi-catalog';
import { useAppTheme, useThemedStyles } from '@/features/settings/app-theme';
import { useCoins } from '@/hooks/useCoins';
import { PokedexScreen } from '@/app/gacha/pokedex';

const Palette = createEditorialPalette(() => ({
  overlay: editorialOverlay(0.56),
}));

function PokemonImage({
  pokemon,
  size,
  muted = false,
}: {
  pokemon: GachaCreature;
  size: number;
  muted?: boolean;
}) {
  return (
    <Image
      source={{ uri: pokemon.image }}
      style={{ width: size, height: size, opacity: muted ? 0.13 : 1 }}
      contentFit="contain"
      transition={160}
      accessibilityLabel={muted ? undefined : pokemon.name}
    />
  );
}

function BannerArtwork({ banner, compact = false }: { banner: GachaBanner; compact?: boolean }) {
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={[styles.artworkStage, styles.noPointerEvents, compact && styles.artworkStageCompact]}>
      <View
        style={[
          styles.verticalField,
          compact && styles.verticalFieldCompact,
          { backgroundColor: banner.accent },
        ]}
      />
    </View>
  );
}

function BannerSelector({
  banner,
  selected,
  onPress,
}: {
  banner: GachaBanner;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${banner.title} banner`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bannerSelector,
        selected && styles.bannerSelectorSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.bannerSelectorCopy}>
        <Text style={[styles.bannerCode, selected && styles.bannerCodeSelected]}>{banner.code}</Text>
        <Text style={styles.bannerSelectorTitle}>{banner.title}</Text>
        <Text style={styles.bannerSelectorSubtitle}>{banner.subtitle}</Text>
      </View>
      <BannerArtwork banner={banner} compact />
      <View style={[styles.bannerActiveMark, { backgroundColor: selected ? banner.accent : Palette.line }]} />
    </Pressable>
  );
}

function PokemonTile({
  pokemon,
  ownedCount,
  onPress,
}: {
  pokemon: GachaCreature;
  ownedCount: number;
  onPress: () => void;
}) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const owned = ownedCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={owned ? `${pokemon.name}, owned ${ownedCount}` : `Undiscovered Pokémon number ${pokemon.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pokemonTile, owned && styles.pokemonTileOwned, pressed && styles.pressed]}
    >
      <View style={styles.tileNumberRow}>
        <Text style={styles.tileNumber}>#{String(pokemon.id).padStart(3, '0')}</Text>
        {owned ? <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[pokemon.rarity] }]} /> : <Ionicons name="lock-closed" size={11} color={Palette.muted} />}
      </View>
      <View style={styles.tileImageStage}>
        <PokemonImage pokemon={pokemon} size={76} muted={!owned} />
        {!owned ? <Text style={styles.unknownMark}>?</Text> : null}
      </View>
      <Text style={[styles.tileName, !owned && styles.tileNameLocked]} numberOfLines={1}>
        {owned ? pokemon.name : 'Undiscovered'}
      </Text>
      <Text style={styles.tileMeta}>{owned ? `${getPokemonRarityLabel(pokemon)} · ×${ownedCount}` : 'No field data'}</Text>
    </Pressable>
  );
}

function RevealModal({
  visible,
  results,
  onClose,
  onOpenPokedex,
}: {
  visible: boolean;
  results: GachaCreature[];
  onClose: () => void;
  onOpenPokedex: () => void;
}) {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const headline = getFeaturedPokemon(results);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable pressScale={1} style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close pull results" />
        <View style={styles.revealCard}>
          <View style={styles.revealTopline}>
            <Text style={styles.revealEyebrow}>RESEARCH RESULT</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={22} color={Palette.secondary} />
            </Pressable>
          </View>

          {headline ? (
            <>
              <View style={[styles.revealHero, { backgroundColor: `${RARITY_COLORS[headline.rarity]}12` }]}>
                <View style={[styles.revealAccent, { backgroundColor: RARITY_COLORS[headline.rarity] }]} />
                <PokemonPresentation pokemon={headline} active={visible} size={results.length === 1 ? 178 : 124} />
              </View>
              <Text style={styles.revealLabel}>{results.length === 1 ? 'Encounter registered' : `${results.length} encounters registered`}</Text>
              <Text style={styles.revealName}>{results.length === 1 ? headline.name : 'Research batch complete'}</Text>
              {results.length === 1 ? (
                <Text style={[styles.revealRarity, { color: RARITY_COLORS[headline.rarity] }]}>{getPokemonRarityLabel(headline)}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resultStrip}>
                  {results.map((pokemon, index) => (
                    <View key={`${pokemon.id}-${index}`} style={styles.resultItem}>
                      <PokemonImage pokemon={pokemon} size={58} />
                      <Text style={styles.resultName} numberOfLines={1}>{pokemon.name}</Text>
                      <View style={[styles.resultRarity, { backgroundColor: RARITY_COLORS[pokemon.rarity] }]} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </>
          ) : null}

          <View style={styles.revealActions}>
            <TouchableOpacity accessibilityRole="button" style={styles.revealPrimary} onPress={onClose} activeOpacity={0.82}>
              <Text style={styles.revealPrimaryText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.revealSecondary} onPress={onOpenPokedex} activeOpacity={0.82}>
              <Text style={styles.revealSecondaryText}>Open Pokédex</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function GachaScreen() {
  const styles = useThemedStyles(themedStyles);
  const { colors: Palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const { coins, spendCoins } = useCoins();
  const { gachaResults, addGachaResults } = useGachaCollection();
  const { catalog, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } = usePokeApiCatalog();
  const [selectedBannerId, setSelectedBannerId] = useState(GACHA_BANNERS[0].id);
  const [selectedPokemon, setSelectedPokemon] = useState<GachaCreature | null>(null);
  const [isPokedexOpen, setIsPokedexOpen] = useState(false);

  const selectedBanner = GACHA_BANNERS.find((banner) => banner.id === selectedBannerId) ?? GACHA_BANNERS[0];
  const selectedPool = useMemo(() => getBannerPool(selectedBanner, catalog), [catalog, selectedBanner]);
  const catalogReady = catalog.length === POKEMON_GENERATIONS_1_TO_5_TOTAL;
  const {
    pullingCount,
    pullResults,
    showCatch,
    catchRarity,
    showReveal,
    isPulling,
    runPull,
    completeCatchInteraction,
    closeReveal,
  } = useGachaPull({
    catalog,
    catalogReady,
    selectedBanner,
    spendCoins,
    addGachaResults,
  });

  const ownedCounts = useMemo(() => {
    return gachaResults.reduce<Record<string, number>>((counts, result) => {
      const key = result.id ? String(result.id) : result.name;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }, [gachaResults]);

  const getOwnedCount = useCallback((pokemon: GachaCreature) => ownedCounts[String(pokemon.id)] ?? ownedCounts[pokemon.name] ?? 0, [ownedCounts]);
  const discovered = catalog.filter((pokemon) => getOwnedCount(pokemon) > 0).length;
  const recentPokemon = useMemo(() => {
    const byId = new Map(catalog.map((pokemon) => [pokemon.id, pokemon]));
    const byName = new Map(catalog.map((pokemon) => [pokemon.name, pokemon]));
    const seen = new Set<string>();
    const recent: GachaCreature[] = [];

    for (let index = gachaResults.length - 1; index >= 0 && recent.length < 9; index -= 1) {
      const result = gachaResults[index];
      const key = result.id ? String(result.id) : result.name;
      if (seen.has(key)) continue;
      const pokemon = result.id ? byId.get(result.id) : byName.get(result.name);
      if (!pokemon) continue;
      seen.add(key);
      recent.push(pokemon);
    }

    return recent;
  }, [catalog, gachaResults]);
  const detailOwnedCount = selectedPokemon ? getOwnedCount(selectedPokemon) : 0;
  const bannerWidth = Math.min(width - 58, 304);

  const openFullPokedex = () => {
    closeReveal();
    setIsPokedexOpen(true);
  };

  const openPokemonDetail = (pokemon: GachaCreature) => {
    if (Platform.OS === 'web') {
      const result = gachaResults.find((item) => item.id === pokemon.id || item.name === pokemon.name);
      playPokemonCryOnWeb(result?.cry, pokemon.id);
    }
    setSelectedPokemon(pokemon);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <NeruRobot reactToButtons size={42} tabIndex={3} />
            <View>
              <Text style={styles.pageTitle}>GACHA</Text>
              <Text style={styles.eyebrow}>Neru research lab</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.coinPill} accessibilityLabel={`${coins} research coins`}>
              <View style={styles.coinMark}><Text style={styles.coinMarkText}>N</Text></View>
              <Text style={styles.coinValue}>{coins}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open full Pokédex" onPress={() => setIsPokedexOpen(true)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <Ionicons name="journal-outline" size={20} color={Palette.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroCode}>{selectedBanner.code} / ACTIVE</Text>
            <Text style={styles.heroTitle}>{selectedBanner.title}</Text>
            <Text style={styles.heroSubtitle}>{selectedBanner.subtitle}. Register every encounter in your personal Pokédex.</Text>
            <View style={styles.heroStatusRow}>
              <View style={[styles.liveDot, { backgroundColor: selectedBanner.accent }]} />
              <Text style={styles.heroStatus}>{catalogLoading ? 'SYNCING POKÉAPI CATALOG' : `${selectedPool.length} SPECIES IN CURRENT POOL`}</Text>
            </View>
          </View>
          <BannerArtwork banner={selectedBanner} />
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>LIVE RESEARCH</Text>
            <Text style={styles.sectionTitle}>Choose a banner</Text>
          </View>
          <Text style={styles.sectionCount}>{GACHA_BANNERS.length} available</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRail} snapToInterval={bannerWidth + 12} decelerationRate="fast">
          {GACHA_BANNERS.map((banner) => (
            <View key={banner.id} style={{ width: bannerWidth }}>
              <BannerSelector banner={banner} selected={banner.id === selectedBanner.id} onPress={() => setSelectedBannerId(banner.id)} />
            </View>
          ))}
        </ScrollView>

        <View style={styles.pullPanel}>
          <View style={styles.pullPanelHeader}>
            <View>
              <Text style={styles.pullLabel}>SELECTED POOL</Text>
              <Text style={styles.pullTitle}>{selectedBanner.title}</Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeValue}>{RARITY_WEIGHTS.legendary}%</Text>
              <Text style={styles.rateBadgeLabel}>TOP TIER</Text>
            </View>
          </View>

          <View style={styles.oddsRow}>
            {(Object.keys(RARITY_WEIGHTS) as (keyof typeof RARITY_WEIGHTS)[]).map((rarity, index) => (
              <View key={rarity} style={[styles.oddsItem, index > 0 && styles.oddsDivider]}>
                <View style={[styles.oddsDot, { backgroundColor: RARITY_COLORS[rarity] }]} />
                <Text style={styles.oddsName}>{RARITY_LABELS[rarity]}</Text>
                <Text style={styles.oddsValue}>{RARITY_WEIGHTS[rarity]}%</Text>
              </View>
            ))}
          </View>

          <View style={styles.pullActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: isPulling || !catalogReady || coins < SINGLE_PULL_COST }} style={[styles.pullSecondary, (isPulling || !catalogReady || coins < SINGLE_PULL_COST) && styles.disabled]} onPress={() => runPull(1)} disabled={isPulling || !catalogReady || coins < SINGLE_PULL_COST} activeOpacity={0.82}>
              {pullingCount === 1 ? <ActivityIndicator color={Palette.ink} /> : <>
                <Text style={styles.pullSecondaryTop}>PULL ×1</Text>
                <Text style={styles.pullSecondaryCost}>{SINGLE_PULL_COST} N</Text>
              </>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: isPulling || !catalogReady || coins < TEN_PULL_COST }} style={[styles.pullPrimary, (isPulling || !catalogReady || coins < TEN_PULL_COST) && styles.disabled]} onPress={() => runPull(10)} disabled={isPulling || !catalogReady || coins < TEN_PULL_COST} activeOpacity={0.84}>
              {pullingCount === 10 ? <ActivityIndicator color={Palette.onAccent} /> : <>
                <Text style={styles.pullPrimaryTop}>PULL ×10</Text>
                <Text style={styles.pullPrimaryCost}>{TEN_PULL_COST} N · SAVE 20</Text>
              </>}
            </TouchableOpacity>
          </View>
          {catalogLoading ? <Text style={styles.balanceHint}>Loading Generations I–V from PokéAPI…</Text> : null}
          {catalogError ? <Pressable accessibilityRole="button" onPress={refreshCatalog} style={styles.retryRow}><Ionicons name="refresh" size={14} color={Palette.red} /><Text style={styles.retryText}>Catalog unavailable · Retry</Text></Pressable> : null}
          {coins < SINGLE_PULL_COST ? <Text style={styles.balanceHint}>Complete Tasks to earn more research coins.</Text> : null}
        </View>

        <View style={styles.collectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>FIELD ARCHIVE</Text>
            <Text style={styles.sectionTitle}>Your Pokédex</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setIsPokedexOpen(true)} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
            <Text style={styles.textActionLabel}>View all</Text>
            <Ionicons name="arrow-forward" size={15} color={Palette.red} />
          </Pressable>
        </View>

        <View style={styles.collectionSummary}>
          <View style={styles.collectionMetric}>
            <Text style={styles.collectionValue}>{String(discovered).padStart(2, '0')}</Text>
            <Text style={styles.collectionLabel}>REGISTERED</Text>
          </View>
          <View style={styles.collectionDivider} />
          <View style={styles.collectionProgressArea}>
            <View style={styles.collectionProgressCopy}>
              <Text style={styles.collectionProgressText}>{discovered} of {POKEMON_GENERATIONS_1_TO_5_TOTAL} species</Text>
              <Text style={styles.collectionPercent}>{Math.round((discovered / POKEMON_GENERATIONS_1_TO_5_TOTAL) * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(discovered / POKEMON_GENERATIONS_1_TO_5_TOTAL) * 100}%` }]} /></View>
          </View>
        </View>

        <View style={styles.recentCollectionHeader}>
          <Text style={styles.sectionEyebrow}>RECENTLY COLLECTED</Text>
          <Text style={styles.recentCollectionMeta}>Newest first</Text>
        </View>

        {catalogLoading ? (
          <View style={styles.emptyCollection}><ActivityIndicator color={Palette.red} /><Text style={styles.emptyTitle}>Loading 649 species</Text><Text style={styles.emptyCopy}>PokéAPI data will be cached for future visits.</Text></View>
        ) : recentPokemon.length > 0 ? (
          <View style={styles.pokedexGrid}>
            {recentPokemon.map((pokemon) => <PokemonTile key={pokemon.id} pokemon={pokemon} ownedCount={getOwnedCount(pokemon)} onPress={() => openPokemonDetail(pokemon)} />)}
          </View>
        ) : (
          <View style={styles.emptyCollection}>
            <Ionicons name="scan-outline" size={24} color={Palette.muted} />
            <Text style={styles.emptyTitle}>No encounters registered</Text>
            <Text style={styles.emptyCopy}>Choose a live banner and make your first pull to begin the Pokédex.</Text>
          </View>
        )}

        <View style={styles.bottomClearance} />
      </ScrollView>

      <CatchAnimationModal visible={showCatch} rarity={catchRarity} pullCount={pullingCount ?? 1} onComplete={completeCatchInteraction} />

      <RevealModal visible={showReveal} results={pullResults} onClose={closeReveal} onOpenPokedex={openFullPokedex} />

      <Modal
        transparent
        animationType="none"
        visible={isPokedexOpen}
        onRequestClose={() => setIsPokedexOpen(false)}
      >
        <PokedexScreen presentation="drawer" onDismiss={() => setIsPokedexOpen(false)} />
      </Modal>

      <Modal visible={selectedPokemon !== null} transparent animationType="fade" onRequestClose={() => setSelectedPokemon(null)}>
        <View style={styles.modalOverlay}>
          <Pressable pressScale={1} style={StyleSheet.absoluteFill} onPress={() => setSelectedPokemon(null)} />
          {selectedPokemon ? (
            <View style={styles.detailCard}>
              <View style={styles.detailTopline}>
                <Text style={styles.detailNumber}>#{String(selectedPokemon.id).padStart(3, '0')}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close details" hitSlop={10} onPress={() => setSelectedPokemon(null)}><Ionicons name="close" size={22} color={Palette.secondary} /></Pressable>
              </View>
              <View style={styles.detailImageStage}>
                {detailOwnedCount > 0
                  ? <PokemonPresentation pokemon={selectedPokemon} active={selectedPokemon !== null} size={180} autoPlayCry={Platform.OS !== 'web'} />
                  : <PokemonImage pokemon={selectedPokemon} size={180} muted />}
                {detailOwnedCount === 0 ? <Ionicons name="lock-closed" size={24} color={Palette.muted} style={styles.detailLock} /> : null}
              </View>
              <Text style={styles.detailTitle}>{detailOwnedCount > 0 ? selectedPokemon.name : 'Undiscovered'}</Text>
              <Text style={[styles.detailRarity, { color: RARITY_COLORS[selectedPokemon.rarity] }]}>{getPokemonRarityLabel(selectedPokemon)}</Text>
              <Text style={styles.detailDescription}>{detailOwnedCount > 0 ? selectedPokemon.description : `Encounter this Pokémon through the ${GACHA_BANNERS.find((banner) => banner.id === selectedPokemon.bannerIds[0])?.title ?? 'active'} banner to unlock its field notes.`}</Text>
              <View style={styles.detailFooter}>
                <View><Text style={styles.detailFooterLabel}>CAPTURE RATE</Text><Text style={styles.detailFooterValue}>{selectedPokemon.captureRate} / 255</Text></View>
                <View style={styles.detailFooterRight}><Text style={styles.detailFooterLabel}>COPIES OWNED</Text><Text style={styles.detailFooterValue}>{detailOwnedCount}</Text></View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const themedStyles = createEditorialStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.background },
  noPointerEvents: { pointerEvents: 'none' },
  scrollContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 92 : 80 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Palette.line },
  headerIdentity: { minWidth: 0, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { ...Type.bodySmall, marginTop: 3, color: Palette.secondary },
  pageTitle: { ...Type.pageTitle, color: Palette.ink },
  headerActions: pageHeaderActionRowStyle,
  coinPill: pageHeaderLabelControlStyle(Palette),
  coinMark: { width: 20, height: 20, borderRadius: 10, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' },
  coinMarkText: { ...Type.captionStrong, color: Palette.onAccent },
  coinValue: { ...Type.metricSmall, color: Palette.ink, fontVariant: ['tabular-nums'] },
  iconButton: pageHeaderIconControlStyle(Palette),
  heroCard: { height: 250, marginTop: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: Palette.inverse, position: 'relative' },
  heroCopy: { width: '56%', height: '100%', zIndex: 3, justifyContent: 'center', paddingLeft: 20 },
  heroCode: { ...Type.label, color: Palette.muted },
  heroTitle: { ...Type.heroTitle, marginTop: 10, maxWidth: 190, color: Palette.onInverse },
  heroSubtitle: { ...Type.bodySmall, marginTop: 10, maxWidth: 200, color: Palette.secondary },
  heroStatusRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  heroStatus: { ...Type.microLabel, color: Palette.muted },
  artworkStage: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 88, overflow: 'hidden' },
  artworkStageCompact: { width: 54 },
  verticalField: { ...StyleSheet.absoluteFillObject, opacity: 0.82 },
  verticalFieldCompact: { opacity: 0.14 },
  sectionHeading: { marginTop: 26, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { ...Type.label, color: Palette.muted },
  sectionTitle: { ...Type.sectionTitle, marginTop: 4, color: Palette.ink },
  sectionCount: { ...Type.caption, color: Palette.secondary },
  bannerRail: { gap: 12, paddingRight: 20 },
  bannerSelector: { height: 126, borderWidth: 1, borderColor: Palette.line, borderRadius: 9, overflow: 'hidden', backgroundColor: Palette.card, position: 'relative' },
  bannerSelectorSelected: { borderColor: Palette.ink, borderWidth: 1.5 },
  bannerSelectorCopy: { zIndex: 2, width: '62%', height: '100%', justifyContent: 'center', paddingLeft: 14 },
  bannerCode: { ...Type.microLabel, color: Palette.muted },
  bannerCodeSelected: { color: Palette.red },
  bannerSelectorTitle: { ...Type.cardTitle, marginTop: 7, color: Palette.ink },
  bannerSelectorSubtitle: { ...Type.caption, marginTop: 4, color: Palette.secondary },
  bannerActiveMark: { position: 'absolute', left: 0, bottom: 0, right: 0, height: 3 },
  pullPanel: { marginTop: 16, borderWidth: 1, borderColor: Palette.line, borderRadius: 10, padding: 16 },
  pullPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pullLabel: { ...Type.microLabel, color: Palette.muted },
  pullTitle: { ...Type.sectionTitle, marginTop: 4, color: Palette.ink },
  rateBadge: { minWidth: 70, borderLeftWidth: 2, borderLeftColor: Palette.red, paddingLeft: 10 },
  rateBadgeValue: { ...Type.metric, color: Palette.ink },
  rateBadgeLabel: { ...Type.microLabel, marginTop: 1, color: Palette.muted },
  oddsRow: { marginTop: 16, paddingVertical: 12, backgroundColor: Palette.surface, borderRadius: 7, flexDirection: 'row' },
  oddsItem: { flex: 1, paddingHorizontal: 8, alignItems: 'center', gap: 3 },
  oddsDivider: { borderLeftWidth: 1, borderLeftColor: Palette.line },
  oddsDot: { width: 6, height: 6, borderRadius: 3 },
  oddsName: { ...Type.microLabel, color: Palette.secondary },
  oddsValue: { ...Type.captionStrong, color: Palette.ink },
  pullActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  pullSecondary: { flex: 0.8, minHeight: 54, borderWidth: 1, borderColor: Palette.ink, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pullSecondaryTop: { ...Type.button, color: Palette.ink },
  pullSecondaryCost: { ...Type.microLabel, marginTop: 2, color: Palette.secondary },
  pullPrimary: { flex: 1.2, minHeight: 54, borderRadius: 8, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' },
  pullPrimaryTop: { ...Type.button, color: Palette.onAccent },
  pullPrimaryCost: { ...Type.microLabel, marginTop: 2, color: Palette.onAccent },
  balanceHint: { ...Type.caption, marginTop: 10, color: Palette.secondary, textAlign: 'center' },
  retryRow: { minHeight: 34, marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  retryText: { ...Type.captionStrong, color: Palette.red },
  collectionHeader: { marginTop: 28, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  textAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 5 },
  textActionLabel: { ...Type.buttonSmall, color: Palette.red },
  collectionSummary: { marginTop: 14, minHeight: 82, borderWidth: 1, borderColor: Palette.line, borderRadius: 9, flexDirection: 'row', alignItems: 'center', padding: 14 },
  collectionMetric: { width: 82 },
  collectionValue: { ...Type.displayNumber, color: Palette.ink },
  collectionLabel: { ...Type.microLabel, marginTop: 3, color: Palette.muted },
  collectionDivider: { width: 1, height: 45, backgroundColor: Palette.line, marginRight: 15 },
  collectionProgressArea: { flex: 1 },
  collectionProgressCopy: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  collectionProgressText: { ...Type.caption, color: Palette.secondary },
  collectionPercent: { ...Type.captionStrong, color: Palette.ink },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: Palette.surface, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: Palette.red },
  recentCollectionHeader: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentCollectionMeta: { ...Type.caption, color: Palette.muted },
  pokedexGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pokemonTile: { width: '31.7%', minHeight: 150, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, padding: 9, backgroundColor: Palette.surface },
  pokemonTileOwned: { backgroundColor: Palette.card },
  tileNumberRow: { minHeight: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileNumber: { ...Type.microLabel, color: Palette.muted },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  tileImageStage: { height: 78, alignItems: 'center', justifyContent: 'center' },
  unknownMark: { position: 'absolute', fontSize: 20, fontWeight: '900', color: Palette.muted },
  tileName: { ...Type.captionStrong, color: Palette.ink },
  tileNameLocked: { color: Palette.muted },
  tileMeta: { ...Type.microLabel, marginTop: 3, color: Palette.muted },
  emptyCollection: { marginTop: 12, minHeight: 150, borderWidth: 1, borderColor: Palette.line, borderRadius: 9, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { ...Type.bodyStrong, marginTop: 10, color: Palette.ink },
  emptyCopy: { ...Type.caption, marginTop: 5, maxWidth: 270, color: Palette.secondary, textAlign: 'center' },
  bottomClearance: { height: 16 },
  modalOverlay: { flex: 1, backgroundColor: Palette.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  revealCard: { width: '100%', maxWidth: 430, borderRadius: 12, backgroundColor: Palette.card, padding: 18 },
  revealTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revealEyebrow: { ...Type.label, color: Palette.muted },
  revealHero: { height: 190, marginTop: 12, borderRadius: 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  revealAccent: { position: 'absolute', width: 164, height: 164, borderRadius: 82, opacity: 0.12 },
  revealLabel: { ...Type.label, marginTop: 14, color: Palette.muted, textAlign: 'center' },
  revealName: { ...Type.modalTitle, marginTop: 4, color: Palette.ink, textAlign: 'center' },
  revealRarity: { ...Type.label, marginTop: 4, textAlign: 'center' },
  resultStrip: { paddingVertical: 14, gap: 8 },
  resultItem: { width: 78, minHeight: 92, borderWidth: 1, borderColor: Palette.line, borderRadius: 7, alignItems: 'center', padding: 6 },
  resultName: { ...Type.microLabel, width: '100%', color: Palette.ink, textAlign: 'center' },
  resultRarity: { marginTop: 5, width: 18, height: 2 },
  revealActions: { marginTop: 14, gap: 8 },
  revealPrimary: { minHeight: 46, borderRadius: 8, backgroundColor: Palette.red, alignItems: 'center', justifyContent: 'center' },
  revealPrimaryText: { ...Type.button, color: Palette.onAccent },
  revealSecondary: { minHeight: 42, borderWidth: 1, borderColor: Palette.line, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  revealSecondaryText: { ...Type.buttonSmall, color: Palette.secondary },
  detailCard: { width: '100%', maxWidth: 390, borderRadius: 12, backgroundColor: Palette.card, padding: 18 },
  detailTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailNumber: { ...Type.label, color: Palette.muted },
  detailImageStage: { height: 205, marginTop: 8, borderRadius: 9, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  detailLock: { position: 'absolute' },
  detailTitle: { ...Type.modalTitle, marginTop: 15, color: Palette.ink },
  detailRarity: { ...Type.label, marginTop: 3 },
  detailDescription: { ...Type.body, marginTop: 12, color: Palette.secondary },
  detailFooter: { marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: Palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailFooterLabel: { ...Type.label, color: Palette.muted },
  detailFooterValue: { ...Type.cardTitle, color: Palette.ink },
  detailFooterRight: { alignItems: 'flex-end' },
}));
