// app/dreams/constellation/[id].tsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { CandyButton, CandyCard, CandyScreen, StarToken } from '@/components/candy';
import { CandyColors, CandyRadii, CandySpacing } from '@/constants/candy-theme';
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
      <CandyScreen variant="dreams">
        <CandyCard tone="lavender" style={styles.emptyCard}>
          <StarToken state="locked" tone="lavender" size={42} />
          <Text style={styles.emptyText}>Constellation not found</Text>
        </CandyCard>
      </CandyScreen>
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
        <Ionicons name="trash-outline" size={20} color={CandyColors.white} />
      </TouchableOpacity>
    );
  };

  return (
    <CandyScreen variant="dreams">
      <Stack.Screen options={{ title: `${constellation.icon} ${constellation.name}` }} />

      {/* Progress Header */}
      <CandyCard tone="gold" style={styles.progressHeader}>
        <Text style={styles.progressIcon}>{constellation.icon}</Text>
        <View>
          <Text style={styles.progressTitle}>{constellation.name}</Text>
          <Text style={styles.progressCount}>{starList.length} stars</Text>
        </View>
      </CandyCard>

      {/* Star List */}
      <FlatList
        data={starList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <CandyCard tone="lavender" style={styles.starRow}>
              <StarToken state="filled" tone="gold" size={36} />
              <Text style={styles.starLabel}>{item.label}</Text>
            </CandyCard>
          </Swipeable>
        )}
        ListEmptyComponent={
          <CandyCard tone="lavender" style={styles.emptyCard}>
            <StarToken state="locked" tone="lavender" size={42} />
            <Text style={styles.emptyText}>No stars yet. Add your first task!</Text>
          </CandyCard>
        }
      />

      {/* Add Star */}
      {showInput ? (
        <View style={styles.inputBar}>
          <StarToken state="empty" tone="lavender" size={38} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Task label (e.g., Practice scales 20 min)"
            placeholderTextColor={CandyColors.inkMuted}
            value={newLabel}
            onChangeText={setNewLabel}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoFocus
          />
          <CandyButton
            label="Add"
            icon="add"
            onPress={handleAdd}
            disabled={!newLabel.trim()}
            style={styles.inputButton}
          />
        </View>
      ) : (
        <CandyButton
          label="Add Star"
          icon="add"
          variant="secondary"
          onPress={() => setShowInput(true)}
          style={styles.addButton}
        />
      )}
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.md,
    marginTop: CandySpacing.lg,
  },
  progressIcon: { fontSize: 40 },
  progressTitle: { fontSize: 20, fontWeight: '900', color: CandyColors.ink },
  progressCount: { fontSize: 14, fontWeight: '800', color: CandyColors.inkSoft, marginTop: 2 },
  list: { paddingTop: CandySpacing.md, paddingBottom: 120 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.md,
    marginBottom: CandySpacing.sm,
  },
  starLabel: { fontSize: 15, fontWeight: '800', color: CandyColors.ink, flex: 1 },
  deleteAction: {
    backgroundColor: CandyColors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: CandyRadii.lg,
    marginBottom: CandySpacing.sm,
    marginLeft: CandySpacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    gap: CandySpacing.sm,
    marginTop: CandySpacing.lg,
  },
  emptyText: { fontSize: 14, fontWeight: '800', color: CandyColors.inkSoft, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
    paddingVertical: CandySpacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    borderRadius: CandyRadii.md,
    padding: CandySpacing.md,
    fontSize: 15,
    color: CandyColors.ink,
  },
  inputButton: { minWidth: 82, paddingHorizontal: CandySpacing.md },
  addButton: { marginBottom: CandySpacing.xl },
});
