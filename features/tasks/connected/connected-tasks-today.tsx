import { iconGlyph } from '../../../lib/icons/icon-reference';
import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotionTouchableOpacity as TouchableOpacity } from '@/components/motion';
import { ConstellationCanvas } from '../observatory/constellation-canvas';
import { todayString } from '../time-helpers';
import { R, useTasksPalette } from '../tokens';
import type { BlockType, Constellation, PlannedTask, Star } from '../../../types/tasks';
import { useConnectedPlanning } from './use-connected-planning';
import { ConnectedTaskActions } from './connected-task-actions';
import { ConnectedSaveStatus } from './connected-save-status';

interface Props {
  selectedBlock: BlockType | null;
  selectedLabel: string;
  tasksUnlocked: boolean;
}

const isDayBlock = (value: string): value is BlockType =>
  value === 'morning' || value === 'afternoon' || value === 'evening';

export function ConnectedTasksToday({ selectedBlock, selectedLabel, tasksUnlocked }: Props) {
  const planning = useConnectedPlanning(todayString());
  const router = useRouter();
  const colors = useTasksPalette();
  const groups = planning.schedule?.groupedBlocks ?? [];
  const selectedTasks = selectedBlock
    ? groups.filter(group => group.type === selectedBlock).flatMap(group => group.tasks)
    : [];
  const completed = selectedTasks.filter(task => task.status === 'lit').length;
  const blocked = planning.saving || planning.loading || !planning.ready || !!planning.pending.length || !!planning.pendingPhotos.length;

  const sky = useMemo(() => {
    const entries = groups.filter(group => isDayBlock(group.type))
      .flatMap(group => group.tasks.map(task => ({ block: group.type as BlockType, task })));
    const stars: Star[] = entries.map(({ task }) => ({
      id: task.id,
      constellationId: task.nebulaId ?? task.constellationId ?? '',
      label: task.title,
    }));
    const goalNebulas: Constellation[] = planning.constellations.map(item => ({
      id: item.goal.nebulaId ?? item.id,
      name: item.name,
      icon: item.icon,
      createdAt: item.createdAt,
    }));
    const usedIds = new Set(entries.map(({ task }) => task.nebulaId ?? task.constellationId));
    const constellations: Constellation[] = [
      ...planning.nebulas.filter(nebula => !nebula.archivedAt || usedIds.has(nebula.id))
        .map(nebula => ({ id: nebula.id, name: nebula.name, icon: nebula.icon, createdAt: nebula.createdAt })),
      ...goalNebulas,
    ].filter((nebula, index, all) => all.findIndex(other => other.id === nebula.id) === index);
    const tasks = entries.map(({ block, task }) => ({
      block,
      available: tasksUnlocked,
      task: {
        starId: task.id,
        constellationId: task.nebulaId ?? task.constellationId ?? '',
        status: task.status,
        completedAt: task.completedAt,
        coinsEarned: task.coinsEarned,
      } satisfies PlannedTask,
    }));
    return { tasks, stars, constellations };
  }, [groups, planning.constellations, planning.nebulas, tasksUnlocked]);

  return <>
    <ConnectedSaveStatus planning={planning} />
    <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.warmWhite, fontSize: 19, fontWeight: '700' }}>{selectedLabel} tasks</Text>
        <Text style={{ color: colors.warmMuted, marginTop: 3 }}>Your plan for this period</Text>
      </View>
      <Text style={{ color: colors.red, fontWeight: '700' }}>{completed}/{selectedTasks.length}</Text>
    </View>

    <View testID="connected-period-tasks" style={{ minHeight: 96, borderRadius: R.sm, borderWidth: 1, borderColor: colors.gray, backgroundColor: colors.bgElevated, padding: 12, gap: 8 }}>
      {planning.loading && !planning.schedule ? <ActivityIndicator color={colors.red} /> : null}
      {planning.error && !planning.schedule ? <Text style={{ color: colors.red }}>{planning.error}</Text> : null}
      {!planning.loading && !planning.error && selectedTasks.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="calendar-outline" size={20} color={colors.warmMuted} />
          <Text style={{ color: colors.warmMuted, flex: 1 }}>Nothing planned for {selectedLabel.toLowerCase()}.</Text>
          <TouchableOpacity onPress={() => router.push('/tasks/connected')} accessibilityRole="button" accessibilityLabel="Plan tasks online" style={{ padding: 8 }}>
            <Text style={{ color: colors.red, fontWeight: '700' }}>Plan</Text>
          </TouchableOpacity>
        </View>
      ) : selectedTasks.map(task => {
        const nebula = sky.constellations.find(item => item.id === (task.nebulaId ?? task.constellationId));
        return <View key={task.id} testID={`connected-task-${task.id}`} style={{ minHeight: 54, padding: 10, borderRadius: R.sm, backgroundColor: colors.bgRaised }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={task.status === 'lit' ? 'star' : 'star-outline'} size={19} color={task.status === 'lit' ? colors.warmWhite : colors.red} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.warmWhite, fontWeight: '600' }}>{task.title}</Text>
            <Text style={{ color: colors.warmMuted, fontSize: 12 }}>{nebula ? `${iconGlyph(nebula.icon)} ${nebula.name}` : 'Nebula'} · {task.status}</Text>
          </View>
        </View><ConnectedTaskActions task={task} planning={planning} disabled={blocked} canComplete={tasksUnlocked} /></View>;
      })}
    </View>

    <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ color: colors.warmWhite, fontSize: 19, fontWeight: '700' }}>Your sky</Text>
        <Text style={{ color: colors.warmMuted, marginTop: 3 }}>Your nebulae and planned stars</Text>
      </View>
      <TouchableOpacity onPress={() => router.push({ pathname: '/tasks/galaxy', params: { source: 'online' } })} accessibilityRole="button" accessibilityLabel="Open online completed stars archive" style={{ padding: 8 }}>
        <Text style={{ color: colors.red, fontWeight: '700' }}>Archive</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/tasks/connected')} accessibilityRole="button" accessibilityLabel="Manage your sky" style={{ padding: 8 }}>
        <Text style={{ color: colors.red, fontWeight: '700' }}>Manage</Text>
      </TouchableOpacity>
    </View>
    <ConstellationCanvas
      tasks={sky.tasks}
      stars={sky.stars}
      constellations={sky.constellations}
      selectedBlock={selectedBlock}
      onStarPress={() => router.push('/tasks/connected')}
      height={260}
    />
  </>;
}
