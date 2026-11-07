import { SectionHeading } from '@/components/section-heading';
import { AppButton } from '@/components/native-controls';
import { AppBox } from '@/components/app-box';
import { boxStyle } from '@/theme/boxes';
import { ActionButton, ActionRow, ButtonIcon, ButtonLabel, DismissSurface } from '@/components/app-controls';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Text, View } from 'react-native';
import { MotionModal as Modal } from '@/components/motion';
import { useThemedStyles } from '@/theme/app-theme';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { Palette, R, useTasksPalette } from '@/features/tasks/tokens';
import { persistPhotoProof } from '@/utils/photo-storage';

type PhotoCompletionModalProps = {
  visible: boolean;
  taskLabel: string;
  onComplete: (photoUri: string) => void;
  onSavePhoto?: (photoUri: string) => Promise<boolean>;
  purpose?: 'setup' | 'completion';
  onCancel: () => void;
};

type ModalStep = 'choose' | 'preview' | 'processing' | 'success';
type PhotoSource = 'camera' | 'gallery';

export function PhotoCompletionModal({
  visible, taskLabel, onComplete, onCancel, onSavePhoto, purpose = 'completion',
}: PhotoCompletionModalProps) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useTasksPalette();
  const [step, setStep] = useState<ModalStep>('choose');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sourceBusy, setSourceBusy] = useState<PhotoSource | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const photoUriRef = useRef<string | null>(null);
  const isUnmountedRef = useRef(false);
  const operationRef = useRef(0);

  useEffect(() => { photoUriRef.current = photoUri; }, [photoUri]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      animationRef.current?.stop();
    };
  }, []);

  const reset = useCallback(() => {
    operationRef.current += 1;
    setStep('choose');
    setPhotoUri(null);
    setSourceBusy(null);
    setSaveError(null);
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
    setSaveError(null);
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
        .then(async (persistentUri) => {
          if (isUnmountedRef.current || operationRef.current !== operation) return;
          photoUriRef.current = persistentUri;
          setPhotoUri(persistentUri);
          if (onSavePhoto && !(await onSavePhoto(persistentUri))) throw new Error('The save did not finish. Close this form and check the pending save or error on your plan.');
          if (isUnmountedRef.current || operationRef.current !== operation) return;
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
        .catch((error: unknown) => {
          if (isUnmountedRef.current || operationRef.current !== operation) return;
          progress.setValue(0);
          setStep('preview');
          setSaveError(error instanceof Error ? error.message : 'Could not save this photo. Please try again.');
        });
    }, 1350);
  };

  const handleClose = () => { if (step === 'processing') return; reset(); onCancel(); };
  const progressScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onDismiss={reset}
      onRequestClose={handleClose}
    >
      <DismissSurface style={styles.backdrop} onPress={step === 'processing' ? undefined : handleClose}>
        <DismissSurface style={styles.card} onPress={(event) => event.stopPropagation()}>
          {(step === 'choose' || step === 'preview') && <SectionHeading>Photo proof</SectionHeading>}
          {step === 'choose' && (
            <>
              <Text style={styles.description}>Choose a {purpose} photo for this task.</Text>
              <ActionRow
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
              </ActionRow>

              <ActionRow
                style={styles.galleryButton}
                onPress={handleGallery}
                disabled={sourceBusy !== null}
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from library"
              >
                <AppBox variant="icon" padding="none" tone="accent" style={styles.galleryIcon}>
                  {sourceBusy === 'gallery'
                    ? <ActivityIndicator size="small" color={Palette.red} />
                    : <Ionicons name="images-outline" size={21} color={Palette.red} />}
                </AppBox>
                <View style={styles.sourceCopy}>
                  <Text style={styles.galleryLabel}>{sourceBusy === 'gallery' ? 'Opening photos…' : 'Photo library'}</Text>
                  <Text style={styles.galleryHint}>Choose an existing picture</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.warmMuted} />
              </ActionRow>
              <Text style={styles.privacyNote}>{onSavePhoto ? 'Your photo is saved privately to your account.' : 'Your photo stays attached to this task on this device.'}</Text>
            </>
          )}

          {step === 'preview' && photoUri && (
            <>
              <Image source={{ uri: photoUri }} style={styles.previewImage} contentFit="cover" />
              {saveError && <Text accessibilityRole="alert" style={{ color: Palette.red }}>{saveError}</Text>}
              <View style={styles.previewActions}>
                <ActionButton style={{ flex: 1 }}   onPress={() => { setPhotoUri(null); setSaveError(null); setStep('choose'); }} accessibilityRole="button" accessibilityLabel="Choose another photo">
                  <ButtonIcon name="refresh" size={17} />
                  <ButtonLabel>Choose again</ButtonLabel>
                </ActionButton>
                <ActionButton style={{ flex: 1 }} variant="primary"  onPress={handleProcess} accessibilityRole="button" accessibilityLabel={purpose === 'setup' ? 'Use photo and set up task' : 'Use photo and complete task'}>
                  <ButtonIcon name="checkmark" size={18} />
                  <ButtonLabel>Use photo</ButtonLabel>
                </ActionButton>
              </View>
            </>
          )}

          {(step === 'choose' || step === 'preview') && <AppButton label="Dismiss" variant="secondary" onPress={handleClose} />}

          {step === 'processing' && (
            <View style={styles.processing}>
              <View style={styles.processingVisual}>
                {photoUri && <Image source={{ uri: photoUri }} style={styles.processingImage} contentFit="cover" />}
                <View style={styles.processingBadge}><ActivityIndicator size="small" color={Palette.onRed} /></View>
              </View>
              <SectionHeading>{purpose === 'setup' ? 'Setting up your star' : 'Lighting your star'}</SectionHeading>
              <Text style={styles.processingText}>Saving your {purpose} photo for “{taskLabel}”.</Text>
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
              <SectionHeading>{purpose === 'setup' ? 'Setup saved' : 'Star lit'}</SectionHeading>
              <Text style={styles.processingText}>{purpose === 'setup' ? `“${taskLabel}” is ready to begin.` : `“${taskLabel}” is complete and now shines in your sky.`}</Text>
            </View>
          )}
        </DismissSurface>
      </DismissSurface>
    </Modal>
  );
}

