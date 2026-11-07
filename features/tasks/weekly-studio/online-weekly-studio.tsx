import { SectionHeading } from '@/components/section-heading';
import { boxStyle } from '@/theme/boxes';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionButton, ButtonIcon, ButtonLabel, ChoiceCard, DismissSurface, ChoiceChip, IconButton, TextButton } from '@/components/app-controls';
import { iconGlyph } from '../../../lib/icons/icon-reference';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotionModal as Modal } from '@/components/motion';
import { createEditorialStyles } from '@/theme/editorial-theme';
import { useThemedStyles } from '@/theme/app-theme';
import { Palette, R, useTasksPalette } from '../tokens';
import { getWeekDateKeys, parseLocalDate, todayString } from '../time-helpers';
import { PlanningConfirmation } from '../connected/prompt-modal';
import { ServerPhoto } from '../connected/server-photo';
import { WeeklyStudioPresentation } from './weekly-studio-presentation';
import { canRemoveWeeklyTask, DEFAULT_WEEK_BLOCKS, weeklyCommand } from './online-week-model';
import { useOnlineWeek } from './use-online-week';

export function OnlineWeeklyStudio({ presentation = 'screen', onDismiss }: {
  presentation?: 'screen' | 'dialog'; onDismiss?: () => void;
}) {
  const router = useRouter();
  const colors = useTasksPalette();
  const S = useThemedStyles(themedStyles);
  const today = todayString();
  const [offset, setOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const dates = useMemo(() => getWeekDateKeys(parseLocalDate(today) ?? new Date(), offset), [today, offset]);
  const week = useOnlineWeek(dates);
  const [form, setForm] = useState<{ nebulaId: string; blockId: string; title: string; questId: string | null } | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const schedule = week.schedules[selectedDate];
  const blocks = useMemo(() => [...(schedule?.blocks ?? DEFAULT_WEEK_BLOCKS)].sort((a, b) => a.startTime.localeCompare(b.startTime)), [schedule]);
  const tasks = week.draft.days[selectedDate]?.tasks ?? schedule?.tasks ?? [];
  const changedDays = weeklyCommand(dates[0], week.draft).days;
  const staleDates = changedDays.filter(day => (week.schedules[day.date]?.updatedAt ?? null) !== day.expectedUpdatedAt).map(day => day.date);
  const pending = !!week.draft.attempt || !!week.pending.length || !!week.pendingPhotos.length;
  const blocked = week.busy || week.loading || !week.fresh || pending || staleDates.length> 0;
  const past = selectedDate < today;
  const activeNebulas = week.nebulas.filter(nebula => !nebula.archivedAt);
  const eligibleQuests = week.goals.filter(detail => detail.goal.status === 'active' && detail.goal.nebulaId === form?.nebulaId)
    .flatMap(detail => detail.phases.filter(group => group.phase.status === 'unlocked')
      .flatMap(group => group.quests.filter(quest => quest.status !== 'lit').map(quest => ({ ...quest, goalTitle: detail.goal.title }))));
  const close = () => { if (!week.busy) { if (onDismiss) onDismiss(); else router.back(); } };
  const changeWeek = (direction: number) => {
    const next = offset + direction;
    setOffset(next);
    setSelectedDate(next === 0 ? today : getWeekDateKeys(parseLocalDate(today) ?? new Date(), next)[0]);
    setForm(null);
  };
  const manageSky = () => { onDismiss?.(); router.push('/tasks/connected'); };
  const header = () => <View style={S.header}>
    <IconButton disabled={week.busy} accessibilityRole="button" accessibilityLabel="Close online Weekly Studio" onPress={close}><ButtonIcon name="arrow-back" size={21} /></IconButton>
    <View style={{ flex: 1 }}><Text style={S.title}>WEEKLY STUDIO</Text></View>
    <IconButton disabled={week.busy || week.loading} accessibilityRole="button" accessibilityLabel="Refresh online week" onPress={() => { void week.reload(); }}><ButtonIcon name="refresh" size={21} /></IconButton>
  </View>;

  return <WeeklyStudioPresentation dialog={presentation === 'dialog'} onDismiss={close}
    busy={week.busy}>
    {presentation !== 'dialog' && header()}
    <ScrollView style={{ flex: 1 }} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      {presentation === 'dialog' && <SectionHeading>Planning calendar</SectionHeading>}
      <View style={S.row}>
        <IconButton disabled={week.busy || week.loading} accessibilityRole="button" accessibilityLabel="Previous online week" onPress={() => changeWeek(-1)}><ButtonIcon name="chevron-back" size={20} /></IconButton>
        <Text style={[S.copy, { flex: 1, textAlign: 'center' }]}>{dates[0]} – {dates[6]}</Text>
        <IconButton disabled={week.busy || week.loading} accessibilityRole="button" accessibilityLabel="Next online week" onPress={() => changeWeek(1)}><ButtonIcon name="chevron-forward" size={20} /></IconButton>
      </View>
      <View style={S.row} accessibilityRole="tablist">
        {dates.map(date => <ChoiceCard key={date} disabled={week.busy} accessibilityRole="tab" accessibilityLabel={`Plan ${date}`} accessibilityState={{ selected: selectedDate === date }} onPress={() => { setSelectedDate(date); setForm(null); }} style={[S.day, selectedDate === date && S.selected]}>
          <Text style={[S.muted, selectedDate === date && S.onRed]}>{parseLocalDate(date)?.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}</Text>
          <Text style={[S.copy, selectedDate === date && S.onRed]}>{Number(date.slice(-2))}</Text>
          {week.draft.days[date] && <Text style={[S.muted, selectedDate === date && S.onRed]}>•</Text>}
        </ChoiceCard>)}
      </View>

      {week.loading && <ActivityIndicator color={colors.red} accessibilityLabel="Loading online week" />}
      {!!week.error && <Text accessibilityRole="alert" style={S.error}>{week.error}</Text>}
      {!!week.notice && <Text accessibilityLiveRegion="polite" style={S.muted}>{week.notice}</Text>}
      {!week.fresh && !week.loading && <Text style={S.muted}>Showing saved data. Reconnect and refresh to edit. Your draft stays on this device.</Text>}
      {pending && <View style={S.card}>{presentation === 'dialog' ? <SectionHeading>{'A save is waiting'}</SectionHeading> : <Text style={S.copy}>A save is waiting</Text>}<Text style={S.muted}>Retry before editing. The same save ID will be used after a reload.</Text>
        <TextButton disabled={week.busy || week.loading} accessibilityRole="button" accessibilityLabel="Retry weekly pending save" onPress={() => { void week.retry(); }}><ButtonLabel>Retry</ButtonLabel></TextButton>
      </View>}
      {!!staleDates.length && !pending && week.fresh && <View style={S.card}>{presentation === 'dialog' ? <SectionHeading>{'The online plan changed'}</SectionHeading> : <Text style={S.copy}>The online plan changed</Text>}<Text style={S.muted}>{staleDates.join(', ')}. Review the latest tasks before saving your draft.</Text>
        <TextButton disabled={week.busy} accessibilityRole="button" accessibilityLabel="Review latest weekly changes" onPress={() => { void week.review(); }}><ButtonLabel>Review latest</ButtonLabel></TextButton>
      </View>}
      <View style={S.row}><View style={{ flex: 1 }}>{presentation === 'dialog' ? <SectionHeading>{selectedDate}</SectionHeading> : <Text style={S.copy}>{selectedDate}</Text>}<Text style={S.muted}>{past ? 'Past day · view only' : 'Up to 4 tasks per block'}</Text></View>
        <ActionButton variant="primary" disabled={blocked || past || !activeNebulas.length || blocks.every(block => tasks.filter(task => task.blockId === block.id).length>= 4)}  accessibilityRole="button" accessibilityLabel="Add weekly online task" onPress={() => setForm({ nebulaId: activeNebulas[0]?.id ?? '', blockId: blocks.find(block => tasks.filter(task => task.blockId === block.id).length < 4)?.id ?? 'morning', title: '', questId: null })}><ButtonLabel>New task</ButtonLabel></ActionButton>
      </View>

      {week.nebulas.filter(nebula => !nebula.archivedAt || tasks.some(task => task.nebulaId === nebula.id)).map(nebula => {
        const dayTasks = tasks.filter(task => task.nebulaId === nebula.id);
        const plannedDays = dates.filter(date => (week.draft.days[date]?.tasks ?? week.schedules[date]?.tasks ?? []).some(task => task.nebulaId === nebula.id)).length;
        const completedDays = dates.filter(date => (week.schedules[date]?.tasks ?? []).some(task => task.nebulaId === nebula.id && task.status === 'lit')).length;
        return <View key={nebula.id} style={S.card}>{presentation === 'dialog' ? <SectionHeading>{`${iconGlyph(nebula.icon)} ${nebula.name}${nebula.archivedAt ? ' · archived' : ''}`}</SectionHeading> : <Text style={S.copy}>{iconGlyph(nebula.icon)} {nebula.name}{nebula.archivedAt ? ' · archived' : ''}</Text>}
          <Text style={S.muted}>{plannedDays}/7 days planned · {completedDays}/3 active days</Text>
          {!dayTasks.length && <Text style={S.muted}>Nothing planned for this day.</Text>}
          {dayTasks.map(task => <View key={task.id} testID={`weekly-task-${task.id}`} style={S.task}>
            <Text style={S.copy}>{task.status === 'lit' ? '★' : '☆'} {task.title}</Text>
            <Text style={S.muted}>{blocks.find(block => block.id === task.blockId)?.label ?? 'Without a block'} · {task.status}</Text>
            {!!task.completionPhotoUri && <ServerPhoto uri={task.completionPhotoUri} label={`Completion photo for ${task.title}`} style={{ width: 72, height: 60, borderRadius: R.sm }} />}
            <View style={S.wrap}>{blocks.filter(block => block.id !== task.blockId).map(block => <ActionButton key={block.id}  disabled={blocked || past || tasks.filter(item => item.blockId === block.id).length>= 4} accessibilityRole="button" accessibilityLabel={`Move weekly ${task.title} to ${block.label}`} onPress={() => { void week.moveTask(selectedDate, task.id, block.id); }}><ButtonLabel>{block.label}</ButtonLabel></ActionButton>)}
              {canRemoveWeeklyTask(task) && <ActionButton variant="destructive"  disabled={blocked || past} accessibilityRole="button" accessibilityLabel={`Remove weekly ${task.title}`} onPress={() => { void week.removeTask(selectedDate, task.id); }}><ButtonLabel>Remove</ButtonLabel></ActionButton>}
            </View>
          </View>)}
        </View>;
      })}
      {!week.nebulas.length && !week.loading && <Text style={S.muted}>Create a nebula or constellation to start planning.</Text>}
      <TextButton disabled={week.busy}  accessibilityRole="button" accessibilityLabel="Manage online nebulae and stars" onPress={manageSky}><ButtonLabel>Manage nebulae and stars</ButtonLabel></TextButton>
      <View style={S.card}><Text style={S.muted}>{changedDays.length ? `${changedDays.length} day(s) edited. Drafts survive reloads on this device.` : week.fresh ? 'Your online week is up to date.' : 'Refresh to check the latest online week.'}</Text>
        <View style={S.row}>
          <ActionButton variant="primary" disabled={blocked || !changedDays.length}  accessibilityRole="button" accessibilityLabel="Save week online" onPress={() => { void week.save(); }}><ButtonLabel>{week.busy ? 'Saving…' : 'Save week'}</ButtonLabel></ActionButton>
          <ActionButton disabled={week.busy || week.loading || pending || !changedDays.length}  accessibilityRole="button" accessibilityLabel="Undo online weekly draft" onPress={() => setDiscardOpen(true)}><ButtonLabel>Undo draft</ButtonLabel></ActionButton>
        </View>
      </View>
    </ScrollView>

    <Modal transparent animationType="fade" visible={!!form} onRequestClose={() => { if (!week.busy) setForm(null); }}>
      <DismissSurface style={S.backdrop} onPress={() => { if (!week.busy) setForm(null); }}><DismissSurface style={S.form} onPress={event => event.stopPropagation()}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          <SectionHeading>Task details</SectionHeading>
          <View style={S.wrap}>{activeNebulas.map(nebula => <ChoiceChip selected={form?.nebulaId === nebula.id} key={nebula.id} accessibilityRole="radio" accessibilityLabel={`Weekly nebula ${nebula.name}`} accessibilityState={{ selected: form?.nebulaId === nebula.id }}  disabled={week.busy} onPress={() => setForm(current => current && { ...current, nebulaId: nebula.id, questId: null, title: '' })}><ButtonLabel>{iconGlyph(nebula.icon)} {nebula.name}</ButtonLabel></ChoiceChip>)}</View>
          <ChoiceChip accessibilityRole="radio" accessibilityLabel="New ad-hoc weekly task" accessibilityState={{ selected: !form?.questId }} disabled={week.busy} onPress={() => setForm(current => current && { ...current, questId: null, title: '' })}><ButtonLabel>New task</ButtonLabel></ChoiceChip>
          {eligibleQuests.map(quest => <ChoiceCard selected={form?.questId === quest.id} key={quest.id} accessibilityRole="radio" accessibilityLabel={`Weekly star ${quest.title}`} accessibilityState={{ selected: form?.questId === quest.id }} disabled={week.busy} style={[S.chip, form?.questId === quest.id && S.selected]} onPress={() => setForm(current => current && { ...current, questId: quest.id, title: quest.title })}><Text style={[S.copy, form?.questId === quest.id && S.onRed]}>{quest.title} · {quest.completionCount}/{quest.timesRequired}</Text><Text style={[S.muted, form?.questId === quest.id && S.onRed]}>{quest.goalTitle}</Text></ChoiceCard>)}
          {!form?.questId && <TextInput accessibilityLabel="Weekly task name" placeholder="Task name" placeholderTextColor={colors.warmMuted} style={S.input} value={form?.title ?? ''} maxLength={240} onChangeText={title => setForm(current => current && { ...current, title })} />}
          <View style={S.wrap}>{blocks.map(block => <ChoiceChip selected={form?.blockId === block.id} key={block.id}  disabled={week.busy || tasks.filter(task => task.blockId === block.id).length>= 4} accessibilityRole="radio" accessibilityLabel={`Weekly block ${block.label}`} accessibilityState={{ selected: form?.blockId === block.id }} onPress={() => setForm(current => current && { ...current, blockId: block.id })}><ButtonLabel>{block.label}</ButtonLabel></ChoiceChip>)}</View>
          {!!week.error && <Text accessibilityRole="alert" style={S.error}>{week.error}</Text>}
          <View style={S.row}><ActionButton accessibilityRole="button" accessibilityLabel="Cancel weekly task"  disabled={week.busy} onPress={() => setForm(null)}><ButtonLabel>Cancel</ButtonLabel></ActionButton>
            <ActionButton variant="primary" accessibilityRole="button" accessibilityLabel="Add task to weekly draft"  disabled={blocked || !form?.title.trim()} onPress={() => { if (form) void week.addTask(selectedDate, form.blockId, { nebulaId: form.nebulaId, title: form.title, ...(form.questId ? { questId: form.questId } : {}) }).then(ok => { if (ok) setForm(null); }); }}><ButtonLabel>Add to draft</ButtonLabel></ActionButton></View>
        </ScrollView>
      </DismissSurface></DismissSurface>
    </Modal>
    {discardOpen && <PlanningConfirmation title="Discard this weekly draft?" description="The online plan is kept. Only this week's unsaved edits will be discarded." confirmLabel="Discard draft" busy={week.busy} error={week.error} onCancel={() => setDiscardOpen(false)} onConfirm={week.discard} />}
  </WeeklyStudioPresentation>;
}

const themedStyles = createEditorialStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 12, padding: 16, paddingBottom: 32 },
  title: { color: Palette.warmWhite, fontSize: 19, fontWeight: '800' },
  copy: { color: Palette.warmWhite, fontSize: 14, fontWeight: '700' },
  muted: { color: Palette.warmDim, fontSize: 12, lineHeight: 18 },
  error: { color: Palette.red, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRadius: R.sm, gap: 2 },
  selected: { backgroundColor: Palette.red },
  onRed: { color: Palette.onRed },
  card: { ...boxStyle(Palette, { variant: 'card', padding: 'sm' }), gap: 10 },
  task: { borderTopWidth: 1, borderColor: Palette.gray, paddingTop: 10, gap: 6 },
  chip: { minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderRadius: R.sm, borderWidth: 1, borderColor: Palette.gray },
  disabled: { opacity: 0.4 },
  backdrop: { ...boxStyle(Palette, { variant: 'backdrop' }), flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { ...boxStyle(Palette, { variant: 'dialog' }), maxWidth: 520, width: '100%', maxHeight: '85%' },
  input: { ...boxStyle(Palette, { variant: 'field' }), minHeight: 46, color: Palette.warmWhite },
}));
