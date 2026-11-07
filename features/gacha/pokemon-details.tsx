import { SectionHeading } from '@/components/section-heading';
import { boxStyle } from '@/theme/boxes';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { LayoutStyles } from '@/theme/layout';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Text, View } from 'react-native';
import { AppSheet } from '@/components/app-sheet';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { GACHA_BANNERS, RARITY_COLORS, getPokemonRarityLabel, type GachaCreature } from './pokemon-catalog';
import { PokemonArtwork } from './pokemon-artwork';
import { PokemonPresentation } from './pokemon-presentation';

/** One detail presentation, whether opened from the overview or the archive. */
export function PokemonDetails({ pokemon, ownedCount, onDismiss }: {
  pokemon: GachaCreature | null; ownedCount: number; onDismiss: () => void;
}) {
  const styles = useThemedStyles(themedStyles);
  const { colors } = useAppTheme();
  const owned = ownedCount > 0;
  const banner = GACHA_BANNERS.find(item => item.id === pokemon?.bannerIds[0]);
  return <AppSheet visible={pokemon !== null} title={owned ? pokemon?.name ?? 'Pokémon' : 'Undiscovered'}
    onDismiss={onDismiss}>
    {pokemon && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
      <SectionHeading>Pokémon details</SectionHeading>
      <AppBox variant="inset" padding="sm" style={styles.artwork}>
        {owned
          ? <PokemonPresentation pokemon={pokemon} active size={180} autoPlayCry={Platform.OS !== 'web'} />
          : <PokemonArtwork pokemon={pokemon} size={180} hidden />}
        {!owned && <Ionicons name="lock-closed" size={26} color={colors.textMuted} style={styles.lock} />}
      </AppBox>
      <SectionHeading>{owned ? pokemon.name : 'Undiscovered'}</SectionHeading>
      <View style={styles.tags}>
        <Text style={[styles.rarity, { color: RARITY_COLORS[pokemon.rarity] }]}>{getPokemonRarityLabel(pokemon)}</Text>
        {owned && pokemon.types.map(type => <Text key={type} style={styles.type}>{type}</Text>)}
      </View>
      <Text style={styles.copy}>{owned ? pokemon.description : `Encounter this Pokémon through the ${banner?.title ?? 'active'} banner to unlock its field notes.`}</Text>
      <View style={styles.stats}>
        <View><Text style={styles.label}>CAPTURE RATE</Text><Text style={styles.value}>{pokemon.captureRate} / 255</Text></View>
        <View><Text style={styles.label}>COPIES REGISTERED</Text><Text style={styles.value}>{ownedCount}</Text></View>
      </View>
    </ScrollView>}
  </AppSheet>;
}

const Palette = createEditorialPalette();
const themedStyles = createEditorialStyles(() => ({
  body: { ...LayoutStyles.presentationBody },
  artwork: { alignItems: 'center', justifyContent: 'center' },
  lock: { position: 'absolute', bottom: 12, right: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  rarity: { ...Type.bodyStrong },
  type: { ...boxStyle(Palette, { variant: 'badge' }), ...Type.captionStrong, color: Palette.secondary },
  copy: { ...Type.body, color: Palette.secondary },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Palette.line },
  label: { ...Type.microLabel, color: Palette.muted },
  value: { ...Type.metric, color: Palette.ink, marginTop: 4 },
}));
