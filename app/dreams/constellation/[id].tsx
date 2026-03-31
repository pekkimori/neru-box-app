// app/dreams/constellation/[id].tsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { NeruColors } from '../../../constants/neru-theme';
import { useConstellations } from '../../../hooks/useConstellations';

export default function ConstellationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { constellations, getStarsForConstellation, addStar, deleteStar } = useConstellations();
  const [newLabel, setNewLabel] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const constellation = constellations.find((c) => c.id === id);
  const starList = id ? getStarsForConstellation(id) : [];

  if (!constellation) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Constellation not found</Text>
      </View>
    );
  }

  const handleAdd = () => {
    if (!newLabel.trim() || !id) return;
    addStar(id, newLabel.trim());
    setNewLabel('');
    inputRef.current?.focus();
  };

  const renderRightActions = (starId: string) => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => deleteStar(starId)}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${constellation.icon} ${constellation.name}` }} />

      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressIcon}>{constellation.icon}</Text>
        <View>
          <Text style={styles.progressTitle}>{constellation.name}</Text>
          <Text style={styles.progressCount}>{starList.length} stars</Text>
        </View>
      </View>

      {/* Star List */}
      <FlatList
        data={starList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <View style={styles.starRow}>
              <View style={styles.starDot} />
              <Text style={styles.starLabel}>{item.label}</Text>
            </View>
          </Swipeable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No stars yet. Add your first task!</Text>
        }
      />

      {/* Add Star */}
      {showInput ? (
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Task label (e.g., Practice scales 20 min)"
            placeholderTextColor={NeruColors.textDim}
            value={newLabel}
            onChangeText={setNewLabel}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity onPress={handleAdd} disabled={!newLabel.trim()}>
            <Ionicons
              name="add-circle"
              size={36}
              color={newLabel.trim() ? NeruColors.violet : NeruColors.textDim}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowInput(true)}>
          <Ionicons name="add" size={20} color={NeruColors.violet} />
          <Text style={styles.addText}>Add Star</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    paddingBottom: 12,
  },
  progressIcon: { fontSize: 40 },
  progressTitle: { fontSize: 20, fontWeight: '700', color: NeruColors.text },
  progressCount: { fontSize: 14, color: NeruColors.textMuted, marginTop: 2 },
  list: { padding: 20, paddingTop: 0, paddingBottom: 120 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  starDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NeruColors.textDim,
  },
  starLabel: { fontSize: 15, color: NeruColors.text, flex: 1 },
  deleteAction: {
    backgroundColor: NeruColors.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  emptyText: { fontSize: 14, color: NeruColors.textMuted, textAlign: 'center', marginTop: 40 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: NeruColors.cardBorder,
    backgroundColor: NeruColors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: NeruColors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 20,
    marginBottom: 32,
    paddingVertical: 14,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
  },
  addText: { fontSize: 15, fontWeight: '600', color: NeruColors.violet },
});
