import { AppBox } from '@/components/app-box';
import { ActionRow, ButtonIcon, IconButton } from '@/components/app-controls';
import { SectionHeading } from '@/components/section-heading';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { previewInteractionSoundSet, stopInteractionSoundPreview } from '@/utils/interaction-feedback';
import { isSoundSetId, SOUND_SETS, type AudibleSoundSetId, type SoundSetId } from '@/utils/sound-sets';
import { configurationStyles } from './styles';

export function SoundSettings() {
  const { appearance } = useAppTheme();
  const selectedId = isSoundSetId(appearance.soundSet) ? appearance.soundSet : 'classic';
  return <SoundSetOptions key={selectedId} selectedId={selectedId} />;
}

function SoundSetOptions({ selectedId }: { selectedId: SoundSetId }) {
  const { colors, setSoundSet, error, loaded } = useAppTheme();
  const styles = useThemedStyles(configurationStyles);
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
    <View style={styles.section}>
      <SectionHeading>Sound effects</SectionHeading>
      <AppBox variant="group" style={styles.soundList} accessibilityRole="radiogroup" accessibilityLabel="Sound effect set">
        {SOUND_SETS.map((set, index) => {
          const selected = selectedId === set.id;
          const playing = previewing === set.id;
          return (
            <View key={set.id} style={[styles.soundOption, index> 0 && styles.soundOptionBorder, selected && styles.soundOptionActive]}>
                <ActionRow accessibilityRole="radio" aria-checked={selected} accessibilityState={{ checked: selected, disabled: !loaded || !!error }}
                accessibilityLabel={`${set.label}. ${set.description}`} disabled={!loaded || !!error}
                onPress={() => { stopPreview(); setSoundSet(set.id); }} style={styles.soundSelect}>
                <Ionicons name={set.icon} size={20} color={selected ? colors.accent : colors.secondary} />
                <View style={styles.soundCopy}>
                  <Text style={styles.accentName}>{set.label}</Text>
                  <Text style={styles.soundDescription}>{set.description}</Text>
                </View>
                {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
              </ActionRow>
              {set.id !== 'silent' && <IconButton variant="ghost" selected={playing} accessibilityRole="button"
                accessibilityLabel={`${playing ? 'Stop' : 'Preview'} ${set.label} sounds`}
                accessibilityState={{ busy: playing }} onPress={() => { void preview(set.id); }}
                >
                <ButtonIcon name={playing ? 'stop' : 'play'} size={16} />
              </IconButton>}
              {set.id === 'silent' && <View style={styles.soundPreviewSpace} />}
            </View>
          );
        })}
        {previewError ? <Text accessibilityRole="alert" style={[styles.errorText, { padding: 12 }]}>{previewError}</Text> : null}
      </AppBox>
    </View>
  );
}
