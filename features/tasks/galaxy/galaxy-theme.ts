import { createEditorialPalette } from '@/theme/editorial-theme';

// Archive-specific semantic colors. They deliberately follow the app mode
// while keeping the graph quieter than the surrounding editorial screens.
export const GalaxyPalette = createEditorialPalette((palette) => {
  const dark = palette.mode === 'dark';
  return {
    bg: dark ? '#15171C' : '#F7F9FC',
    surface: dark ? '#1D2027' : '#FFFFFF',
    surfaceRaised: dark ? '#252932' : '#EEF2F7',
    border: dark ? '#343946' : '#D8DEE8',
    text: dark ? '#F5F2EA' : '#172033',
    textDim: dark ? '#A8ADBA' : '#536176',
    textMuted: dark ? '#747B8B' : '#7B8799',
    dayEdge: dark ? 'rgba(196, 202, 216, 0.23)' : 'rgba(62, 78, 105, 0.24)',
    weekRule: dark ? 'rgba(196, 202, 216, 0.10)' : 'rgba(62, 78, 105, 0.10)',
    minimapViewport: dark ? 'rgba(245, 242, 234, 0.55)' : 'rgba(23, 32, 51, 0.52)',
    minimapFill: dark ? 'rgba(245, 242, 234, 0.06)' : 'rgba(23, 32, 51, 0.06)',
    backdrop: dark ? 'rgba(5, 7, 11, 0.68)' : 'rgba(23, 32, 51, 0.28)',
    photoSurface: dark ? '#121419' : '#EEF2F7',
    translucentSurface: dark ? 'rgba(29, 32, 39, 0.98)' : 'rgba(255, 255, 255, 0.98)',
    subtleFill: dark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(23, 32, 51, 0.035)',
    subtleLine: dark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(23, 32, 51, 0.10)',
    proofLabel: dark ? 'rgba(12, 14, 18, 0.78)' : 'rgba(255, 255, 255, 0.88)',
    starColors: dark
      ? ['#FFFFFF', '#DCEBFF', '#F7F1FF']
      : ['#66758C', '#7A8DA8', '#8B7F9E'],
  };
});
