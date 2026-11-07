import { AppBox } from '@/components/app-box';
import { ButtonIcon, ButtonLabel, InteractiveSurface, TextButton } from '@/components/app-controls';
import { ActivityIndicator } from 'react-native';
import { type GachaCreature, RARITY_COLORS, getPokemonRarityLabel, POKEMON_GENERATIONS_1_TO_5_TOTAL } from './pokemon-catalog';
import { PokemonArtwork } from './pokemon-artwork';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { gachaStyles } from './gacha-styles';

function PokemonTile({
  pokemon,
  ownedCount,
  onPress,
}: {
  pokemon: GachaCreature;
  ownedCount: number;
  onPress: () => void;
}) {
  const styles = useThemedStyles(gachaStyles);
  const { colors: Palette } = useAppTheme();
  const owned = ownedCount> 0;

  return (
    <InteractiveSurface
      accessibilityRole="button"
      accessibilityLabel={
        owned
          ? `${pokemon.name}, owned ${ownedCount}`
          : `Undiscovered Pokémon number ${pokemon.id}`
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.pokemonTile,
        owned && styles.pokemonTileOwned,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.tileNumberRow}>
        <Text style={styles.tileNumber}>
          #{String(pokemon.id).padStart(3, "0")}
        </Text>
        {owned ? (
          <View
            style={[
              styles.rarityDot,
              { backgroundColor: RARITY_COLORS[pokemon.rarity] },
            ]}
          />
        ) : (
          <Ionicons name="lock-closed" size={11} color={Palette.muted} />
        )}
      </View>
      <View style={styles.tileImageStage}>
        <PokemonArtwork pokemon={pokemon} size={76} hidden={!owned} />
        {!owned ? <Text style={styles.unknownMark}>?</Text> : null}
      </View>
      <Text
        style={[styles.tileName, !owned && styles.tileNameLocked]}
        numberOfLines={1}
      >
        {owned ? pokemon.name : "Undiscovered"}
      </Text>
      <Text style={styles.tileMeta}>
        {owned
          ? `${getPokemonRarityLabel(pokemon)} · ×${ownedCount}`
          : "No field data"}
      </Text>
    </InteractiveSurface>
  );
}
export function GachaCollection({ discovered, recentPokemon, catalogLoading, getOwnedCount, onOpenPokedex, onOpenPokemon }: {
  discovered: number; recentPokemon: GachaCreature[]; catalogLoading: boolean;
  getOwnedCount: (pokemon: GachaCreature) => number; onOpenPokedex: () => void; onOpenPokemon: (pokemon: GachaCreature) => void;
}) {
  const styles = useThemedStyles(gachaStyles);
  const { colors: Palette } = useAppTheme();
  return (<>
    <View style={styles.collectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>Your Pokédex</Text>
      </View>
      <TextButton
        accessibilityRole="button"
        onPress={onOpenPokedex}
      >
        <ButtonLabel>View all</ButtonLabel>
        <ButtonIcon name="arrow-forward" size={15} />
      </TextButton>
    </View>

    <AppBox variant="card" style={styles.collectionSummary}>
      <View style={styles.collectionMetric}>
        <Text style={styles.collectionValue}>
          {String(discovered).padStart(2, "0")}
        </Text>
        <Text style={styles.collectionLabel}>REGISTERED</Text>
      </View>
      <View style={styles.collectionDivider} />
      <View style={styles.collectionProgressArea}>
        <View style={styles.collectionProgressCopy}>
          <Text style={styles.collectionProgressText}>
            {discovered} of {POKEMON_GENERATIONS_1_TO_5_TOTAL} species
          </Text>
          <Text style={styles.collectionPercent}>
            {Math.round(
              (discovered / POKEMON_GENERATIONS_1_TO_5_TOTAL) * 100,
            )}
            %
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(discovered / POKEMON_GENERATIONS_1_TO_5_TOTAL) * 100}%`,
              },
            ]}
          />
        </View>
      </View>
    </AppBox>

    <View style={styles.recentCollectionHeader}>
      <Text style={styles.sectionEyebrow}>RECENTLY COLLECTED</Text>
    </View>

    {catalogLoading ? (
      <AppBox variant="empty" style={styles.emptyCollection}>
        <ActivityIndicator color={Palette.red} />
        <Text style={styles.emptyTitle}>Loading 649 species</Text>
      </AppBox>
    ) : recentPokemon.length> 0 ? (
      <View style={styles.pokedexGrid}>
        {recentPokemon.map((pokemon) => (
          <PokemonTile
            key={pokemon.id}
            pokemon={pokemon}
            ownedCount={getOwnedCount(pokemon)}
            onPress={() => onOpenPokemon(pokemon)}
          />
        ))}
      </View>
    ) : (
      <AppBox variant="empty" style={styles.emptyCollection}>
        <Ionicons name="scan-outline" size={24} color={Palette.muted} />
        <Text style={styles.emptyTitle}>No encounters registered</Text>
        <Text style={styles.emptyCopy}>
          Choose a live banner and make your first pull to begin the
          Pokédex.
        </Text>
      </AppBox>
    )}


  </>);
}
