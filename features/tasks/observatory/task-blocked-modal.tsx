import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotionModal as Modal, MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { Palette, R, Sp, useTasksPalette } from '../tokens';

export interface TaskBlockedNotice {
  title: string;
  message: string;
}

export function TaskBlockedModal({ notice, onClose }: {
  notice: TaskBlockedNotice | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(themedStyles);
  const palette = useTasksPalette();
  return (
    <Modal transparent animationType="fade" visible={notice !== null} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso de task bloqueada"
        />
        <View style={styles.card} accessibilityViewIsModal>
          <Ionicons name="lock-closed-outline" size={28} color={palette.red} />
          <Text style={styles.title} accessibilityRole="header">{notice?.title}</Text>
          <Text style={styles.message} accessibilityRole="alert">{notice?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose} accessibilityRole="button">
            <Text style={styles.buttonText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const themedStyles = createEditorialStyles(() => ({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Sp.lg },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: Palette.backdrop },
  card: { width: '100%', maxWidth: 380, borderRadius: R.lg, borderWidth: 1, borderColor: Palette.gray, backgroundColor: Palette.bgElevated, padding: Sp.lg, gap: Sp.md },
  title: { ...Type.sectionTitle, color: Palette.warmWhite },
  message: { ...Type.body, color: Palette.warmDim },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, backgroundColor: Palette.red },
  buttonText: { ...Type.button, color: Palette.onRed },
}));
