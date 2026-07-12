// app/dreams/galaxy.tsx
// Thin orchestration shell. Loads galaxy data, toggles view mode,
// handles loading/empty/error states. Shared top-bar with back control.

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette, Sp, R } from '../../features/dreams/tokens';
import { loadGalaxyStars } from '../../features/dreams/galaxy/galaxy-loader';
import { GalaxyCanvas } from '../../features/dreams/galaxy/galaxy-canvas';
import { GalaxyListView } from '../../features/dreams/galaxy/galaxy-list-view';
import { StarInfoCard } from '../../features/dreams/galaxy/star-info-card';
import type { GalaxyStar, GalaxyNebula } from '../../features/dreams/galaxy/galaxy-geometry';

export default function GalaxyScreen() {
  const router = useRouter();

  const [stars, setStars] = useState<GalaxyStar[]>([]);
  const [nebulas, setNebulas] = useState<GalaxyNebula[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialError, setPartialError] = useState(false);
  const [listView, setListView] = useState(false);
  const [selectedStar, setSelectedStar] = useState<GalaxyStar | null>(null);

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
        setNebulas(result.nebulas);
        setPartialError(result.partialError);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleBack = useCallback(() => router.back(), [router]);

  if (loading) {
    return (
      <View style={styles.full}>
        <Text style={styles.loadingText}>Mapping your universe...</Text>
      </View>
    );
  }

  if (stars.length === 0) {
    return (
      <View style={styles.full}>
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
          <Ionicons name="arrow-back" size={16} color={Palette.warmDim} />
          <Text style={styles.returnText}>Return to Observatory</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.full}>
      {/* Top bar: back + toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Return to Observatory"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={Palette.warmDim} />
        </TouchableOpacity>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !listView && styles.toggleActive]}
            onPress={() => setListView(false)}
            accessibilityRole="button"
            accessibilityLabel="Switch to galaxy view"
            accessibilityState={{ selected: !listView }}
          >
            <Ionicons name="grid-outline" size={16} color={!listView ? Palette.red : Palette.warmDim} />
            <Text style={[styles.toggleText, !listView && { color: Palette.red }]}>Galaxy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, listView && styles.toggleActive]}
            onPress={() => setListView(true)}
            accessibilityRole="button"
            accessibilityLabel="Switch to list view"
            accessibilityState={{ selected: listView }}
          >
            <Ionicons name="list-outline" size={16} color={listView ? Palette.red : Palette.warmDim} />
            <Text style={[styles.toggleText, listView && { color: Palette.red }]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Partial error banner */}
      {partialError && (
        <View style={styles.banner}>
          <Ionicons name="warning-outline" size={14} color={Palette.warmDim} />
          <Text style={styles.bannerText}>Some older entries could not be loaded.</Text>
          <TouchableOpacity
            onPress={() => setPartialError(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss warning"
            accessibilityState={{ disabled: false }}
            style={styles.dismissBtn}
          >
            <Ionicons name="close" size={16} color={Palette.warmDim} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {listView ? (
        <GalaxyListView stars={stars} onStarSelect={setSelectedStar} />
      ) : (
        <GalaxyCanvas stars={stars} nebulas={nebulas} onStarSelect={setSelectedStar} />
      )}

      {selectedStar !== null && (
        <StarInfoCard star={selectedStar} onClose={() => setSelectedStar(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: Palette.bg },

  loadingText: { color: Palette.warmDim, fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 260 },

  emptyOrbit: { alignSelf: 'center', marginTop: 200, width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: Palette.violetDim },
  emptyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.warmDim },
  emptyTitle: { color: Palette.warmWhite, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: Sp.lg },
  emptyText: { color: Palette.warmDim, fontSize: 14, textAlign: 'center', marginTop: Sp.sm },
  returnBtn: { flexDirection: 'row', alignItems: 'center', gap: Sp.xs, alignSelf: 'center', marginTop: Sp.lg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, minHeight: 44 },
  returnText: { color: Palette.warmDim, fontSize: 14, fontWeight: '800' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 56, paddingBottom: Sp.xs, gap: Sp.sm },
  backBtn: { width: 44, height: 44, borderRadius: R.full, backgroundColor: Palette.bgRaised, borderWidth: 1, borderColor: Palette.gray, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', gap: Sp.xs, marginLeft: 'auto' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated, minHeight: 44 },
  toggleActive: { borderColor: Palette.red },
  toggleText: { color: Palette.warmDim, fontSize: 13, fontWeight: '800' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: Sp.xs, paddingHorizontal: Sp.sm, paddingVertical: Sp.xs, backgroundColor: Palette.bgElevated, borderBottomWidth: 1, borderBottomColor: Palette.gray, minHeight: 44 },
  bannerText: { color: Palette.warmDim, fontSize: 12, fontWeight: '600', flex: 1 },
  dismissBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
