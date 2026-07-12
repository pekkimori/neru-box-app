// app/(tabs)/index.tsx
// Thin orchestration shell for the Focused Observatory.

import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PhotoCompletionModal } from '@/components/candy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockType, Star } from '../../types/dreams';
import { removeStarRefsFromAllPlans } from '../../features/dreams/observatory/plans-cleanup';

import { Palette, Sp } from '../../features/dreams/tokens';
import { useObservatoryData } from '../../features/dreams/observatory/use-observatory-data';
import { ObservatoryHeader } from '../../features/dreams/observatory/observatory-header';
import { PeriodRail } from '../../features/dreams/observatory/period-rail';
import { RoutineGate } from '../../features/dreams/observatory/routine-gate';
import { ConstellationCanvas } from '../../features/dreams/observatory/constellation-canvas';
import { NebulaDeck } from '../../features/dreams/observatory/nebula-deck';
import { BottomToolbar } from '../../features/dreams/observatory/bottom-toolbar';
import { StarTaskList } from '../../features/dreams/observatory/star-task-list';
import { AddStarModal, AddConstellationModal } from '../../features/dreams/observatory/add-modals';
import {
  DeleteStarConfirmModal,
  DeleteConstellationConfirmModal,
} from '../../features/dreams/observatory/delete-modals';

