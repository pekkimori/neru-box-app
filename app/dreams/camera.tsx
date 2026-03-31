// app/dreams/camera.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
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
    <View style={styles.container}>
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
            <TouchableOpacity style={styles.retakeButton} onPress={() => setPhotoUri(null)}>
              <Ionicons name="refresh" size={18} color={NeruColors.text} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={handleUsePhoto}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.useText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.captureArea} onPress={takePhoto}>
          <Ionicons name="camera" size={48} color={NeruColors.textMuted} />
          <Text style={styles.captureText}>Tap to take photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.skipButton} onPress={() => router.back()}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg, padding: 24, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '700', color: NeruColors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 14, color: NeruColors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24,
  },
  captureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 20,
    borderStyle: 'dashed',
  },
  captureText: { fontSize: 15, color: NeruColors.textMuted, marginTop: 12 },
  previewContainer: { flex: 1 },
  preview: { flex: 1, borderRadius: 20, backgroundColor: NeruColors.card },
  previewActions: {
    flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center',
  },
  retakeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: NeruColors.cardBorder, borderRadius: 12,
  },
  retakeText: { fontSize: 15, color: NeruColors.text },
  useButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: NeruColors.emerald, borderRadius: 12,
  },
  useText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { fontSize: 14, color: NeruColors.textDim },
});
