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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import { Sp, R } from '../../features/tasks/tokens';
import { hideGalaxyStar, loadGalaxyStars } from '../../features/tasks/galaxy/galaxy-loader';
import { GalaxyCanvas } from '../../features/tasks/galaxy/galaxy-canvas';
import { GalaxyEntrance } from '../../features/tasks/galaxy/galaxy-entrance';
import { GalaxyListView } from '../../features/tasks/galaxy/galaxy-list-view';
import { GalaxyPalette } from '../../features/tasks/galaxy/galaxy-theme';
import type { GalaxyDomain, GalaxyStar } from '../../features/tasks/galaxy/galaxy-geometry';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';

export default function GalaxyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appearance } = useAppTheme();
  const styles = useThemedStyles(themedStyles);

  const [stars, setStars] = useState<GalaxyStar[]>([]);
  const [domains, setDomains] = useState<GalaxyDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    loadGalaxyStars().then((result) => {
      if (!cancelled) {
        setStars(result.stars);
        setDomains(result.domains);
        setPartialError(result.partialError);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleEntranceReveal = useCallback(() => setSceneRevealed(true), []);
  const handleEntranceFinish = useCallback(() => {
    setSceneRevealed(true);
    setEntranceVisible(false);
  }, []);
  const handleExcludeStar = useCallback(async (star: GalaxyStar) => {
    await hideGalaxyStar(star);
    const result = await loadGalaxyStars();
    setStars(result.stars);
    setDomains(result.domains);
    setPartialError(result.partialError);
  }, []);

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
        {readyToShow && stars.length === 0 ? (
          <Animated.View
            style={styles.emptyState}
            entering={FadeIn.duration(520).reduceMotion(ReduceMotion.System)}
          >
            <View style={styles.emptyOrbit}>
              <View style={styles.emptyRing} />
              <View style={styles.emptyDot} />
            </View>
            <Text style={styles.emptyTitle}>Your universe is waiting.</Text>
            <Text style={styles.emptyText}>Complete your first star to see it here.</Text>
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Return to Observatory"
            >
              <Ionicons name="arrow-back" size={16} color={GalaxyPalette.textDim} />
              <Text style={styles.returnText}>Return to Observatory</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : readyToShow ? (
          <View style={styles.archive}>
            {/* Top bar: back + toggle */}
            <Animated.View
              style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}
              entering={FadeInDown.duration(520).reduceMotion(ReduceMotion.System)}
            >
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Return to Observatory"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={22} color={GalaxyPalette.textDim} />
              </TouchableOpacity>

              <View style={styles.heading}>
                <Text style={styles.eyebrow}>SKY OBSERVER</Text>
                <Text style={styles.title}>Archive</Text>
              </View>

              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, !listView && styles.toggleActive]}
                  onPress={() => setListView(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to network view"
                  accessibilityState={{ selected: !listView }}
                >
                  <Ionicons name="git-network-outline" size={16} color={!listView ? GalaxyPalette.text : GalaxyPalette.textMuted} />
                  <Text style={[styles.toggleText, !listView && styles.toggleTextActive]}>Network</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, listView && styles.toggleActive]}
                  onPress={() => setListView(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to list view"
                  accessibilityState={{ selected: listView }}
                >
                  <Ionicons name="list-outline" size={16} color={listView ? GalaxyPalette.text : GalaxyPalette.textMuted} />
                  <Text style={[styles.toggleText, listView && styles.toggleTextActive]}>List</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Partial error banner */}
            {partialError && (
              <View style={styles.banner}>
                <Ionicons name="warning-outline" size={14} color={GalaxyPalette.textDim} />
                <Text style={styles.bannerText}>Some older entries could not be loaded.</Text>
                <TouchableOpacity
                  onPress={() => setPartialError(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss warning"
                  accessibilityState={{ disabled: false }}
                  style={styles.dismissBtn}
                >
                  <Ionicons name="close" size={16} color={GalaxyPalette.textDim} />
                </TouchableOpacity>
              </View>
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
  returnBtn: { flexDirection: 'row', alignItems: 'center', gap: Sp.xs, alignSelf: 'center', marginTop: Sp.lg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.sm, borderWidth: 1, borderColor: GalaxyPalette.border, minHeight: 44 },
  returnText: { color: GalaxyPalette.textDim, fontSize: 14, fontWeight: '800' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: Sp.sm, borderBottomWidth: 1, borderBottomColor: GalaxyPalette.border },
  backBtn: { width: 44, height: 44, borderRadius: R.full, backgroundColor: GalaxyPalette.surface, borderWidth: 1, borderColor: GalaxyPalette.border, alignItems: 'center', justifyContent: 'center' },
  heading: { justifyContent: 'center', flexShrink: 1 },
  eyebrow: { color: GalaxyPalette.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: GalaxyPalette.text, fontSize: 19, lineHeight: 22, fontWeight: '800' },
  toggle: { flexDirection: 'row', gap: Sp.xs, marginLeft: 'auto' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: R.sm, borderWidth: 1, borderColor: GalaxyPalette.border, backgroundColor: GalaxyPalette.surface, minHeight: 44 },
  toggleActive: { borderColor: GalaxyPalette.textMuted, backgroundColor: GalaxyPalette.surfaceRaised },
  toggleText: { color: GalaxyPalette.textMuted, fontSize: 12, fontWeight: '800' },
  toggleTextActive: { color: GalaxyPalette.text },

  banner: { flexDirection: 'row', alignItems: 'center', gap: Sp.xs, paddingHorizontal: Sp.sm, paddingVertical: Sp.xs, backgroundColor: GalaxyPalette.surface, borderBottomWidth: 1, borderBottomColor: GalaxyPalette.border, minHeight: 44 },
  bannerText: { color: GalaxyPalette.textDim, fontSize: 12, fontWeight: '600', flex: 1 },
  dismissBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
