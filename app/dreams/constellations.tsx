// app/dreams/constellations.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CandyButton, CandyCard, CandyScreen, StatusPill } from '@/components/candy';
import { CandyColors, CandyRadii, CandySpacing } from '@/constants/candy-theme';
import { useConstellations } from '../../hooks/useConstellations';

const CONSTELLATION_PALETTE = [
  'gold', 'sky', 'pink',
  'lavender', 'mint', 'gold',
] as const;

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Music', emojis: ['🎵', '🎸', '🎹', '🎻', '🥁', '🎤', '🎷', '🎺'] },
  { label: 'Sports', emojis: ['⚽', '🏀', '🏃', '🏋️', '🧘', '🚴', '🏊', '⛹️'] },
  { label: 'Academics', emojis: ['📐', '🧮', '📚', '🔬', '🧪', '📝', '💻', '🧠'] },
  { label: 'Creative', emojis: ['🎨', '✏️', '📷', '🎬', '🪡', '🏗️', '🎭', '✂️'] },
  { label: 'Nature', emojis: ['🌱', '🌻', '🌿', '🍳', '🧑‍🍳', '🪴', '🐾', '🌊'] },
  { label: 'Daily Life', emojis: ['🏠', '🧹', '💪', '📖', '🗣️', '💤', '🧘‍♀️', '🎯'] },
];

export default function ConstellationList() {
  const router = useRouter();
  const { constellations, stars, addConstellation, deleteConstellation } = useConstellations();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  const handleCreate = () => {
    if (!newName.trim() || !selectedEmoji) return;
    addConstellation(newName.trim(), selectedEmoji);
    setNewName('');
    setSelectedEmoji('');
    setShowCreate(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Constellation', `Delete "${name}" and all its stars?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteConstellation(id) },
    ]);
  };

  return (
    <CandyScreen variant="dreams">
      <FlatList
        data={constellations}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const color = CONSTELLATION_PALETTE[index % CONSTELLATION_PALETTE.length];
          const starCount = stars.filter((s) => s.constellationId === item.id).length;
          return (
            <TouchableOpacity
              style={styles.cardTouch}
              onPress={() => router.push(`/dreams/constellation/${item.id}`)}
              onLongPress={() => handleDelete(item.id, item.name)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name} constellation, ${starCount} stars`}
              accessibilityHint="Opens the constellation. Long press to delete it."
            >
              <CandyCard tone={color} style={styles.card}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardName}>{item.name}</Text>
                <StatusPill
                  label={`${starCount} stars`}
                  icon="star"
                  tone={color}
                  style={styles.cardCount}
                />
              </CandyCard>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <CandyButton
            label="New Constellation"
            icon="add-circle-outline"
            variant="secondary"
            onPress={() => setShowCreate(true)}
            style={styles.createButton}
          />
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoiding}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Constellation</Text>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Name (e.g., Piano)"
                  placeholderTextColor={CandyColors.inkMuted}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  accessibilityLabel="Constellation name"
                  accessibilityHint="Enter the name for the new constellation."
                />

                <Text style={styles.emojiLabel}>Choose an icon</Text>
                {EMOJI_CATEGORIES.map((cat) => (
                  <View key={cat.label}>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                    <View style={styles.emojiRow}>
                      {cat.emojis.map((e) => (
                        <TouchableOpacity
                          key={e}
                          style={[styles.emojiButton, selectedEmoji === e && styles.emojiSelected]}
                          onPress={() => setSelectedEmoji(e)}
                          accessibilityRole="button"
                          accessibilityLabel={`Choose ${e} icon`}
                          accessibilityHint={`Sets ${e} as the constellation icon.`}
                          accessibilityState={{ selected: selectedEmoji === e }}
                        >
                          <Text style={styles.emoji}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => { setShowCreate(false); setNewName(''); setSelectedEmoji(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel creating constellation"
                  accessibilityHint="Closes this form and clears the entered name and selected icon."
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <CandyButton
                  label="Create"
                  onPress={handleCreate}
                  disabled={!newName.trim() || !selectedEmoji}
                  style={styles.confirmButton}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: CandySpacing.lg, paddingBottom: 120 },
  row: { gap: CandySpacing.md, marginBottom: CandySpacing.md },
  cardTouch: {
    flex: 1,
  },
  card: {
    minHeight: 158,
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.sm,
  },
  cardIcon: { fontSize: 36 },
  cardName: { fontSize: 15, fontWeight: '900', color: CandyColors.ink, textAlign: 'center' },
  cardCount: { alignSelf: 'center' },
  createButton: {
    marginTop: CandySpacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: CandyColors.overlay,
    justifyContent: 'flex-end',
    padding: CandySpacing.lg,
  },
  keyboardAvoiding: {
    width: '100%',
    maxHeight: '92%',
  },
  modalContent: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.xl,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    padding: CandySpacing.lg,
    maxHeight: '100%',
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: CandySpacing.sm,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: CandyColors.ink, marginBottom: CandySpacing.md },
  input: {
    backgroundColor: CandyColors.cream,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    borderRadius: CandyRadii.md,
    padding: CandySpacing.md,
    fontSize: 16,
    color: CandyColors.ink,
    marginBottom: CandySpacing.md,
  },
  emojiLabel: { fontSize: 15, fontWeight: '900', color: CandyColors.ink, marginBottom: CandySpacing.xs },
  categoryLabel: { fontSize: 12, fontWeight: '800', color: CandyColors.inkSoft, marginTop: CandySpacing.sm, marginBottom: 4 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: CandySpacing.xs },
  emojiButton: {
    padding: CandySpacing.xs,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: CandyColors.white,
  },
  emojiSelected: { backgroundColor: '#F0E9FF', borderColor: CandyColors.lavender },
  emoji: { fontSize: 24 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: CandySpacing.lg,
  },
  cancelText: { fontSize: 15, fontWeight: '800', color: CandyColors.inkSoft },
  confirmButton: {
    minWidth: 128,
  },
});
