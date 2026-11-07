import { SectionHeading } from '@/components/section-heading';
import { boxStyle } from '@/theme/boxes';
import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionButton, ButtonIcon, ButtonLabel } from '@/components/app-controls';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { AppSheet } from '@/components/app-sheet';
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
  const styles = useThemedStyles(themedStyles);
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [excluding, setExcluding] = useState(false);
  const [excludeError, setExcludeError] = useState(false);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
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
      onClose();
    } catch {
      setExcluding(false);
      setExcludeError(true);
    }
  };

  return (
    <AppSheet visible={pinned} onDismiss={onClose} title="Completed task">
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <SectionHeading>Completion record</SectionHeading>
            <SectionHeading>{star.label}</SectionHeading>
            <Text style={styles.date}>Completed {formatCompletionDate(star.completionDate)}</Text>

            <AppBox variant="media" style={styles.photoFrame}>
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
                  <SectionHeading>
                    {photoUnavailable ? 'Photo unavailable' : 'No completion photo'}
                  </SectionHeading>
                  <Text style={styles.photoEmptyText}>
                    {photoUnavailable ? 'This image could not be loaded.' : 'This task was completed without an image.'}
                  </Text>
                </View>
              )}
              <AppBox variant="badge" style={styles.photoLabel}>
                <Ionicons name="camera-outline" size={13} color={GalaxyPalette.textDim} />
                <Text style={styles.photoLabelText}>TASK PROOF</Text>
              </AppBox>
            </AppBox>

            <AppBox variant="inset" padding="sm" style={styles.rewardRow}>
              <View style={[styles.rewardIcon, { backgroundColor: `${star.domainColor}18` }]}>
                <Ionicons name="sparkles" size={16} color={star.domainColor} />
              </View>
              <View style={styles.rewardCopy}>
                <SectionHeading>REWARD EARNED</SectionHeading>
                <Text style={styles.rewardValue}>+{star.coinsEarned} coins</Text>
              </View>
              <Text style={styles.recordNumber}>#{String(star.completionOrder + 1).padStart(2, '0')}</Text>
            </AppBox>

            <View style={styles.footer}>
              {confirmExclude ? (
                <>
                  <View style={styles.confirmCopy}>
                    <SectionHeading>{excludeError ? 'Could not exclude' : 'Exclude this task?'}</SectionHeading>
                    <Text style={styles.confirmHint}>{excludeError ? 'Please try again.' : 'The task and coins stay safe.'}</Text>
                  </View>
                  <View style={styles.confirmActions}>
                    <ActionButton

                      onPress={() => { setConfirmExclude(false); setExcludeError(false); }}
                      disabled={excluding}
                    >
                      <ButtonLabel>Keep</ButtonLabel>
                    </ActionButton>
                    <ActionButton variant="destructive"

                      onPress={() => { void handleExclude(); }}
                      disabled={excluding}
                    >
                      <ButtonLabel>{excluding ? 'Excluding…' : 'Exclude'}</ButtonLabel>
                    </ActionButton>
                  </View>
                </>
              ) : (
                <ActionButton variant="destructive"

                  onPress={() => setConfirmExclude(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Exclude ${star.label} from Sky Observer`}
                  accessibilityHint="Keeps the task and reward, but removes this node from the archive"
                >
                  <ButtonIcon name="eye-off-outline" size={17} />
                  <ButtonLabel>Exclude from Sky Observer</ButtonLabel>
                </ActionButton>
              )}
            </View>
          </ScrollView>
    </AppSheet>
  );
}

const themedStyles = createEditorialStyles(() => ({
  drawerRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: GalaxyPalette.backdrop },
  card: { ...boxStyle(GalaxyPalette, { variant: 'dialog', padding: 'none' }), width: '100%', maxWidth: 760, maxHeight: '88%', alignSelf: 'center', overflow: 'hidden' },
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
  photoFrame: { position: 'relative', aspectRatio: 16 / 9, maxHeight: 220, overflow: 'hidden', marginTop: 17 },
  photo: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  photoEmptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  photoEmptyTitle: { color: GalaxyPalette.textDim, fontSize: 13, fontWeight: '800', marginTop: 10 },
  photoEmptyText: { color: GalaxyPalette.textMuted, fontSize: 11, lineHeight: 16, fontWeight: '600', textAlign: 'center', marginTop: 3 },
  photoLabel: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  photoLabelText: { color: GalaxyPalette.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  rewardRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  rewardIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  rewardCopy: { flex: 1 },
  rewardLabel: { color: GalaxyPalette.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.75 },
  rewardValue: { color: GalaxyPalette.text, fontSize: 13, fontWeight: '800', marginTop: 3 },
  recordNumber: { color: GalaxyPalette.textMuted, fontSize: 11, fontWeight: '800' },
  footer: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: GalaxyPalette.border },
  confirmCopy: { flex: 1 },
  confirmTitle: { color: GalaxyPalette.text, fontSize: 12, fontWeight: '800' },
  confirmHint: { color: GalaxyPalette.textMuted, fontSize: 10, fontWeight: '600', marginTop: 3 },
  confirmActions: { flexDirection: 'row', gap: 7 },
  disabled: { opacity: 0.55 },
}));
