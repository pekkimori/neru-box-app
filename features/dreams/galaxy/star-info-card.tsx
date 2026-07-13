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
import { Sp, R } from '../tokens';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { GalaxyPalette } from './galaxy-theme';

interface Props {
  star: GalaxyStar;
  onClose: () => void;
  onDelete: (star: GalaxyStar) => Promise<void>;
}

export function StarInfoCard({ star, onClose, onDelete }: Props) {
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleViewPhoto = useCallback(() => {
    setShowPhoto(true);
    setPhotoError(false);
  }, []);

  const handlePhotoError = useCallback(() => {
    setPhotoError(true);
  }, []);

  const hasPhoto = star.completionPhotoUri != null && star.completionPhotoUri.length > 0;

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(false);
    try {
      await onDelete(star);
    } catch {
      setDeleting(false);
      setDeleteError(true);
    }
  }, [onDelete, star]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Card surface — stop propagation so taps inside do not dismiss */}
        <Pressable style={[styles.card, { borderTopColor: star.domainColor }]} onPress={(event) => event.stopPropagation()}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close star info"
          >
            <Ionicons name="close-circle" size={22} color={GalaxyPalette.textDim} />
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
            <Text style={styles.meta}>{formatCompletionDate(star.completionDate)}</Text>
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
                    <Ionicons name="camera-outline" size={16} color={GalaxyPalette.textDim} />
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

          <View style={styles.deleteSection}>
            {confirmDelete ? (
              <>
                <Text style={styles.deleteQuestion}>Remove this node from Archive?</Text>
                <Text style={styles.deleteHint}>The original task and earned coins will stay unchanged.</Text>
                {deleteError && <Text style={styles.deleteError}>Could not delete the node. Try again.</Text>}
                <View style={styles.deleteActions}>
                  <TouchableOpacity
                    style={styles.cancelDeleteBtn}
                    onPress={() => { setConfirmDelete(false); setDeleteError(false); }}
                    disabled={deleting}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel node deletion"
                  >
                    <Text style={styles.cancelDeleteText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmDeleteBtn, deleting && styles.deleteBtnDisabled]}
                    onPress={handleDelete}
                    disabled={deleting}
                    accessibilityRole="button"
                    accessibilityLabel={`Permanently remove ${star.label} from Archive`}
                  >
                    <Text style={styles.confirmDeleteText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setConfirmDelete(true)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${star.label} node`}
              >
                <Ionicons name="trash-outline" size={16} color="#FB7185" />
                <Text style={styles.deleteBtnText}>Delete node</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(6, 8, 12, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sp.lg,
  },
  card: {
    backgroundColor: GalaxyPalette.surface,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
    borderTopWidth: 3,
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
    color: GalaxyPalette.text,
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
    color: GalaxyPalette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 90,
  },
  meta: {
    color: GalaxyPalette.textDim,
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
    borderTopColor: GalaxyPalette.border,
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
    borderColor: GalaxyPalette.border,
    backgroundColor: GalaxyPalette.surfaceRaised,
    minHeight: 44,
  },
  viewPhotoText: {
    color: GalaxyPalette.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: R.sm,
  },
  photoUnavailable: {
    color: GalaxyPalette.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteSection: {
    marginTop: Sp.sm,
    paddingTop: Sp.sm,
    borderTopWidth: 1,
    borderTopColor: GalaxyPalette.border,
  },
  deleteBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Sp.xs,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.35)',
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
  },
  deleteBtnText: { color: '#FB7185', fontSize: 13, fontWeight: '800' },
  deleteQuestion: { color: GalaxyPalette.text, fontSize: 13, fontWeight: '800' },
  deleteHint: { color: GalaxyPalette.textMuted, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 3 },
  deleteError: { color: '#FB7185', fontSize: 11, fontWeight: '700', marginTop: 6 },
  deleteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Sp.xs, marginTop: Sp.sm },
  cancelDeleteBtn: {
    minWidth: 74,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: GalaxyPalette.border,
  },
  cancelDeleteText: { color: GalaxyPalette.textDim, fontSize: 12, fontWeight: '800' },
  confirmDeleteBtn: {
    minWidth: 82,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.sm,
    backgroundColor: '#BE123C',
  },
  deleteBtnDisabled: { opacity: 0.55 },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
