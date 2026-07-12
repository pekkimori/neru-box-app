// features/dreams/observatory/bottom-toolbar.tsx
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette, Sp, R } from '../tokens';

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onAddNebula: () => void;
}

export function BottomToolbar({ editMode, onToggleEdit, onAddNebula }: Props) {
  const router = useRouter();

  return (
    <View style={styles.toolbar}>
      <TouchableOpacity
        style={styles.button}
        onPress={onToggleEdit}
        accessibilityRole="button"
        accessibilityLabel={editMode ? 'Exit edit mode' : 'Enter edit mode'}
      >
        <Ionicons
          name={editMode ? 'close-outline' : 'create-outline'}
          size={18}
          color={editMode ? Palette.red : Palette.warmDim}
        />
        <Text style={[styles.buttonText, editMode && { color: Palette.red }]}>
          {editMode ? 'Done' : 'Edit'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={onAddNebula}
        accessibilityRole="button"
        accessibilityLabel="Add nebula"
      >
        <Ionicons name="add-circle-outline" size={18} color={Palette.warmDim} />
        <Text style={styles.buttonText}>Add Nebula</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.galaxyButton]}
        onPress={() => router.push('/dreams/galaxy')}
        accessibilityRole="button"
        accessibilityLabel="Open Infinite Galaxy"
      >
        <Ionicons name="infinite" size={18} color={Palette.violet} />
        <Text style={[styles.buttonText, { color: Palette.violet }]}>
          Infinite Galaxy
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row', gap: Sp.sm, flexWrap: 'wrap',
  },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.xs,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md,
    borderWidth: 1, borderColor: Palette.gray,
    backgroundColor: Palette.bgElevated, minHeight: 44,
  },
  buttonText: { color: Palette.warmDim, fontSize: 13, fontWeight: '800' },
  galaxyButton: { borderColor: Palette.violetDim },
});
