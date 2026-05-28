// app/dreams/plan.tsx
import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CandyButton, CandyScreen, StarToken } from '@/components/candy';
import { CandyColors, CandyRadii, CandyShadow, CandySpacing } from '@/constants/candy-theme';
import { useConstellations } from '../../hooks/useConstellations';
import { useDailyPlan } from '../../hooks/useDailyPlan';
import type { BlockType } from '../../types/dreams';

const BLOCK_LABELS: { key: BlockType; label: string; color: string }[] = [
  { key: 'morning', label: 'Morning', color: CandyColors.goldDeep },
  { key: 'afternoon', label: 'Afternoon', color: '#257198' },
  { key: 'evening', label: 'Evening', color: CandyColors.lavenderDeep },
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
    <CandyScreen variant="dreams">
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          accessibilityHint="Shows the previous week of planning days."
          onPress={() => setWeekOffset((w) => w - 1)}
        >
          <Ionicons name="chevron-back" size={24} color={CandyColors.inkSoft} />
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
              accessibilityRole="button"
              accessibilityLabel={`Select ${day.label} ${day.dayNum}`}
              accessibilityHint="Shows planning blocks and available stars for this day."
              accessibilityState={{ selected: selectedDate === day.date }}
            >
              <Text style={[
                styles.dayLabel,
                day.isPast && styles.dayLabelPast,
                selectedDate === day.date && styles.dayTextSelected,
              ]}>
                {day.label}
              </Text>
              <Text style={[
                styles.dayNum,
                day.isPast && styles.dayNumPast,
                selectedDate === day.date && styles.dayTextSelected,
              ]}>
                {day.dayNum}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Next week"
          accessibilityHint="Shows the next week of planning days."
          onPress={() => setWeekOffset((w) => w + 1)}
        >
          <Ionicons name="chevron-forward" size={24} color={CandyColors.inkSoft} />
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
                      accessibilityRole="button"
                      accessibilityLabel={`Select star ${star.label}`}
                      accessibilityHint="Selects this star so it can be assigned to a time block."
                      accessibilityState={{ selected: selectedStarId === star.id }}
                    >
                      <StarToken state={selectedStarId === star.id ? 'filled' : 'empty'} tone="gold" size={34} />
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
              accessibilityRole="button"
              accessibilityLabel={`${block.label} block, ${blockTasks.length} of 4 stars assigned`}
              accessibilityHint="Assigns the selected star to this time block."
              accessibilityState={{ disabled: !selectedStarId || isPastDay || blockTasks.length >= 4 }}
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
                    const starLabel = s?.label ?? 'assigned star';
                    return (
                      <TouchableOpacity
                        key={task.starId}
                        style={styles.chip}
                        onPress={() => {
                          if (!isPastDay) removeTask(task.starId, block.key);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${starLabel} from ${block.label}`}
                        accessibilityHint="Removes this star from the time block."
                        accessibilityState={{ disabled: isPastDay }}
                      >
                        <StarToken state="filled" tone="lavender" size={26} />
                        <Text style={styles.chipText}>
                          {c?.icon} {s?.label ? (s.label.length > 18 ? s.label.slice(0, 18) + '...' : s.label) : ''}
                        </Text>
                        {!isPastDay && (
                          <Ionicons name="close-circle" size={16} color={CandyColors.inkMuted} />
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
          <CandyButton label="Done" icon="checkmark" onPress={() => router.back()} style={styles.saveButton} />
        )}
      </ScrollView>
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: CandySpacing.md,
    gap: CandySpacing.xs,
  },
  weekDays: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayPill: {
    minWidth: 38,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderRadius: CandyRadii.pill,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#E9DCF9',
  },
  dayPillSelected: {
    backgroundColor: CandyColors.lavender,
    borderColor: CandyColors.lavenderDeep,
  },
  dayPillToday: { borderColor: CandyColors.gold },
  dayLabel: { fontSize: 11, fontWeight: '800', color: CandyColors.inkSoft, marginBottom: 2 },
  dayLabelPast: { color: CandyColors.inkMuted },
  dayNum: { fontSize: 16, fontWeight: '900', color: CandyColors.ink },
  dayTextSelected: { color: CandyColors.white },
  dayNumPast: { color: CandyColors.inkMuted },
  content: { paddingTop: CandySpacing.sm, paddingBottom: 120 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: CandyColors.ink, marginBottom: CandySpacing.sm },
  constellationGroup: { marginBottom: CandySpacing.md },
  groupLabel: { fontSize: 13, fontWeight: '800', color: CandyColors.inkSoft, marginBottom: CandySpacing.xs },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.sm,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#FFE7A0',
    borderRadius: CandyRadii.lg,
    padding: CandySpacing.md,
    marginBottom: CandySpacing.xs,
    ...CandyShadow.card,
  },
  starRowSelected: { borderColor: CandyColors.lavenderDeep, backgroundColor: '#F7F2FF' },
  starLabel: { fontSize: 14, fontWeight: '800', color: CandyColors.ink, flex: 1 },
  emptyText: { fontSize: 13, color: CandyColors.inkMuted, textAlign: 'center', paddingVertical: 20 },
  blockZone: {
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    borderRadius: CandyRadii.lg,
    padding: CandySpacing.lg,
    marginBottom: CandySpacing.sm,
    ...CandyShadow.card,
  },
  blockZoneActive: { borderColor: CandyColors.lavenderDeep, backgroundColor: '#F9F5FF' },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: CandySpacing.sm },
  blockLabel: { fontSize: 15, fontWeight: '900' },
  blockCount: { fontSize: 12, fontWeight: '900', color: CandyColors.inkSoft },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: CandySpacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
    backgroundColor: '#F0E9FF',
    borderRadius: CandyRadii.pill,
    borderWidth: 2,
    borderColor: '#D8CAFF',
    paddingHorizontal: CandySpacing.sm,
    paddingVertical: 5,
  },
  chipText: { fontSize: 13, fontWeight: '800', color: CandyColors.ink },
  emptyBlock: { fontSize: 13, color: CandyColors.inkMuted },
  saveButton: { marginTop: CandySpacing.lg },
});
