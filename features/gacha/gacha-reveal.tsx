import { SectionHeading } from '@/components/section-heading';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { AppSheet } from '@/components/app-sheet';
import { AppButton } from '@/components/native-controls';
import { getFeaturedPokemon } from './gacha-pull';
import { type GachaCreature, RARITY_COLORS, getPokemonRarityLabel } from './pokemon-catalog';
import { PokemonPresentation } from './pokemon-presentation';
import { PokemonArtwork } from './pokemon-artwork';
import { Text, View } from 'react-native';

import { useThemedStyles } from '@/theme/app-theme';
import { gachaStyles } from './gacha-styles';

export function RevealModal({
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
  const styles = useThemedStyles(gachaStyles);
  const headline = getFeaturedPokemon(results);

  return (
    <AppSheet visible={visible} onDismiss={onClose} title="Caught Pokémon">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          <SectionHeading>Catch results</SectionHeading>
          {headline ? (
            <>
              <AppBox variant="inset" padding="none"
                style={[
                  styles.revealHero,
                  { backgroundColor: `${RARITY_COLORS[headline.rarity]}12` },
                ]}
              >
                <View
                  style={[
                    styles.revealAccent,
                    { backgroundColor: RARITY_COLORS[headline.rarity] },
                  ]}
                />
                <PokemonPresentation
                  pokemon={headline}
                  active={visible}
                  size={results.length === 1 ? 178 : 124}
                />
              </AppBox>
              <SectionHeading>
                {results.length === 1
                  ? headline.name
                  : "Research batch complete"}
              </SectionHeading>
              {results.length === 1 ? (
                <Text
                  style={[
                    styles.revealRarity,
                    { color: RARITY_COLORS[headline.rarity] },
                  ]}
                >
                  {getPokemonRarityLabel(headline)}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.resultStrip}
                >
                  {results.map((pokemon, index) => (
                    <AppBox variant="card" padding="xs"
                      key={`${pokemon.id}-${index}`}
                      style={styles.resultItem}
                    >
                      <PokemonArtwork pokemon={pokemon} size={58} />
                      <Text style={styles.resultName} numberOfLines={1}>
                        {pokemon.name}
                      </Text>
                      <View
                        style={[
                          styles.resultRarity,
                          { backgroundColor: RARITY_COLORS[pokemon.rarity] },
                        ]}
                      />
                    </AppBox>
                  ))}
                </ScrollView>
              )}
            </>
          ) : null}

          <View style={styles.revealActions}>
            <AppButton label="Open Pokédex" variant="secondary" onPress={onOpenPokedex} />
          </View>
      </ScrollView>
    </AppSheet>
  );
}
