// features/dreams/observatory/bottom-toolbar.tsx
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/constants/editorial-theme';
import { useThemedStyles } from '@/features/settings/app-theme';
import { Palette, Sp, R, useDreamsPalette } from '../tokens';

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onAddNebula: () => void;
}

export function BottomToolbar({ editMode, onToggleEdit, onAddNebula }: Props) {
  const styles = useThemedStyles(themedStyles);
  const Palette = useDreamsPalette();

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

    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  toolbar: {
    flexDirection: 'row', gap: 6,
  },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.xs,
    paddingHorizontal: 10, height: 36, borderRadius: R.sm,
    borderWidth: 1, borderColor: Palette.gray,
    backgroundColor: Palette.bgElevated,
  },
  buttonText: { color: Palette.warmDim, fontSize: 13, fontWeight: '800' },
}));
