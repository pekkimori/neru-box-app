import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { Fraunces_700Bold_Italic, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

export const DiaryFonts = {
  date: 'Fraunces_900Black',
  quests: 'SpaceGrotesk_700Bold',
  mood: 'SpaceGrotesk_700Bold',
  coins: 'SpaceGrotesk_700Bold',
  streak: 'SpaceGrotesk_700Bold',
  photoOne: 'Caveat_600SemiBold',
  photoTwo: 'Caveat_600SemiBold',
  photoThree: 'Caveat_600SemiBold',
  note: 'Caveat_600SemiBold',
  badges: 'SpaceGrotesk_700Bold',
  luckyStar: 'Fraunces_700Bold_Italic',
  banana: 'SpaceGrotesk_700Bold',
  wow: 'SpaceGrotesk_700Bold',
  heart: 'SpaceGrotesk_700Bold',
  rainbow: 'SpaceGrotesk_700Bold',
  pokemon: 'SpaceGrotesk_700Bold',
} as const;

export const DIARY_FONT_ASSETS = {
  [DiaryFonts.date]: Fraunces_900Black,
  [DiaryFonts.quests]: SpaceGrotesk_700Bold,
  [DiaryFonts.photoOne]: Caveat_600SemiBold,
  [DiaryFonts.luckyStar]: Fraunces_700Bold_Italic,
};
