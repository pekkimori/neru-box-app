import { AppBox } from '@/components/app-box';
import { ActionRow } from '@/components/app-controls';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppButton, AppSlider } from '@/components/native-controls';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { CUSTOM_ACCENT_DEFAULT, getAccentTextColor, HEX_COLOR_PATTERN } from '@/theme/editorial-theme';
import { hexToHsv, hsvToHex, type HsvColor } from './custom-color';
import { configurationStyles } from './styles';

export function CustomAccentSettings() {
  const { appearance, colors, setCustomAccent } = useAppTheme();
  const styles = useThemedStyles(configurationStyles);
  const [editing, setEditing] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(appearance.customAccent ?? CUSTOM_ACCENT_DEFAULT));
  const [hex, setHex] = useState(appearance.customAccent ?? CUSTOM_ACCENT_DEFAULT);
  const selected = appearance.accentId === 'custom';
  const color = hsvToHex(hsv);
  const valid = HEX_COLOR_PATTERN.test(hex);
  const update = (patch: Partial<HsvColor>) => {
    const next = { ...hsv, ...patch };
    setHsv(next);
    setHex(hsvToHex(next));
  };
  const savedColor = appearance.customAccent ?? CUSTOM_ACCENT_DEFAULT;
  return (
    <View style={styles.customAccentSection}>
      <ActionRow accessibilityRole="button" accessibilityLabel="Custom color settings" accessibilityState={{ expanded: editing }}
        onPress={() => {
          if (!editing) { setHsv(hexToHsv(savedColor)); setHex(savedColor); }
          setEditing(!editing);
        }} style={[styles.customAccentOption, selected && styles.accentOptionActive]}>
        <View style={[styles.accentSwatch, { backgroundColor: savedColor }]}>
          <Ionicons name={selected ? 'checkmark' : 'color-palette-outline'} size={18} color={getAccentTextColor(savedColor)} />
        </View>
        <View style={styles.accentCopy}>
          <Text style={styles.accentName}>Custom color</Text>
          {selected && <Text style={styles.appearanceDetail}>{savedColor}</Text>}
        </View>
        <Ionicons name={editing ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </ActionRow>
      {editing && <View style={styles.customColorEditor}>
        <AppBox variant="card" accessibilityLabel={`Color preview ${color}`} style={[styles.colorPreview, { backgroundColor: color }]}>
          <Ionicons name="sparkles-outline" size={24} color={getAccentTextColor(color)} />
          <Text style={[styles.accentName, { color: getAccentTextColor(color), flexShrink: 1 }]}>Your accent · {color}</Text>
        </AppBox>
        <AppSlider label="Hue" value={hsv.hue / 360} valueText={`${Math.round(hsv.hue)}°`}
          onChange={value => update({ hue: value * 360 })} />
        <AppSlider label="Saturation" value={hsv.saturation} valueText={`${Math.round(hsv.saturation * 100)}%`}
          onChange={value => update({ saturation: value })} />
        <AppSlider label="Brightness" value={hsv.brightness} valueText={`${Math.round(hsv.brightness * 100)}%`}
          onChange={value => update({ brightness: value })} />
        <View style={styles.colorHexRow}>
          <Text style={styles.fieldLabel}>HEX COLOR</Text>
          <TextInput accessibilityLabel="Custom accent hex color" value={hex} onChangeText={value => {
            const next = value.startsWith('#') ? value : `#${value}`;
            setHex(next.toUpperCase());
            if (HEX_COLOR_PATTERN.test(next)) setHsv(hexToHsv(next));
          }} autoCapitalize="characters" autoCorrect={false} maxLength={7} style={styles.colorHexInput} />
        </View>
        {!valid && <Text accessibilityRole="alert" style={styles.errorText}>Enter six hex digits, for example #7C4DAD.</Text>}
        <AppButton label="Apply custom color" disabled={!valid} onPress={() => { setCustomAccent(hex); setEditing(false); }} />
        <AppButton label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
      </View>}
    </View>
  );
}
