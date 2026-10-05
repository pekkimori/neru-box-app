import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionPressable } from '@/components/motion';
import { useDraggableDrawer } from '@/hooks/useDraggableDrawer';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { GalaxyPalette } from './galaxy-theme';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { ServerPhoto } from '../connected/server-photo';

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
  const styles = useThemedStyles(themedStyles);
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [excluding, setExcluding] = useState(false);
  const [excludeError, setExcludeError] = useState(false);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
  const { backdropStyle, closeDrawer, panGesture, sheetStyle } = useDraggableDrawer({
    visible: pinned,
    onClose,
  });
  const [wasPinned, setWasPinned] = useState(pinned);
  if (wasPinned !== pinned) {
    setWasPinned(pinned);
    if (!pinned) {
      setConfirmExclude(false);
      setExcludeError(false);
      setPhotoUnavailable(false);
    }
  }

  if (!pinned) return null;

  const handleExclude = async () => {
    setExcluding(true);
    setExcludeError(false);
    try {
      await onExclude();
      closeDrawer();
    } catch {
      setExcluding(false);
      setExcludeError(true);
    }
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeDrawer}
    >
      <GestureHandlerRootView style={styles.drawerRoot}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
            accessibilityRole="button"
            accessibilityLabel="Close completed task details"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            sheetStyle,
            {
              paddingBottom: Math.max(18, insets.bottom + 10),
            },
          ]}
          accessibilityViewIsModal
        >
          <GestureDetector gesture={panGesture}>
            <View collapsable={false} style={styles.dragArea}>
              <View style={styles.grabArea}><View style={styles.handle} /></View>
              <View style={styles.heading}>
                <View style={styles.headingCopy}>
                  <Text style={styles.eyebrow}>COMPLETED TASK</Text>
                  <View style={styles.domainRow}>
                    <View style={[styles.domainDot, { backgroundColor: star.domainColor }]} />
                    <Text style={[styles.domain, { color: star.domainColor }]}>{star.constellationName}</Text>
                  </View>
                </View>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{star.label}</Text>
            <Text style={styles.date}>Completed {formatCompletionDate(star.completionDate)}</Text>

            <View style={styles.photoFrame}>
              {star.completionPhotoUri?.startsWith('/tasks/') ? <ServerPhoto uri={star.completionPhotoUri} label={`Completion photo for ${star.label}`} style={styles.photo} /> : star.completionPhotoUri && !photoUnavailable ? (
                <Image
                  source={{ uri: star.completionPhotoUri }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={180}
                  onError={() => setPhotoUnavailable(true)}
                  accessibilityLabel={`Completion photo for ${star.label}`}
                />
              ) : (
                <View style={styles.photoEmpty}>
                  <View style={[styles.photoEmptyIcon, { backgroundColor: `${star.domainColor}18` }]}>
                    <Ionicons name="image-outline" size={25} color={star.domainColor} />
                  </View>
                  <Text style={styles.photoEmptyTitle}>
                    {photoUnavailable ? 'Photo unavailable' : 'No completion photo'}
                  </Text>
                  <Text style={styles.photoEmptyText}>
                    {photoUnavailable ? 'This image could not be loaded.' : 'This task was completed without an image.'}
                  </Text>
                </View>
              )}
              <View style={styles.photoLabel}>
                <Ionicons name="camera-outline" size={13} color={GalaxyPalette.textDim} />
                <Text style={styles.photoLabelText}>TASK PROOF</Text>
              </View>
            </View>

            <View style={styles.rewardRow}>
              <View style={[styles.rewardIcon, { backgroundColor: `${star.domainColor}18` }]}>
                <Ionicons name="sparkles" size={16} color={star.domainColor} />
              </View>
              <View style={styles.rewardCopy}>
                <Text style={styles.rewardLabel}>REWARD EARNED</Text>
                <Text style={styles.rewardValue}>+{star.coinsEarned} coins</Text>
              </View>
              <Text style={styles.recordNumber}>#{String(star.completionOrder + 1).padStart(2, '0')}</Text>
            </View>

            <View style={styles.footer}>
              {confirmExclude ? (
                <>
                  <View style={styles.confirmCopy}>
                    <Text style={styles.confirmTitle}>{excludeError ? 'Could not exclude' : 'Exclude this task?'}</Text>
                    <Text style={styles.confirmHint}>{excludeError ? 'Please try again.' : 'The task and coins stay safe.'}</Text>
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
                <MotionPressable
                  style={styles.excludeButton}
                  onPress={() => setConfirmExclude(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Exclude ${star.label} from Sky Observer`}
                  accessibilityHint="Keeps the task and reward, but removes this node from the archive"
                >
                  <Ionicons name="eye-off-outline" size={17} color="#F0A0AE" />
                  <Text style={styles.excludeText}>Exclude from Sky Observer</Text>
                </MotionPressable>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const themedStyles = createEditorialStyles(() => ({
  drawerRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: GalaxyPalette.backdrop },
  card: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '88%',
    alignSelf: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: GalaxyPalette.translucentSurface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.48,
    shadowRadius: 30,
    elevation: 18,
  },
  dragArea: { borderBottomWidth: 1, borderBottomColor: GalaxyPalette.border, backgroundColor: GalaxyPalette.surfaceRaised },
  grabArea: { height: 44, justifyContent: 'center' },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: GalaxyPalette.border },
  heading: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { flexShrink: 1, color: GalaxyPalette.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  domainRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  domainDot: { width: 7, height: 7, borderRadius: 4 },
  domain: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.75 },
  content: { flexShrink: 1 },
  contentContainer: { paddingHorizontal: 20 },
  title: { color: GalaxyPalette.text, fontSize: 24, lineHeight: 29, fontWeight: '800', marginTop: 18 },
  date: { color: GalaxyPalette.textMuted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  photoFrame: { position: 'relative', aspectRatio: 16 / 9, maxHeight: 220, overflow: 'hidden', marginTop: 17, borderRadius: 14, borderWidth: 1, borderColor: GalaxyPalette.border, backgroundColor: GalaxyPalette.photoSurface },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  photoEmptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  photoEmptyTitle: { color: GalaxyPalette.textDim, fontSize: 13, fontWeight: '800', marginTop: 10 },
  photoEmptyText: { color: GalaxyPalette.textMuted, fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'center', marginTop: 3 },
  photoLabel: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: GalaxyPalette.proofLabel },
  photoLabelText: { color: GalaxyPalette.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  rewardRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: GalaxyPalette.border, backgroundColor: GalaxyPalette.subtleFill },
  rewardIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  rewardCopy: { flex: 1 },
  rewardLabel: { color: GalaxyPalette.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.75 },
  rewardValue: { color: GalaxyPalette.text, fontSize: 13, fontWeight: '800', marginTop: 3 },
  recordNumber: { color: GalaxyPalette.textMuted, fontSize: 11, fontWeight: '800' },
  footer: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: GalaxyPalette.border },
  excludeButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,113,133,0.28)', backgroundColor: 'rgba(251,113,133,0.075)' },
  excludeText: { color: '#F0A0AE', fontSize: 12, fontWeight: '800' },
  confirmCopy: { flex: 1 },
  confirmTitle: { color: GalaxyPalette.text, fontSize: 12, fontWeight: '800' },
  confirmHint: { color: GalaxyPalette.textMuted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  confirmActions: { flexDirection: 'row', gap: 7 },
  keepButton: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: GalaxyPalette.border },
  keepText: { color: GalaxyPalette.textDim, fontSize: 11, fontWeight: '800' },
  confirmButton: { minWidth: 82, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, backgroundColor: '#BE123C' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  disabled: { opacity: 0.55 },
}));
