// features/dreams/galaxy/star-info-card.tsx
// Info card modal: metadata display with photo privacy.
// Photo loads only on explicit user tap. Graceful unavailable fallback.

import { useState, useCallback } from 'react';
import {
  Modal,
  Text,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Sp, R } from '../tokens';
import type { GalaxyStar } from './galaxy-geometry';

interface Props {
  star: GalaxyStar;
  onClose: () => void;
}

export function StarInfoCard({ star, onClose }: Props) {
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const handleViewPhoto = useCallback(() => {
    setShowPhoto(true);
    setPhotoError(false);
  }, []);

  const handlePhotoError = useCallback(() => {
    setPhotoError(true);
  }, []);

  const hasPhoto = star.completionPhotoUri != null && star.completionPhotoUri.length > 0;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Card surface — stop propagation so taps inside do not dismiss */}
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close star info"
          >
            <Ionicons name="close-circle" size={22} color={Palette.red} />
          </TouchableOpacity>

          {/* Star label */}
          <Text style={styles.label} accessibilityRole="header">
            {star.label}
          </Text>

          {/* Nebula */}
          <View style={styles.row}>
            <Text style={styles.metaIcon}>{star.constellationIcon}</Text>
            <Text style={styles.meta}>{star.constellationName}</Text>
          </View>

          {/* Date */}
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Completed</Text>
            <Text style={styles.meta}>{star.completionDate}</Text>
          </View>

          {/* Week */}
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Week</Text>
            <Text style={styles.meta}>{star.weekLabel}</Text>
          </View>

          {/* Coins */}
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Coins earned</Text>
            <Text style={styles.meta}>{star.coinsEarned}</Text>
          </View>

          {/* Photo section */}
          <View style={styles.photoSection}>
            {hasPhoto ? (
              <>
                {!showPhoto ? (
                  <TouchableOpacity
                    style={styles.viewPhotoBtn}
                    onPress={handleViewPhoto}
                    accessibilityRole="button"
                    accessibilityLabel="View completion photo"
                  >
                    <Ionicons name="camera-outline" size={16} color={Palette.warmDim} />
                    <Text style={styles.viewPhotoText}>View photo</Text>
                  </TouchableOpacity>
                ) : photoError ? (
                  <Text style={styles.photoUnavailable}>Photo unavailable</Text>
                ) : (
                  <Image
                    source={{ uri: star.completionPhotoUri }}
                    style={styles.photo}
                    onError={handlePhotoError}
                    accessibilityLabel="Completion photo"
                  />
                )}
              </>
            ) : (
              <Text style={styles.photoUnavailable}>Photo unavailable</Text>
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
    backgroundColor: Palette.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sp.lg,
  },
  card: {
    backgroundColor: Palette.bgRaised,
    borderWidth: 1,
    borderColor: Palette.gray,
    borderRadius: R.md,
    padding: Sp.sm,
    width: '100%',
    maxWidth: 280,
  },
  closeBtn: {
    position: 'absolute',
    top: Sp.sm,
    right: Sp.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    color: Palette.warmWhite,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: Sp.sm,
    paddingRight: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sp.xs,
    marginBottom: 4,
  },
  metaLabel: {
    color: Palette.warmMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 90,
  },
  meta: {
    color: Palette.warmDim,
    fontSize: 13,
    fontWeight: '600',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  photoSection: {
    marginTop: Sp.sm,
    paddingTop: Sp.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.gray,
    alignItems: 'center',
  },
  viewPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sp.xs,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: Palette.gray,
    backgroundColor: Palette.bgElevated,
    minHeight: 44,
  },
  viewPhotoText: {
    color: Palette.warmDim,
    fontSize: 13,
    fontWeight: '700',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: R.sm,
  },
  photoUnavailable: {
    color: Palette.warmMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