export default function DreamsHub() {
  const router = useRouter();
  const d = useObservatoryData();

  const [starOpen, setStarOpen] = useState(false);
  const [consOpen, setConsOpen] = useState(false);
  const [delStar, setDelStar] = useState<Star | null>(null);
  const [delCons, setDelCons] = useState<{ id: string; name: string } | null>(null);
  const [delConsBusy, setDelConsBusy] = useState(false);
  const [photoVis, setPhotoVis] = useState(false);
  const [pc, setPc] = useState<{ star: Star; block: BlockType } | null>(null);

  const openAddStar = () => {
    if (d.constellations.length === 0) { setConsOpen(true); return; }
    setStarOpen(true);
  };

  const handleAddStar = async (p: {
    constellationId: string; label: string; block: BlockType; date: string | null;
  }): Promise<boolean> => {
    if (p.date === null) { d.addStar(p.constellationId, p.label); d.reloadWeekly(); return true; }
    if (p.date !== d.today) {
      const key = `@neru/plans/${p.date}`;
      const raw = await AsyncStorage.getItem(key);
      const tp = raw ? JSON.parse(raw)
        : { date: p.date, blocks: { morning: [], afternoon: [], evening: [] }, reflections: {} };
      if (tp.blocks[p.block].length >= 4) { Alert.alert('That block is full', 'Pick a different time block.'); return false; }
      const id = d.addStar(p.constellationId, p.label);
      tp.blocks[p.block].push({ starId: id, constellationId: p.constellationId, status: 'unlit', coinsEarned: 0 });
      await AsyncStorage.setItem(key, JSON.stringify(tp));
      d.reloadWeekly();
      return true;
    }
    if (d.plan.blocks[p.block].length >= 4) { Alert.alert('That block is full', 'Pick a different time block.'); return false; }
    const id = d.addStar(p.constellationId, p.label);
    d.assignTask(id, p.constellationId, p.block);
    d.reloadWeekly();
    return true;
  };

  const promptStarCompletion = (star: Star) => {
    const planned = d.plannedByStar.get(star.id);
    if (!planned) {
      Alert.alert('Plan first', 'Add this star to a time block before completing it.', [
        { text: 'Not now' }, { text: 'Planning', onPress: () => router.push('/dreams/plan') },
      ]);
      return;
    }
    if (planned.status === 'lit') { Alert.alert('Already lit', `${star.label} is complete.`); return; }

    const gate = d.canCompleteBlock(planned.block);
    if (!gate.can) {
      const msg = gate.reason === 'sleep_window'
        ? 'Sleep window is active. Tasks are paused until morning.'
        : "This period hasn't started yet.";
      Alert.alert('Cannot complete', msg);
      return;
    }

    const quests = d.getQuestsForBlock(planned.block);
    const done = quests.length === 0 || quests.every((q) => d.isQuestComplete(q.id));
    if (!done) {
      const periodLabel = planned.block.charAt(0).toUpperCase() + planned.block.slice(1);
      Alert.alert(
        `${periodLabel} routines not done`,
        `Complete your ${planned.block} routines before lighting this star.`,
        [
          { text: 'Not now' },
          { text: 'Go to routines', onPress: () => d.setSelectedPeriod(planned.block) },
        ],
      );
      return;
    }
    setPc({ star, block: planned.block });
    setPhotoVis(true);
  };

  const handlePhotoComplete = (uri: string) => {
    if (!pc) return;
    d.updateTaskStatus(pc.star.id, pc.block, 'lit', uri);
    d.awardCoins(pc.star.id, pc.block, 10);
    d.addCoins(10);
    setPhotoVis(false);
    setPc(null);
  };

  const deleteStarFromToday = (star: Star) => {
    const planned = d.plannedByStar.get(star.id);
    if (planned) d.removeTask(star.id, planned.block);
    d.deleteStar(star.id);
  };

  const promptDeleteStar = (star: Star) => {
    const planned = d.plannedByStar.get(star.id);
    if (planned?.status === 'lit') { setDelStar(star); return; }
    deleteStarFromToday(star);
  };

  const confirmDelStar = () => { if (delStar) { deleteStarFromToday(delStar); setDelStar(null); } };

  const confirmDelCons = async () => {
    if (!delCons || delConsBusy) return;
    setDelConsBusy(true);
    try {
      const nebulaStars = d.stars.filter((s) => s.constellationId === delCons.id);
      const starIds = new Set(nebulaStars.map((s) => s.id));
      for (const star of nebulaStars) {
        const p = d.plannedByStar.get(star.id);
        if (p) d.removeTask(star.id, p.block);
      }
      await removeStarRefsFromAllPlans(starIds);
      d.deleteConstellation(delCons.id);
    } finally {
      setDelCons(null);
      setDelConsBusy(false);
      d.reloadWeekly();
    }
  };

  if (!d.loaded) {
    return (
      <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
        <View style={S.skel}>
          <View style={S.skB} /><View style={[S.skB, { height: 48 }]} />
          <View style={[S.skB, { height: 90 }]} /><View style={[S.skB, { height: Sp.canvas }]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={S.scr} contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <ObservatoryHeader
          date={d.today} litCount={d.weekProgress.lit} totalPlanned={d.weekProgress.total}
          coins={d.coins} starsCount={d.stars.length} onAddStar={openAddStar}
        />
        <PeriodRail
          periods={d.periods} selectedPeriod={d.selectedPeriod}
          periodStateMap={d.periodStateMap} trueActivePeriod={d.trueActivePeriod}
          onSelect={d.setSelectedPeriod}
        />
        <RoutineGate
          routines={d.displayRoutines} isComplete={d.isQuestComplete}
          tasksUnlocked={d.tasksUnlocked} isSleepWindow={d.isSleepWindow}
          sleepReady={d.sleepReady} readOnly={d.routinesReadOnly}
          sleepBlocked={d.sleepBlocked} onToggle={d.toggleQuestComplete}
        />
        <ConstellationCanvas
          tasks={d.filteredTodayTasks.map(({ task }) => task)} stars={d.stars}
          constellations={d.constellations} selectedNebulaId={d.selectedNebulaId}
          tasksUnlocked={d.tasksUnlocked} onStarPress={promptStarCompletion} onAddStar={openAddStar}
        />
        <NebulaDeck
          constellations={d.constellations} stars={d.stars} plan={d.plan}
          editMode={d.editMode} selectedNebulaId={d.selectedNebulaId}
          onSelect={d.setSelectedNebulaId} onDelete={(id, name) => setDelCons({ id, name })}
        />
        <BottomToolbar
          editMode={d.editMode} onToggleEdit={() => d.setEditMode((v) => !v)}
          onAddNebula={() => setConsOpen(true)}
        />
        <StarTaskList
          tasks={d.filteredTodayTasks} stars={d.stars}
          constellations={d.constellations} editMode={d.editMode}
          onStarPress={promptStarCompletion} onDeleteStar={promptDeleteStar}
        />
      </ScrollView>

      <AddStarModal
        visible={starOpen} constellations={d.constellations}
        weekDays={d.weekDays} plan={{ blocks: d.plan.blocks }}
        selectedBlock={d.selectedBlock} onClose={() => setStarOpen(false)}
        onSubmit={handleAddStar}
      />
      <AddConstellationModal
        visible={consOpen} onClose={() => setConsOpen(false)}
        onSubmit={(name, icon) => { d.addConstellation(name, icon); return true; }}
      />
      <DeleteStarConfirmModal
        visible={delStar !== null} starLabel={delStar?.label ?? ''}
        onClose={() => setDelStar(null)} onConfirm={confirmDelStar}
      />
      <DeleteConstellationConfirmModal
        visible={delCons !== null} name={delCons?.name ?? ''}
        busy={delConsBusy}
        onClose={() => { if (!delConsBusy) setDelCons(null); }}
        onConfirm={confirmDelCons}
      />
      <PhotoCompletionModal
        visible={photoVis} taskLabel={pc?.star.label ?? ''}
        onComplete={handlePhotoComplete}
        onCancel={() => { setPhotoVis(false); setPc(null); }}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  scr: { flex: 1 },
  scroll: { paddingHorizontal: Sp.lg, paddingTop: Sp.lg, paddingBottom: Sp.bottom, gap: Sp.lg },
  skel: { gap: Sp.md, paddingHorizontal: Sp.lg, paddingTop: Sp.lg },
  skB: { height: 56, backgroundColor: Palette.bgElevated, borderRadius: 8 },
});
