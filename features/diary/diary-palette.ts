import { createEditorialPalette, type EditorialPalette } from '@/theme/editorial-theme';
const diaryExtras = (colors: EditorialPalette) => ({
  paper: colors.mode === 'dark' ? '#201E25' : '#FFFEFB',
  paperLine: colors.mode === 'dark' ? 'rgba(143,183,225,0.12)' : 'rgba(49,91,135,0.10)',
  mint: colors.mode === 'dark' ? '#25473F' : '#DDF2EA',
  mintInk: colors.mode === 'dark' ? '#BDEBDD' : '#286456',
  sky: colors.mode === 'dark' ? '#243B50' : '#E2F0FB',
  skyInk: colors.mode === 'dark' ? '#B9DDF7' : '#2B628A',
  gold: colors.mode === 'dark' ? '#50441F' : '#FFF0BC',
  goldInk: colors.mode === 'dark' ? '#F2D778' : '#795C00',
  peach: colors.mode === 'dark' ? '#4A302A' : '#FFE6DC',
  peachInk: colors.mode === 'dark' ? '#FFC9B7' : '#8A3B29',
});

export const Palette = createEditorialPalette(diaryExtras);
