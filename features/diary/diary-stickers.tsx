import { AppBox } from '@/components/app-box';
import type React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { MOOD_KEYS } from '@/lib/icons/icon-reference';
import type { GachaResult } from '@/features/gacha/use-gacha-collection';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette } from './diary-palette';
import { diaryStyles } from './diary-styles';
export type MoodKey = (typeof MOOD_KEYS)[number];
export type DataStickerId = 'tasks' | 'routines' | 'coins' | 'streak';
export type StickerDefinition = {
  id: DataStickerId;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  caption: string;
  fill: string;
  ink: string;
};

export const MOOD_DETAILS: Record<MoodKey, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
  calm: { icon: 'leaf', label: 'Calm' },
  charged: { icon: 'flash', label: 'Charged' },
  glowing: { icon: 'sparkles', label: 'Glowing' },
  melty: { icon: 'water', label: 'Melty' },
  dreamy: { icon: 'moon', label: 'Dreamy' },
  'on-fire': { icon: 'flame', label: 'On fire' },
};




export function DataSticker({ item, compact = false }: { item: StickerDefinition; compact?: boolean }) {
  const styles = useThemedStyles(diaryStyles);
  return (
    <View accessibilityLabel={`${item.label}: ${item.value}. ${item.caption}`} style={[styles.dataSticker, compact && styles.dataStickerCompact, { backgroundColor: item.fill, borderColor: item.ink }]}>
      <View style={[styles.stickerTape, { backgroundColor: item.ink }]} />
      <View style={[styles.dataStickerIcon, { backgroundColor: item.ink }]}>
        <Ionicons name={item.icon} size={compact ? 13 : 15} color={item.fill} />
      </View>
      <View style={styles.dataStickerCopy}>
        <Text style={[styles.dataStickerLabel, { color: item.ink }]}>{item.label}</Text>
        <Text style={[styles.dataStickerValue, { color: item.ink }]}>{item.value}</Text>
        {!compact ? <Text style={[styles.dataStickerCaption, { color: item.ink }]} numberOfLines={1}>{item.caption}</Text> : null}
      </View>
    </View>
  );
}

export function MoodSticker({ mood, small = false }: { mood: MoodKey; small?: boolean }) {
  const styles = useThemedStyles(diaryStyles);
  const details = MOOD_DETAILS[mood];
  return (
    <View style={[styles.moodSticker, small && styles.moodStickerSmall]}>
      <View style={styles.moodStickerIcon}><Ionicons name={details.icon} size={small ? 15 : 19} color={Palette.onAccent} /></View>
      {!small ? <View><Text style={styles.moodStickerEyebrow}>MOOD</Text><Text style={styles.moodStickerLabel}>{details.label}</Text></View> : null}
    </View>
  );
}

export function PokemonKeepsake({ pokemon }: { pokemon: GachaResult }) {
  const styles = useThemedStyles(diaryStyles);
  const uri = pokemon.image ?? pokemon.frontSprite;
  return (
    <AppBox variant="card" padding="xs" style={styles.pokemonKeepsake}>
      <View style={styles.pokemonPin} />
      {uri ? <Image source={{ uri }} style={styles.pokemonKeepsakeImage} contentFit="contain" /> : <Text style={styles.pokemonKeepsakeEmoji}>{pokemon.emoji ?? '✦'}</Text>}
      <Text style={styles.pokemonKeepsakeName} numberOfLines={1}>{pokemon.name}</Text>
    </AppBox>
  );
}
