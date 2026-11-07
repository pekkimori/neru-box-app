import { AppBox } from '@/components/app-box';
import { ActionButton, ButtonIcon, ButtonLabel, ChoiceChip, IconButton, TextButton } from '@/components/app-controls';
// app/dreams/galaxy.tsx
// Thin orchestration shell. Loads galaxy data, toggles view mode,
// handles loading/empty/error states. Shared top-bar with back control.

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { Sp } from '../../features/tasks/tokens';
import { hideGalaxyStar, loadServerGalaxyStars } from '../../features/tasks/galaxy/galaxy-loader';
import { GalaxyCanvas } from '../../features/tasks/galaxy/galaxy-canvas';
import { GalaxyEntrance } from '../../features/tasks/galaxy/galaxy-entrance';
import { GalaxyListView } from '../../features/tasks/galaxy/galaxy-list-view';
import { GalaxyPalette } from '../../features/tasks/galaxy/galaxy-theme';
import type { GalaxyDomain, GalaxyStar } from '../../features/tasks/galaxy/galaxy-geometry';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { useAuth } from '@/features/auth/auth-provider';

export default function GalaxyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appearance } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const { client } = useAuth();
  const loadStars = useCallback(() => { if (!client) throw new Error('Sign in to open your archive.'); return loadServerGalaxyStars(client); }, [client]);

  const [stars, setStars] = useState<GalaxyStar[]>([]);
  const [domains, setDomains] = useState<GalaxyDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listView, setListView] = useState(false);
  const [sceneRevealed, setSceneRevealed] = useState(false);
  const [entranceVisible, setEntranceVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!cancelled && reduced) setListView(true);
    });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true); setLoadError(null);
    void loadStars().then((result) => {
      if (!cancelled) {
        setStars(result.stars);
        setDomains(result.domains);
        setPartialError(result.partialError);
        setLoading(false);
      }
    }).catch(cause => { if (!cancelled) { setLoadError(cause instanceof Error ? cause.message : 'Could not load your archive.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [loadStars]));

  const handleBack = useCallback(() => router.back(), [router]);
  const handleEntranceReveal = useCallback(() => setSceneRevealed(true), []);
  const handleEntranceFinish = useCallback(() => {
    setSceneRevealed(true);
    setEntranceVisible(false);
  }, []);
  const handleExcludeStar = useCallback(async (star: GalaxyStar) => {
    if (!client) return;
    await hideGalaxyStar(star, client);
    const result = await loadStars();
    setStars(result.stars);
    setDomains(result.domains);
    setPartialError(result.partialError);
  }, [loadStars, client]);

  const readyToShow = !loading && sceneRevealed;

  return (
    <View style={styles.full}>
      <StatusBar style={appearance.mode === 'dark' ? 'light' : 'dark'} />

      <View
        style={styles.stage}
        pointerEvents={entranceVisible ? 'none' : 'auto'}
        accessibilityElementsHidden={entranceVisible}
        importantForAccessibility={entranceVisible ? 'no-hide-descendants' : 'auto'}
      >
        {loadError && <AppBox variant="notice" style={[styles.banner, { paddingTop: Math.max(insets.top, 12) }]}><Text accessibilityRole="alert" style={styles.bannerText}>{loadError}</Text><TextButton onPress={() => { setLoading(true); void loadStars().then(result => { setStars(result.stars); setDomains(result.domains); setPartialError(result.partialError); setLoadError(null); }).catch(cause => setLoadError(cause instanceof Error ? cause.message : 'Could not load your archive.')).finally(() => setLoading(false)); }} accessibilityRole="button" accessibilityLabel="Retry archive loading"><ButtonLabel>Retry</ButtonLabel></TextButton></AppBox>}
        {readyToShow && stars.length === 0 ? (
          <Animated.View
            style={styles.emptyState}
            entering={FadeIn.duration(520).reduceMotion(ReduceMotion.System)}
          >
            <View style={styles.emptyOrbit}>
              <View style={styles.emptyRing} />
              <View style={styles.emptyDot} />
            </View>
            <Text style={styles.emptyTitle}>{loadError ? 'Your archive could not be loaded.' : 'Your universe is waiting.'}</Text>
            <Text style={styles.emptyText}>Complete your first star to see it here.</Text>
            <ActionButton

              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Return to Observatory"
            >
              <ButtonIcon name="arrow-back" size={16} />
              <ButtonLabel>Return to Observatory</ButtonLabel>
            </ActionButton>
          </Animated.View>
        ) : readyToShow ? (
          <View style={styles.archive}>
            {/* Top bar: back + toggle */}
            <Animated.View
              style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}
              entering={FadeInDown.duration(520).reduceMotion(ReduceMotion.System)}
            >
              <IconButton

                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Return to Observatory"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ButtonIcon name="arrow-back" size={22} />
              </IconButton>

              <View style={styles.heading}>
                <Text style={styles.title}>Archive</Text>
              </View>

              <View style={styles.toggle}>
                <ChoiceChip

                  onPress={() => setListView(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to network view"
                  accessibilityState={{ selected: !listView }}
                >
                  <ButtonIcon name="git-network-outline" size={16} />
                  <ButtonLabel>Network</ButtonLabel>
                </ChoiceChip>

                <ChoiceChip

                  onPress={() => setListView(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to list view"
                  accessibilityState={{ selected: listView }}
                >
                  <ButtonIcon name="list-outline" size={16} />
                  <ButtonLabel>List</ButtonLabel>
                </ChoiceChip>
              </View>
            </Animated.View>

            {/* Partial error banner */}
            {partialError && (
              <AppBox variant="notice" style={styles.banner}>
                <Ionicons name="warning-outline" size={14} color={GalaxyPalette.textDim} />
                <Text style={styles.bannerText}>Some older entries could not be loaded.</Text>
                <IconButton
                  onPress={() => setPartialError(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss warning"
                  accessibilityState={{ disabled: false }}
                >
                  <ButtonIcon name="close" size={16} />
                </IconButton>
              </AppBox>
            )}

            {/* Content */}
            <Animated.View
              key={listView ? 'list' : 'network'}
              style={styles.content}
              entering={FadeIn.duration(entranceVisible ? 620 : 240).reduceMotion(ReduceMotion.System)}
              exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
            >
              {listView ? (
                <GalaxyListView stars={stars} />
              ) : (
                <GalaxyCanvas stars={stars} domains={domains} onStarExclude={handleExcludeStar} />
              )}
            </Animated.View>
          </View>
        ) : null}
      </View>

      {entranceVisible && (
        <GalaxyEntrance
          ready={!loading}
          starCount={stars.length}
          onReveal={handleEntranceReveal}
          onFinish={handleEntranceFinish}
        />
      )}
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  full: { flex: 1, backgroundColor: GalaxyPalette.bg },
  stage: { flex: 1 },
  archive: { flex: 1 },
  content: { flex: 1 },
  emptyState: { flex: 1 },

  emptyOrbit: { alignSelf: 'center', marginTop: 200, width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: GalaxyPalette.border },
  emptyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GalaxyPalette.textDim },
  emptyTitle: { color: GalaxyPalette.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: Sp.lg },
  emptyText: { color: GalaxyPalette.textDim, fontSize: 14, textAlign: 'center', marginTop: Sp.sm },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: Sp.sm, borderBottomWidth: 1, borderBottomColor: GalaxyPalette.border },
  heading: { justifyContent: 'center', flexShrink: 1 },
  title: { color: GalaxyPalette.text, fontSize: 19, lineHeight: 22, fontWeight: '800' },
  toggle: { flexDirection: 'row', gap: Sp.xs, marginLeft: 'auto' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: Sp.xs, borderBottomWidth: 1, borderBottomColor: GalaxyPalette.border, minHeight: 44 },
  bannerText: { color: GalaxyPalette.textDim, fontSize: 12, fontWeight: '600', flex: 1 },
}));
