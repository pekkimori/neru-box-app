// app/dreams/constellations.tsx
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, Modal, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useConstellations } from '../../hooks/useConstellations';

const CONSTELLATION_PALETTE = [
  NeruColors.amber, NeruColors.sky, NeruColors.pink,
  NeruColors.violet, NeruColors.emerald, NeruColors.indigo,
];

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
    <View style={styles.container}>
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
              style={styles.card}
              onPress={() => router.push(`/dreams/constellation/${item.id}`)}
              onLongPress={() => handleDelete(item.id, item.name)}
            >
              <Text style={styles.cardIcon}>{item.icon}</Text>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={[styles.cardCount, { color }]}>{starCount} stars</Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle-outline" size={24} color={NeruColors.violet} />
            <Text style={styles.createText}>New Constellation</Text>
          </TouchableOpacity>
        }
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Constellation</Text>

            <TextInput
              style={styles.input}
              placeholder="Name (e.g., Piano)"
              placeholderTextColor={NeruColors.textDim}
              value={newName}
              onChangeText={setNewName}
              autoFocus
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
                    >
                      <Text style={styles.emoji}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setNewName(''); setSelectedEmoji(''); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, (!newName.trim() || !selectedEmoji) && styles.confirmDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || !selectedEmoji}
              >
                <Text style={styles.confirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  list: { padding: 20, paddingBottom: 120 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  cardIcon: { fontSize: 32 },
  cardName: { fontSize: 15, fontWeight: '600', color: NeruColors.text, marginTop: 8 },
  cardCount: { fontSize: 12, marginTop: 4 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 16,
    marginTop: 4,
  },
  createText: { fontSize: 15, fontWeight: '600', color: NeruColors.violet },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: NeruColors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: NeruColors.text, marginBottom: 16 },
  input: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: NeruColors.text,
    marginBottom: 16,
  },
  emojiLabel: { fontSize: 15, fontWeight: '600', color: NeruColors.text, marginBottom: 8 },
  categoryLabel: { fontSize: 12, color: NeruColors.textMuted, marginTop: 8, marginBottom: 4 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiButton: { padding: 6, borderRadius: 8 },
  emojiSelected: { backgroundColor: 'rgba(167,139,250,0.2)', borderRadius: 8 },
  emoji: { fontSize: 24 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelText: { fontSize: 15, color: NeruColors.textMuted },
  confirmButton: {
    backgroundColor: NeruColors.violet,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
