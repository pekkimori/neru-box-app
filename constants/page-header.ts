import type { ViewStyle } from 'react-native';

type HeaderControlPalette = {
  card: string;
  line: string;
};

const CONTROL_SIZE = 44;

export const pageHeaderActionRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
};

export function pageHeaderIconControlStyle(
  palette: HeaderControlPalette,
): ViewStyle {
  return {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    backgroundColor: palette.card,
  };
}

export function pageHeaderLabelControlStyle(
  palette: HeaderControlPalette,
): ViewStyle {
  return {
    minWidth: CONTROL_SIZE,
    height: CONTROL_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    backgroundColor: palette.card,
  };
}
