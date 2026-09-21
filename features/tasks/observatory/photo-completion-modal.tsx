import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { useThemedStyles } from '@/theme/app-theme';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Palette, R, useTasksPalette } from '@/features/tasks/tokens';
import { persistPhotoProof } from '@/utils/photo-storage';

type PhotoCompletionModalProps = {
  visible: boolean;
  taskLabel: string;
  onComplete: (photoUri: string) => void;
  onCancel: () => void;
};

type ModalStep = 'choose' | 'preview' | 'processing' | 'success';
type PhotoSource = 'camera' | 'gallery';

export function PhotoCompletionModal({
  visible, taskLabel, onComplete, onCancel,
}: PhotoCompletionModalProps) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const [step, setStep] = useState<ModalStep>('choose');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sourceBusy, setSourceBusy] = useState<PhotoSource | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const photoUriRef = useRef<string | null>(null);
  const isUnmountedRef = useRef(false);
  const operationRef = useRef(0);

  useEffect(() => { photoUriRef.current = photoUri; }, [photoUri]);

  useEffect(() => () => {
    isUnmountedRef.current = true;
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    animationRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    operationRef.current += 1;
    setStep('choose');
    setPhotoUri(null);
    setSourceBusy(null);
    progress.setValue(0);
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    animationRef.current?.stop();
    animationRef.current = null;
  }, [progress]);

  const showPermissionAlert = (source: PhotoSource, canAskAgain: boolean) => {
    const label = source === 'camera' ? 'Camera' : 'Photo library';
    Alert.alert(
      `${label} access needed`,
      `Allow ${label.toLowerCase()} access to add photo proof for this task.`,
      canAskAgain || Platform.OS === 'web'
        ? [{ text: 'OK' }]
        : [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => {
                void Linking.openSettings().catch(() => undefined);
              },
            },
          ],
    );
  };

  const handleCamera = async () => {
    if (sourceBusy) return;
    setSourceBusy('camera');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert('camera', permission.canAskAgain);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.back,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setStep('preview');
      }
    } catch {
      Alert.alert('Camera unavailable', 'The camera could not be opened. Try again or choose a photo from your library.');
    } finally {
      if (!isUnmountedRef.current) setSourceBusy(null);
    }
  };

  const handleGallery = async () => {
    if (sourceBusy) return;
    setSourceBusy('gallery');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert('gallery', permission.canAskAgain);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setStep('preview');
      }
    } catch {
      Alert.alert('Photos unavailable', 'Your photo library could not be opened. Try again or use the camera.');
    } finally {
      if (!isUnmountedRef.current) setSourceBusy(null);
    }
  };

  const handleProcess = () => {
    if (!photoUri) return;
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setStep('processing');
    progress.setValue(0);
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: 1350,
      useNativeDriver: true,
    });
    animationRef.current.start();
    processingTimerRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;
      processingTimerRef.current = null;
      animationRef.current = null;
      void persistPhotoProof(photoUri)
        .then((persistentUri) => {
          if (isUnmountedRef.current || operationRef.current !== operation) return;
          photoUriRef.current = persistentUri;
          setPhotoUri(persistentUri);
          setStep('success');
          successTimerRef.current = setTimeout(() => {
            if (
              isUnmountedRef.current
              || operationRef.current !== operation
              || !photoUriRef.current
            ) return;
            successTimerRef.current = null;
            onComplete(photoUriRef.current);
            reset();
          }, 550);
        })
        .catch(() => {
          if (isUnmountedRef.current || operationRef.current !== operation) return;
          progress.setValue(0);
          setStep('preview');
          Alert.alert('Could not save photo', 'The selected photo could not be stored on this device. Please choose another photo and try again.');
        });
    }, 1350);
  };

  const handleClose = () => { reset(); onCancel(); };
  const progressScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onDismiss={reset}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={step === 'processing' ? undefined : handleClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {(step === 'choose' || step === 'preview') && (
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name={step === 'choose' ? 'camera-outline' : 'image-outline'} size={20} color={Palette.red} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>PHOTO PROOF</Text>
                <Text style={styles.title}>{step === 'choose' ? 'Complete this task' : 'Use this photo?'}</Text>
                <Text style={styles.taskName} numberOfLines={1}>{taskLabel}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close photo completion">
                <Ionicons name="close" size={19} color={Palette.warmDim} />
              </TouchableOpacity>
            </View>
          )}

          {step === 'choose' && (
            <>
              <Text style={styles.description}>Choose where your completion photo should come from.</Text>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleCamera}
                disabled={sourceBusy !== null}
                accessibilityRole="button"
                accessibilityLabel="Open camera and take a photo"
              >
                <View style={styles.cameraIcon}>
                  {sourceBusy === 'camera'
                    ? <ActivityIndicator size="small" color={Palette.onRed} />
                    : <Ionicons name="camera" size={23} color={Palette.onRed} />}
                </View>
                <View style={styles.sourceCopy}>
                  <Text style={styles.cameraLabel}>{sourceBusy === 'camera' ? 'Opening camera…' : 'Camera'}</Text>
                  <Text style={styles.cameraHint}>Take a picture now</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.onRed} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handleGallery}
                disabled={sourceBusy !== null}
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from library"
              >
                <View style={styles.galleryIcon}>
                  {sourceBusy === 'gallery'
                    ? <ActivityIndicator size="small" color={Palette.red} />
                    : <Ionicons name="images-outline" size={21} color={Palette.red} />}
                </View>
                <View style={styles.sourceCopy}>
                  <Text style={styles.galleryLabel}>{sourceBusy === 'gallery' ? 'Opening photos…' : 'Photo library'}</Text>
                  <Text style={styles.galleryHint}>Choose an existing picture</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.warmMuted} />
              </TouchableOpacity>
              <Text style={styles.privacyNote}>Your photo stays attached to this task on this device.</Text>
            </>
          )}

          {step === 'preview' && photoUri && (
            <>
              <Image source={{ uri: photoUri }} style={styles.previewImage} contentFit="cover" />
              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => { setPhotoUri(null); setStep('choose'); }} accessibilityRole="button" accessibilityLabel="Choose another photo">
                  <Ionicons name="refresh" size={17} color={Palette.warmDim} />
                  <Text style={styles.secondaryText}>Choose again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleProcess} accessibilityRole="button" accessibilityLabel="Use photo and complete task">
                  <Ionicons name="checkmark" size={18} color={Palette.onRed} />
                  <Text style={styles.primaryText}>Use photo</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'processing' && (
            <View style={styles.processing}>
              <View style={styles.processingVisual}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.processingImage} contentFit="cover" />}
                <View style={styles.processingBadge}><ActivityIndicator size="small" color={Palette.onRed} /></View>
              </View>
              <Text style={styles.processingTitle}>Lighting your star</Text>
              <Text style={styles.processingText}>Saving your photo and marking “{taskLabel}” complete.</Text>
              <View style={styles.steps}>
                <View style={styles.stepRow}><Ionicons name="checkmark-circle" size={17} color={Palette.red} /><Text style={styles.stepDone}>Photo added</Text></View>
                <View style={styles.stepRow}><ActivityIndicator size="small" color={Palette.red} /><Text style={styles.stepActive}>Saving completion</Text></View>
                <View style={styles.stepRow}><Ionicons name="ellipse-outline" size={17} color={Palette.gray} /><Text style={styles.stepPending}>Star ready to light</Text></View>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { transform: [{ scaleX: progressScale }] }]} />
              </View>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.success}>
              <View style={styles.successIcon}><Ionicons name="star" size={34} color={Palette.onRed} /></View>
              <Text style={styles.successTitle}>Star lit</Text>
              <Text style={styles.processingText}>“{taskLabel}” is complete and now shines in your sky.</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const themedStyles = createEditorialStyles(() => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: Palette.backdrop },
  card: { width: '100%', maxWidth: 420, padding: 16, gap: 13, borderRadius: R.lg, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgRaised, shadowColor: '#171717', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.redSoft },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: Palette.warmMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { color: Palette.warmWhite, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  taskName: { color: Palette.warmDim, fontSize: 11, fontWeight: '600', marginTop: 1 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.graySoft },
  description: { color: Palette.warmDim, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  cameraButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: Palette.red },
  cameraIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.redDark },
  sourceCopy: { flex: 1, minWidth: 0 },
  cameraLabel: { color: Palette.onRed, fontSize: 14, fontWeight: '800' },
  cameraHint: { color: Palette.onRed, opacity: 0.78, fontSize: 10, fontWeight: '600', marginTop: 1 },
  galleryButton: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  galleryIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.redSoft },
  galleryLabel: { color: Palette.warmWhite, fontSize: 14, fontWeight: '800' },
  galleryHint: { color: Palette.warmMuted, fontSize: 10, fontWeight: '600', marginTop: 1 },
  privacyNote: { color: Palette.warmMuted, fontSize: 9, lineHeight: 13, fontWeight: '600', textAlign: 'center' },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: R.md, backgroundColor: Palette.graySoft },
  previewActions: { flexDirection: 'row', gap: 8 },
  secondaryButton: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  secondaryText: { color: Palette.warmDim, fontSize: 12, fontWeight: '800' },
  primaryButton: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: R.sm, backgroundColor: Palette.red },
  primaryText: { color: Palette.onRed, fontSize: 12, fontWeight: '800' },
  processing: { alignItems: 'center', paddingVertical: 8, gap: 10 },
  processingVisual: { width: 88, height: 88, position: 'relative' },
  processingImage: { width: 88, height: 88, borderRadius: R.md, backgroundColor: Palette.graySoft },
  processingBadge: { position: 'absolute', right: -7, bottom: -7, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: Palette.red, borderWidth: 3, borderColor: Palette.bgRaised },
  processingTitle: { color: Palette.warmWhite, fontSize: 18, fontWeight: '800', marginTop: 3 },
  processingText: { maxWidth: 310, color: Palette.warmDim, fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  steps: { width: '100%', gap: 7, paddingHorizontal: 8, marginTop: 3 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDone: { color: Palette.warmDim, fontSize: 11, fontWeight: '700' },
  stepActive: { color: Palette.warmWhite, fontSize: 11, fontWeight: '800' },
  stepPending: { color: Palette.warmMuted, fontSize: 11, fontWeight: '600' },
  progressTrack: { width: '100%', height: 5, marginTop: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: Palette.graySoft },
  progressFill: { width: '100%', height: 5, borderRadius: 3, backgroundColor: Palette.red, transformOrigin: 'left center' },
  success: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  successIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34, backgroundColor: Palette.red },
  successTitle: { color: Palette.warmWhite, fontSize: 20, fontWeight: '800' },
}));
