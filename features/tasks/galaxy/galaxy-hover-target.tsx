import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/motion';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { GalaxyPalette } from './galaxy-theme';

interface Props {
  targetKey: string;
  star: GalaxyStar;
  x: number;
  y: number;
  canvasW: number;
  canvasH: number;
  pinned: boolean;
  onPin: () => void;
  onClose: () => void;
  onExclude: () => Promise<void>;
  onPopupInteraction: () => void;
}

/** Touch platforms show the same compact record after a node tap. */
export function GalaxyHoverTarget({ star, pinned, onClose, onExclude }: Props) {
  const insets = useSafeAreaInsets();
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [excluding, setExcluding] = useState(false);
  const [excludeError, setExcludeError] = useState(false);

  useEffect(() => {
    if (!pinned) {
      setConfirmExclude(false);
      setExcludeError(false);
    }
  }, [pinned]);

  if (!pinned) return null;

  const handleExclude = async () => {
    setExcluding(true);
    setExcludeError(false);
    try {
      await onExclude();
      onClose();
    } catch {
      setExcluding(false);
      setExcludeError(true);
    }
  };

  return (
    <Modal
      transparent
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              borderColor: `${star.domainColor}55`,
              paddingBottom: Math.max(18, insets.bottom + 10),
            },
          ]}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <View style={[styles.accent, { backgroundColor: star.domainColor }]} />
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ARCHIVE SIGNAL · {String(star.completionOrder + 1).padStart(2, '0')}</Text>
            <MotionPressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close pinned record for ${star.label}`}
            >
              <Ionicons name="close" size={20} color={GalaxyPalette.textDim} />
            </MotionPressable>
          </View>

          <View style={styles.domainRow}>
            <View style={[styles.domainDot, { backgroundColor: star.domainColor }]} />
            <Text style={[styles.domain, { color: star.domainColor }]}>{star.constellationName}</Text>
          </View>
          <Text style={styles.title}>{star.label}</Text>
          <Text style={styles.date}>Captured {formatCompletionDate(star.completionDate)}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>WEEK</Text>
              <Text style={styles.statValue}>{star.isoWeek.split('-')[1]}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>REWARD</Text>
              <Text style={styles.statValue}>+{star.coinsEarned} coins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>MEMORY</Text>
              <Text style={styles.statValue}>{star.completionPhotoUri ? 'Secured' : 'None'}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            {confirmExclude ? (
              <>
                <View style={styles.confirmCopy}>
                  <Text style={styles.confirmTitle}>{excludeError ? 'Could not exclude' : 'Exclude this star?'}</Text>
                  <Text style={styles.confirmHint}>{excludeError ? 'Please try again.' : 'Task and coins stay safe.'}</Text>
                </View>
                <View style={styles.confirmActions}>
                  <MotionPressable
                    style={styles.keepButton}
                    onPress={() => { setConfirmExclude(false); setExcludeError(false); }}
                    disabled={excluding}
                  >
                    <Text style={styles.keepText}>Keep</Text>
                  </MotionPressable>
                  <MotionPressable
                    style={[styles.confirmButton, excluding && styles.disabled]}
                    onPress={() => { void handleExclude(); }}
                    disabled={excluding}
                  >
                    <Text style={styles.confirmButtonText}>{excluding ? 'Excluding…' : 'Exclude'}</Text>
                  </MotionPressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.pinnedHint}>
                  <View style={[styles.pinDot, { backgroundColor: star.domainColor }]} />
                  <Text style={styles.hintText}>Pinned · tap outside to close</Text>
                </View>
                <MotionPressable
                  style={styles.excludeButton}
                  onPress={() => setConfirmExclude(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Exclude ${star.label} from Archive`}
                >
                  <Ionicons name="remove-circle-outline" size={13} color="#CE8794" />
                  <Text style={styles.excludeText}>Exclude</Text>
                </MotionPressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 28,
    paddingBottom: 8,
    backgroundColor: 'rgba(5,7,11,0.46)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    overflow: 'hidden',
    paddingTop: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 22,
    backgroundColor: 'rgba(29,32,39,0.98)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.48,
    shadowRadius: 30,
    elevation: 18,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, marginBottom: 8, borderRadius: 2, backgroundColor: GalaxyPalette.border },
  accent: { position: 'absolute', left: 0, top: 28, bottom: 24, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  heading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { flexShrink: 1, color: GalaxyPalette.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: GalaxyPalette.border, alignItems: 'center', justifyContent: 'center' },
  domainRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  domainDot: { width: 7, height: 7, borderRadius: 4 },
  domain: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.75 },
  title: { color: GalaxyPalette.text, fontSize: 23, lineHeight: 28, fontWeight: '800', marginTop: 10 },
  date: { color: GalaxyPalette.textMuted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 17 },
  stat: { flex: 1, minWidth: 0, minHeight: 58, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11, borderWidth: 1, borderColor: GalaxyPalette.border, backgroundColor: 'rgba(255,255,255,0.025)' },
  statLabel: { color: GalaxyPalette.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.75 },
  statValue: { color: GalaxyPalette.textDim, fontSize: 12, fontWeight: '700', marginTop: 5 },
  footer: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9, marginTop: 15, paddingTop: 11, borderTopWidth: 1, borderTopColor: GalaxyPalette.border },
  pinnedHint: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  pinDot: { width: 6, height: 6, borderRadius: 3 },
  hintText: { flexShrink: 1, color: GalaxyPalette.textMuted, fontSize: 11, fontWeight: '600' },
  excludeButton: { minWidth: 94, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(251,113,133,0.24)', backgroundColor: 'rgba(251,113,133,0.055)' },
  excludeText: { color: '#CE8794', fontSize: 11, fontWeight: '800' },
  confirmCopy: { flex: 1 },
  confirmTitle: { color: GalaxyPalette.text, fontSize: 12, fontWeight: '800' },
  confirmHint: { color: GalaxyPalette.textMuted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  confirmActions: { flexDirection: 'row', gap: 7 },
  keepButton: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: GalaxyPalette.border },
  keepText: { color: GalaxyPalette.textDim, fontSize: 11, fontWeight: '800' },
  confirmButton: { minWidth: 82, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, backgroundColor: '#BE123C' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
