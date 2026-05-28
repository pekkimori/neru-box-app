import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';

import { CandyButton } from './CandyButton';

type PhotoCompletionModalProps = {
  visible: boolean;
  taskLabel: string;
  onComplete: (photoUri: string) => void;
  onCancel: () => void;
};

type ModalStep = 'choose' | 'preview' | 'processing' | 'success';

export function PhotoCompletionModal({
  visible,
  taskLabel,
  onComplete,
  onCancel,
}: PhotoCompletionModalProps) {
  const [step, setStep] = useState<ModalStep>('choose');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const processingAnim = useRef(new Animated.Value(0)).current;
  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setStep('choose');
    setPhotoUri(null);
    processingAnim.setValue(0);
    if (processingTimer.current) {
      clearTimeout(processingTimer.current);
      processingTimer.current = null;
    }
  };

  useEffect(() => {
    if (!visible) {
      // Clean up on close
      reset();
    }
  }, [visible]);

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setStep('preview');
    }
  };

  const handleUploadFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Gallery permission is required to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setStep('preview');
    }
  };

  const handleProcess = () => {
    if (!photoUri) return;

    setStep('processing');

    Animated.timing(processingAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    processingTimer.current = setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onComplete(photoUri);
        reset();
      }, 400);
    }, 1500);
  };

  const handleRetake = () => {
    setStep('choose');
    setPhotoUri(null);
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  const progressWidth = processingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
        >
          {step === 'choose' && (
            <>
              <View style={styles.header}>
                <Ionicons name="camera" size={24} color={CandyColors.lavenderDeep} />
                <View style={styles.headerText}>
                  <Text style={styles.title}>Complete Task</Text>
                  <Text style={styles.taskName} numberOfLines={2}>
                    {taskLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Add a photo to mark this task as done
              </Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTakePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo with camera"
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="camera" size={32} color={CandyColors.lavenderDeep} />
                  </View>
                  <Text style={styles.optionLabel}>Take Photo</Text>
                  <Text style={styles.optionHint}>Use camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleUploadFromGallery}
                  accessibilityRole="button"
                  accessibilityLabel="Upload photo from gallery"
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="images" size={32} color={CandyColors.lavenderDeep} />
                  </View>
                  <Text style={styles.optionLabel}>Upload</Text>
                  <Text style={styles.optionHint}>From gallery</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.skipText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'preview' && photoUri && (
            <>
              <View style={styles.header}>
                <Ionicons name="image" size={24} color={CandyColors.lavenderDeep} />
                <View style={styles.headerText}>
                  <Text style={styles.title}>Confirm Photo</Text>
                  <Text style={styles.taskName} numberOfLines={1}>
                    {taskLabel}
                  </Text>
                </View>
              </View>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
              <View style={styles.previewActions}>
                <CandyButton
                  label="Retake"
                  icon="refresh"
                  variant="secondary"
                  onPress={handleRetake}
                  style={styles.actionButton}
                />
                <CandyButton
                  label="Complete Task"
                  icon="checkmark"
                  onPress={handleProcess}
                  style={styles.actionButton}
                />
              </View>
            </>
          )}

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <View style={styles.processingIconWrap}>
                <ActivityIndicator size="large" color={CandyColors.lavenderDeep} />
              </View>
              <Text style={styles.processingTitle}>Processing photo...</Text>
              <Text style={styles.processingSubtitle}>
                Verifying completion of "{taskLabel}"
              </Text>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: progressWidth },
                  ]}
                />
              </View>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.processingContainer}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={56} color={CandyColors.mint} />
              </View>
              <Text style={styles.successTitle}>Task Completed!</Text>
              <Text style={styles.processingSubtitle}>
                Well done on finishing "{taskLabel}"
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: CandySpacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: CandyColors.white,
    borderWidth: 3,
    borderColor: 'rgba(255, 226, 122, 0.8)',
    padding: CandySpacing.lg,
    gap: CandySpacing.md,
    shadowColor: CandyColors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: CandyColors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  taskName: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 2,
  },
  subtitle: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    gap: CandySpacing.xs,
    backgroundColor: 'rgba(240, 233, 255, 0.64)',
    borderWidth: 2,
    borderColor: '#D8CAFF',
    borderRadius: CandyRadii.lg,
    padding: CandySpacing.md,
    ...CandyShadow.card,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#E9DCF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    color: CandyColors.ink,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  optionHint: {
    color: CandyColors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    color: CandyColors.inkMuted,
    fontWeight: '800',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: CandyRadii.lg,
    backgroundColor: CandyColors.creamDeep,
    borderWidth: 2,
    borderColor: '#D8CAFF',
  },
  previewActions: {
    flexDirection: 'row',
    gap: CandySpacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  processingContainer: {
    alignItems: 'center',
    gap: CandySpacing.md,
    paddingVertical: CandySpacing.lg,
  },
  processingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    color: CandyColors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  successTitle: {
    color: CandyColors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  processingSubtitle: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: CandyRadii.pill,
    backgroundColor: 'rgba(167, 139, 250, 0.14)',
    overflow: 'hidden',
    marginTop: CandySpacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: CandyRadii.pill,
    backgroundColor: CandyColors.lavenderDeep,
  },
});
