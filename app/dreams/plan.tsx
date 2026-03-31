// app/dreams/plan.tsx
import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeruColors } from '../../constants/neru-theme';
import { useConstellations } from '../../hooks/useConstellations';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import type { BlockType } from '../../types/dreams';

const BLOCK_LABELS: { key: BlockType; label: string; color: string }[] = [
  { key: 'morning', label: 'Morning', color: NeruColors.amber },
  { key: 'afternoon', label: 'Afternoon', color: NeruColors.sky },
  { key: 'evening', label: 'Evening', color: NeruColors.violet },
];

function getWeekDays(offset: number): { date: string; label: string; dayNum: number; isPast: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);

  const days = [];
  const todayStr = today.toISOString().split('T')[0];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      dayNum: d.getDate(),
      isPast: dateStr < todayStr,
    });
  }
  return days;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function PlanDay() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const today = todayString();

  const { constellations, stars } = useConstellations();
  const { plan, assignTask, removeTask } = useDailyPlan(selectedDate);

  const assignedStarIds = useMemo(() => {
    const ids = new Set<string>();
    for (const block of Object.values(plan.blocks)) {
      for (const task of block) {
        ids.add(task.starId);
      }
    }
    return ids;
  }, [plan]);

  const availableStars = useMemo(() => {
    return stars.filter((s) => !assignedStarIds.has(s.id));
  }, [stars, assignedStarIds]);

  const isPastDay = selectedDate < today;

  const handleAssign = (block: BlockType) => {
    if (!selectedStarId || isPastDay) return;
    const star = stars.find((s) => s.id === selectedStarId);
    if (!star) return;
    assignTask(selectedStarId, star.constellationId, block);
    setSelectedStarId(null);
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w - 1)}>
          <Ionicons name="chevron-back" size={24} color={NeruColors.textMuted} />
        </TouchableOpacity>
        <View style={styles.weekDays}>
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayPill,
                selectedDate === day.date && styles.dayPillSelected,
                day.date === today && styles.dayPillToday,
              ]}
              onPress={() => { setSelectedDate(day.date); setSelectedStarId(null); }}
            >
              <Text style={[styles.dayLabel, day.isPast && styles.dayLabelPast]}>
                {day.label}
              </Text>
              <Text style={[
                styles.dayNum,
                selectedDate === day.date && styles.dayNumSelected,
                day.isPast && styles.dayNumPast,
              ]}>
                {day.dayNum}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w + 1)}>
          <Ionicons name="chevron-forward" size={24} color={NeruColors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Available Stars */}
        {!isPastDay && (
          <>
            <Text style={styles.sectionTitle}>Available Stars</Text>
            {constellations.map((c) => {
              const cStars = availableStars.filter((s) => s.constellationId === c.id);
              if (cStars.length === 0) return null;
              return (
                <View key={c.id} style={styles.constellationGroup}>
                  <Text style={styles.groupLabel}>{c.icon} {c.name}</Text>
                  {cStars.map((star) => (
                    <TouchableOpacity
                      key={star.id}
                      style={[styles.starRow, selectedStarId === star.id && styles.starRowSelected]}
                      onPress={() => setSelectedStarId(
                        selectedStarId === star.id ? null : star.id
                      )}
                    >
                      <View style={styles.starDot} />
                      <Text style={styles.starLabel}>{star.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
            {availableStars.length === 0 && (
              <Text style={styles.emptyText}>
                {stars.length === 0
                  ? 'Create constellations and add stars first'
                  : 'All stars are assigned'}
              </Text>
            )}
          </>
        )}

        {/* Time Blocks */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Time Blocks</Text>
        {BLOCK_LABELS.map((block) => {
          const blockTasks = plan.blocks[block.key];
          return (
            <TouchableOpacity
              key={block.key}
              style={[
                styles.blockZone,
                selectedStarId && !isPastDay && styles.blockZoneActive,
              ]}
              onPress={() => handleAssign(block.key)}
              disabled={!selectedStarId || isPastDay || blockTasks.length >= 4}
            >
              <View style={styles.blockHeader}>
                <Text style={[styles.blockLabel, { color: block.color }]}>{block.label}</Text>
                <Text style={styles.blockCount}>
                  {blockTasks.length}/4
                </Text>
              </View>
              {blockTasks.length > 0 ? (
                <View style={styles.chipRow}>
                  {blockTasks.map((task) => {
                    const c = constellations.find((x) => x.id === task.constellationId);
                    const s = stars.find((x) => x.id === task.starId);
                    return (
                      <TouchableOpacity
                        key={task.starId}
                        style={styles.chip}
                        onPress={() => {
                          if (!isPastDay) removeTask(task.starId, block.key);
                        }}
                      >
                        <Text style={styles.chipText}>
                          {c?.icon} {s?.label ? (s.label.length > 18 ? s.label.slice(0, 18) + '…' : s.label) : ''}
                        </Text>
                        {!isPastDay && (
                          <Ionicons name="close-circle" size={14} color={NeruColors.textDim} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyBlock}>
                  {selectedStarId && !isPastDay ? 'Tap to assign here' : 'Empty'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Save Button */}
        {!isPastDay && (
          <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveText}>Done</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeruColors.bg },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeruColors.cardBorder,
  },
  weekDays: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dayPill: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12 },
  dayPillSelected: { backgroundColor: 'rgba(167,139,250,0.15)' },
  dayPillToday: { borderWidth: 1, borderColor: NeruColors.violet },
  dayLabel: { fontSize: 11, color: NeruColors.textMuted, marginBottom: 2 },
  dayLabelPast: { color: NeruColors.textDim },
  dayNum: { fontSize: 16, fontWeight: '600', color: NeruColors.text },
  dayNumSelected: { color: NeruColors.violet },
  dayNumPast: { color: NeruColors.textDim },
  content: { padding: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: NeruColors.text, marginBottom: 12 },
  constellationGroup: { marginBottom: 12 },
  groupLabel: { fontSize: 13, color: NeruColors.textMuted, marginBottom: 6 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  starRowSelected: { borderColor: NeruColors.violet, backgroundColor: 'rgba(167,139,250,0.08)' },
  starDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NeruColors.textDim },
  starLabel: { fontSize: 14, color: NeruColors.text, flex: 1 },
  emptyText: { fontSize: 13, color: NeruColors.textDim, textAlign: 'center', paddingVertical: 20 },
  blockZone: {
    backgroundColor: NeruColors.card,
    borderWidth: 1,
    borderColor: NeruColors.cardBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  blockZoneActive: { borderColor: 'rgba(167,139,250,0.3)' },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  blockLabel: { fontSize: 15, fontWeight: '600' },
  blockCount: { fontSize: 12, color: NeruColors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, color: NeruColors.text },
  emptyBlock: { fontSize: 13, color: NeruColors.textDim },
  saveButton: {
    backgroundColor: NeruColors.violet,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
