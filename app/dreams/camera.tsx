// app/dreams/camera.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { CandyButton, CandyScreen } from '@/components/candy';
import { CandyColors } from '@/constants/candy-theme';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import { useCoins } from '../../hooks/useCoins';
import type { BlockType } from '../../types/dreams';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function CameraScreen() {
  const { starId, block, mode } = useLocalSearchParams<{
    starId: string;
    block: string;
    mode: string;
  }>();
  const router = useRouter();
  const today = todayString();
  const { updateTaskStatus, awardCoins } = useDailyPlan(today);
  const { addCoins } = useCoins();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const isSetup = mode === 'setup';
  const blockType = block as BlockType;

  const takePhoto = async () => {
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
    }
  };

  const handleUsePhoto = () => {
    if (!photoUri || !starId || !blockType) return;

    if (isSetup) {
      updateTaskStatus(starId, blockType, 'dim', photoUri);
    } else {
      updateTaskStatus(starId, blockType, 'lit', photoUri);
      const bonusCoins = 25;
      awardCoins(starId, blockType, bonusCoins);
      addCoins(bonusCoins);
    }

    router.back();
  };

  return (
    <CandyScreen variant="dreams" style={styles.container}>
      <Text style={styles.title}>
        {isSetup ? 'Setup Photo' : 'Completion Photo'}
      </Text>
      <Text style={styles.subtitle}>
        {isSetup
          ? 'Take a photo of your task setup before you start'
          : 'Take a photo showing your completed work'}
      </Text>

      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <CandyButton
              label="Retake"
              icon="refresh"
              variant="secondary"
              onPress={() => setPhotoUri(null)}
              style={styles.previewButton}
            />
            <CandyButton
              label="Use Photo"
              icon="checkmark"
              onPress={handleUsePhoto}
              style={styles.previewButton}
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.captureArea} onPress={takePhoto}>
          <Ionicons name="camera" size={48} color={CandyColors.lavenderDeep} />
          <Text style={styles.captureText}>Tap to take photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '900', color: CandyColors.ink, textAlign: 'center' },
  subtitle: {
    fontSize: 14, color: CandyColors.inkSoft, textAlign: 'center', marginTop: 8, marginBottom: 24,
    fontWeight: '700',
  },
  captureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  captureText: { fontSize: 15, color: CandyColors.inkSoft, marginTop: 12, fontWeight: '800' },
  previewContainer: { flex: 1 },
  preview: { flex: 1, borderRadius: 20, backgroundColor: CandyColors.creamDeep },
  previewActions: {
    flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center',
  },
  previewButton: { flex: 1 },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { fontSize: 14, color: CandyColors.inkMuted, fontWeight: '800' },
});
