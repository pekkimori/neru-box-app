import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { previewInteractionSoundSet, stopInteractionSoundPreview } from '@/utils/interaction-feedback';
import { isSoundSetId, SOUND_SETS, type AudibleSoundSetId, type SoundSetId } from '@/utils/sound-sets';
import { SectionLabel } from './components';
import { controlStyles } from './styles';

export function SoundSettings() {
  const { appearance } = useAppTheme();
  const selectedId = isSoundSetId(appearance.soundSet) ? appearance.soundSet : 'classic';
  return <SoundSetOptions key={selectedId} selectedId={selectedId} />;
}

function SoundSetOptions({ selectedId }: { selectedId: SoundSetId }) {
  const { colors, setSoundSet, error, loaded } = useAppTheme();
  const styles = useThemedStyles(controlStyles);
  const [previewing, setPreviewing] = useState<AudibleSoundSetId | null>(null);
  const [previewError, setPreviewError] = useState('');
  const previewVersion = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPreview = () => {
    previewVersion.current += 1;
    if (timer.current) clearTimeout(timer.current);
    stopInteractionSoundPreview();
    setPreviewing(null);
  };
  useEffect(() => () => {
    previewVersion.current += 1;
    if (timer.current) clearTimeout(timer.current);
    stopInteractionSoundPreview();
  }, []);

  const preview = async (id: AudibleSoundSetId) => {
    if (previewing === id) { stopPreview(); return; }
    stopPreview();
    const version = previewVersion.current;
    setPreviewing(id);
    setPreviewError('');
    const played = await previewInteractionSoundSet(id);
    if (version !== previewVersion.current) return;
    if (!played) {
      setPreviewing(null);
      setPreviewError('Could not play the preview. Please try again.');
      return;
    }
    timer.current = setTimeout(() => setPreviewing(null), 1_300);
  };

  return (
    <>
      <SectionLabel>Sound effects</SectionLabel>
      <View style={styles.soundList} accessibilityRole="radiogroup" accessibilityLabel="Sound effect set">
        {SOUND_SETS.map((set, index) => {
          const selected = selectedId === set.id;
          const playing = previewing === set.id;
          return (
            <View key={set.id} style={[styles.soundOption, index > 0 && styles.soundOptionBorder, selected && styles.soundOptionActive]}>
                <Pressable accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, disabled: !loaded || !!error }}
                accessibilityLabel={`${set.label}. ${set.description}`} disabled={!loaded || !!error}
                onPress={() => { stopPreview(); setSoundSet(set.id); }} style={styles.soundSelect}>
                <Ionicons name={set.icon} size={20} color={selected ? colors.accent : colors.secondary} />
                <View style={styles.soundCopy}>
                  <Text style={styles.accentName}>{set.label}</Text>
                  <Text numberOfLines={1} style={styles.soundDescription}>{set.description}</Text>
                </View>
                {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </Pressable>
              {set.id !== 'silent' && <Pressable accessibilityRole="button"
                accessibilityLabel={`${playing ? 'Stop' : 'Preview'} ${set.label} sounds`}
                accessibilityState={{ busy: playing }} onPress={() => { void preview(set.id); }}
                style={[styles.soundPreview, playing && styles.soundPreviewActive]}>
                <Ionicons name={playing ? 'stop' : 'play'} size={16} color={colors.accent} />
              </Pressable>}
            </View>
          );
        })}
        {previewError ? <Text accessibilityRole="alert" style={[styles.errorText, { padding: 12 }]}>{previewError}</Text> : null}
      </View>
    </>
  );
}