const themedStyles = createEditorialStyles(() => ({
  backdrop: { ...boxStyle(Palette, { variant: 'backdrop' }), flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { ...boxStyle(Palette, { variant: 'dialog' }), width: '100%', maxWidth: 420, gap: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: Palette.warmMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { color: Palette.warmWhite, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  taskName: { color: Palette.warmDim, fontSize: 11, fontWeight: '600', marginTop: 1 },
  description: { color: Palette.warmDim, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  cameraButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: Palette.red },
  cameraIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.redDark },
  sourceCopy: { flex: 1, minWidth: 0 },
  cameraLabel: { color: Palette.onRed, fontSize: 14, fontWeight: '800' },
  cameraHint: { color: Palette.onRed, opacity: 0.78, fontSize: 10, fontWeight: '600', marginTop: 1 },
  galleryButton: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated },
  galleryIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  galleryLabel: { color: Palette.warmWhite, fontSize: 14, fontWeight: '800' },
  galleryHint: { color: Palette.warmMuted, fontSize: 10, fontWeight: '600', marginTop: 1 },
  privacyNote: { color: Palette.warmMuted, fontSize: 9, lineHeight: 13, fontWeight: '600', textAlign: 'center' },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: R.md, backgroundColor: Palette.graySoft },
  previewActions: { flexDirection: 'row', gap: 8 },
  processing: { alignItems: 'center', paddingVertical: 8, gap: 10 },
  processingVisual: { width: 88, height: 88, position: 'relative' },
  processingImage: { width: 88, height: 88, borderRadius: R.md, backgroundColor: Palette.graySoft },
  processingBadge: { position: 'absolute', right: -7, bottom: -7, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: Palette.red, borderWidth: 3, borderColor: Palette.bgRaised },
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
}));
