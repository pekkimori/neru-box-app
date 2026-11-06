import { Ionicons } from '@expo/vector-icons';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { CUSTOM_ACCENT_DEFAULT, getAccentTextColor, HEX_COLOR_PATTERN } from '@/theme/editorial-theme';
import { hexToHsv, hsvToHex, type HsvColor } from './custom-color';
import { controlStyles } from './styles';

export function CustomAccentSettings() {
  const { appearance, colors, setCustomAccent } = useAppTheme();
  const styles = useThemedStyles(controlStyles);
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
      <Pressable accessibilityRole="button" accessibilityLabel="Custom color settings" accessibilityState={{ expanded: editing }}
        onPress={() => {
          if (!editing) { setHsv(hexToHsv(savedColor)); setHex(savedColor); }
          setEditing(!editing);
        }} style={[styles.customAccentOption, selected && styles.accentOptionActive]}>
        <View style={[styles.accentSwatch, { backgroundColor: savedColor }]}>
          <Ionicons name={selected ? 'checkmark' : 'color-palette-outline'} size={18} color={getAccentTextColor(savedColor)} />
        </View>
        <View style={styles.accentCopy}>
          <Text style={styles.accentName}>Custom color</Text>
          <Text style={styles.appearanceDetail}>{selected ? savedColor : 'Make it your own'}</Text>
        </View>
        <Ionicons name={editing ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {editing && <View style={styles.customColorEditor}>
        <Text style={styles.appearanceDetail}>Slide to find your color. Applies to light and dark mode.</Text>
        <View accessibilityLabel={`Color preview ${color}`} style={[styles.colorPreview, { backgroundColor: color }]}>
          <Ionicons name="sparkles-outline" size={24} color={getAccentTextColor(color)} />
          <Text style={[styles.accentName, { color: getAccentTextColor(color), flexShrink: 1 }]}>Your accent · {color}</Text>
        </View>
        <ColorSlider label="Hue" value={hsv.hue / 360} valueText={`${Math.round(hsv.hue)}°`}
          stops={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
          onChange={value => update({ hue: value * 360 })} />
        <ColorSlider label="Saturation" value={hsv.saturation} valueText={`${Math.round(hsv.saturation * 100)}%`}
          stops={[hsvToHex({ ...hsv, saturation: 0 }), hsvToHex({ ...hsv, saturation: 1 })]}
          onChange={value => update({ saturation: value })} />
        <ColorSlider label="Brightness" value={hsv.brightness} valueText={`${Math.round(hsv.brightness * 100)}%`}
          stops={['#000000', hsvToHex({ ...hsv, brightness: 1 })]} onChange={value => update({ brightness: value })} />
        <View style={styles.colorHexRow}>
          <Text style={styles.fieldLabel}>HEX COLOR</Text>
          <TextInput accessibilityLabel="Custom accent hex color" value={hex} onChangeText={value => {
            const next = value.startsWith('#') ? value : `#${value}`;
            setHex(next.toUpperCase());
            if (HEX_COLOR_PATTERN.test(next)) setHsv(hexToHsv(next));
          }} autoCapitalize="characters" autoCorrect={false} maxLength={7} style={styles.colorHexInput} />
        </View>
        {!valid && <Text accessibilityRole="alert" style={styles.errorText}>Enter six hex digits, for example #7C4DAD.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Apply custom color" disabled={!valid}
          accessibilityState={{ disabled: !valid }} style={[styles.primaryButton, !valid && { opacity: 0.5 }]}
          onPress={() => { setCustomAccent(hex); setEditing(false); }}>
          <Text style={styles.primaryButtonText}>Apply custom color</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.pickerDone}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>}
    </View>
  );
}

function ColorSlider({ label, value, valueText, stops, onChange }: {
  label: string; value: number; valueText: string; stops: string[]; onChange: (value: number) => void;
}) {
  const styles = useThemedStyles(controlStyles);
  const id = useId().replace(/:/g, '');
  const width = useRef(1);
  const change = useRef(onChange);
  useLayoutEffect(() => { change.current = onChange; }, [onChange]);
  // PanResponder stores these handlers; refs are read only when a touch occurs.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => change.current(Math.max(0, Math.min(1, event.nativeEvent.locationX / width.current))),
    onPanResponderMove: event => change.current(Math.max(0, Math.min(1, event.nativeEvent.locationX / width.current))),
  }), []);
  return (
    <View>
      <View style={styles.formHeader}>
        <Text style={styles.accentName}>{label}</Text>
        <Text style={styles.appearanceDetail}>{valueText}</Text>
      </View>
      <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100), text: valueText }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => onChange(Math.max(0, Math.min(1, value + (event.nativeEvent.actionName === 'increment' ? 0.01 : -0.01))))}
        {...(Platform.OS === 'web' ? { tabIndex: 0, onKeyDown: (event: { key: string; preventDefault: () => void }) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault();
          onChange(Math.max(0, Math.min(1, value + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 0.01 : -0.01))));
        } } : {})}
        onLayout={event => { width.current = event.nativeEvent.layout.width; }} style={styles.colorSlider}>
        <View pointerEvents="none" style={styles.colorSliderTrack}>
          <Svg width="100%" height="100%">
            <Defs><LinearGradient id={id} x1="0%" x2="100%" y1="0%" y2="0%">
              {stops.map((stop, index) => <Stop key={index} offset={`${index / (stops.length - 1) * 100}%`} stopColor={stop} />)}
            </LinearGradient></Defs>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
          </Svg>
        </View>
        <View pointerEvents="none" style={[styles.colorSliderThumb, { left: `${value * 100}%` }]} />
      </View>
    </View>
  );
}
