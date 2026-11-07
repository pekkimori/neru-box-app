import { ScrollView } from '@/components/feedback-scroll-view';
import { useMemo, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/page-header';
import { useThemedStyles } from '@/theme/app-theme';
import { useCoins } from '@/hooks/useCoins';
import { GACHA_BANNERS, type GachaCreature, getBannerPool, POKEMON_GENERATIONS_1_TO_5_TOTAL } from './pokemon-catalog';
import { useGachaPull } from './use-gacha-pull';
import { usePokeApiCatalog } from './use-pokeapi-catalog';
import { usePokemonCollection } from './use-pokemon-collection';
import { playPokemonCryOnWeb } from './pokemon-media';
import { PokedexScreen } from './pokedex-screen';
import { CatchAnimationModal } from './catch-animation-modal';
import { RevealModal } from './gacha-reveal';
import { GachaBanners } from './gacha-banners';
import { GachaCollection } from './gacha-collection';
import { GachaPullPanel } from './gacha-pull-panel';
import { PokemonDetails } from './pokemon-details';
import { gachaStyles } from './gacha-styles';
export default function GachaScreen() {
  const styles = useThemedStyles(gachaStyles);
  const { width } = useWindowDimensions();
  const { coins } = useCoins();
  const {
    catalog,
    loading: catalogLoading,
    error: catalogError,
    refresh: refreshCatalog,
  } = usePokeApiCatalog();
  const [selectedBannerId, setSelectedBannerId] = useState(GACHA_BANNERS[0].id);
  const [selectedPokemon, setSelectedPokemon] = useState<GachaCreature | null>(
    null,
  );
  const [isPokedexOpen, setIsPokedexOpen] = useState(false);

  const selectedBanner =
    GACHA_BANNERS.find((banner) => banner.id === selectedBannerId) ??
    GACHA_BANNERS[0];
  const selectedPool = useMemo(
    () => getBannerPool(selectedBanner, catalog),
    [catalog, selectedBanner],
  );
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
    completeCatchDismissal,
    closeReveal,
  } = useGachaPull({
    catalog,
    catalogReady,
    selectedBanner,
  });

  const { gachaResults, getOwnedCount, discovered, recentPokemon } = usePokemonCollection(catalog);
  const detailOwnedCount = selectedPokemon ? getOwnedCount(selectedPokemon) : 0;
  const bannerWidth = Math.min(width - 58, 304);

  const openFullPokedex = () => {
    closeReveal();
    setIsPokedexOpen(true);
  };

  const openPokemonDetail = (pokemon: GachaCreature) => {
    if (Platform.OS === "web") {
      const result = gachaResults.find(
        (item) => item.id === pokemon.id || item.name === pokemon.name,
      );
      playPokemonCryOnWeb(result?.cry, pokemon.id);
    }
    setSelectedPokemon(pokemon);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
      >
        <PageHeader
          title="Gacha"
          tabIndex={3}
          showCoins
          actions={[
            {
              accessibilityLabel: "Open full Pokédex",
              icon: "journal-outline",
              onPress: () => setIsPokedexOpen(true),
            },
          ]}
        />

        <GachaBanners selectedBanner={selectedBanner} onSelect={setSelectedBannerId}
          bannerWidth={bannerWidth} catalogLoading={catalogLoading} poolSize={selectedPool.length} />
        <GachaPullPanel coins={coins} catalogReady={catalogReady}
          isPulling={isPulling} pullingCount={pullingCount} onPull={runPull}
          loading={catalogLoading} error={catalogError} onRetry={refreshCatalog} />
        <GachaCollection discovered={discovered} recentPokemon={recentPokemon} catalogLoading={catalogLoading}
          getOwnedCount={getOwnedCount} onOpenPokedex={() => setIsPokedexOpen(true)} onOpenPokemon={openPokemonDetail} />
        <View style={styles.bottomClearance} />
      </ScrollView>

      <CatchAnimationModal
        visible={showCatch}
        rarity={catchRarity}
        pullCount={pullingCount ?? 1}
        onComplete={completeCatchInteraction}
        onDismiss={completeCatchDismissal}
      />

      <RevealModal
        visible={showReveal}
        results={pullResults}
        onClose={closeReveal}
        onOpenPokedex={openFullPokedex}
      />

      {isPokedexOpen && <PokedexScreen presentation="drawer" onDismiss={() => setIsPokedexOpen(false)} />}


      <PokemonDetails pokemon={selectedPokemon} ownedCount={detailOwnedCount} onDismiss={() => setSelectedPokemon(null)} />
    </SafeAreaView>
  );
}
