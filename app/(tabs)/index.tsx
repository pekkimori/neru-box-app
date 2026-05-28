// app/(tabs)/index.tsx
import {
    CandyButton,
    CandyCard,
    CandyScreen,
    GalaxyView,
    PhotoCompletionModal,
    StarToken,
    StatusPill,
} from "@/components/candy";
import { CandyColors, CandySpacing } from "@/constants/candy-theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NeruColors } from "../../constants/neru-theme";
import { useCoins } from "../../hooks/useCoins";
import { useConstellations } from "../../hooks/useConstellations";
import { useDailyPlan } from "../../hooks/useDailyPlan";
import { useRoutineQuests } from "../../hooks/useRoutineQuests";
import type { BlockType, Star, TaskStatus } from "../../types/dreams";

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const BLOCK_CONFIG: {
  key: BlockType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "morning", label: "Morning", icon: "sunny", color: NeruColors.amber },
  {
    key: "afternoon",
    label: "Afternoon",
    icon: "partly-sunny",
    color: NeruColors.sky,
  },
  { key: "evening", label: "Evening", icon: "moon", color: NeruColors.violet },
];

function getCurrentBlock(now = new Date()): {
  key: BlockType;
  label: string;
  endAt: Date;
} {
  const hour = now.getHours();
  const endAt = new Date(now);

  if (hour >= 5 && hour < 12) {
    endAt.setHours(12, 0, 0, 0);
    return { key: "morning", label: "Morning", endAt };
  }

  if (hour >= 12 && hour < 18) {
    endAt.setHours(18, 0, 0, 0);
    return { key: "afternoon", label: "Afternoon", endAt };
  }

  if (hour >= 18) {
    endAt.setDate(endAt.getDate() + 1);
  }
  endAt.setHours(5, 0, 0, 0);
  return { key: "evening", label: "Evening", endAt };
}

function formatTimeLeft(endAt: Date): string {
  const minutes = Math.max(
    0,
    Math.ceil((endAt.getTime() - Date.now()) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours <= 0) return `${remainder}m left`;
  if (remainder === 0) return `${hours}h left`;
  return `${hours}h ${remainder}m left`;
}

export default function DreamsHub() {
  const router = useRouter();
  const today = todayString();
  const [starDraftFor, setStarDraftFor] = useState<string | null>(null);
  const [starDraft, setStarDraft] = useState("");
  const [starDraftOpen, setStarDraftOpen] = useState(false);
  const [starDraftBlock, setStarDraftBlock] = useState<BlockType>(
    getCurrentBlock().key,
  );
  const [starDraftDate, setStarDraftDate] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const days: { date: string; label: string; isPast: boolean }[] = [];
    const base = new Date(today + "T00:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        isPast: dateStr < today,
      });
    }
    return days;
  }, [today]);
  const [constellationDraftOpen, setConstellationDraftOpen] = useState(false);
  const [constellationName, setConstellationName] = useState("");
  const [constellationIcon, setConstellationIcon] = useState("✨");
  const [destroyMode, setDestroyMode] = useState(false);
  const [pendingDeleteStar, setPendingDeleteStar] = useState<Star | null>(null);
  const [pendingDeleteConstellation, setPendingDeleteConstellation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [pendingStarCompletion, setPendingStarCompletion] = useState<{
    star: Star;
    block: BlockType;
  } | null>(null);
  const { coins, addCoins } = useCoins();
  const { plan, assignTask, updateTaskStatus, awardCoins, removeTask } =
    useDailyPlan(today);
  const { getQuestsForBlock, isQuestComplete, toggleQuestComplete } =
    useRoutineQuests(today);
  const {
    constellations,
    stars,
    addConstellation,
    addStar,
    deleteStar,
    deleteConstellation,
  } = useConstellations();

  const currentBlock = getCurrentBlock();
  const currentRoutines = getQuestsForBlock(currentBlock.key);
  const periodIconName =
    currentBlock.key === "morning"
      ? "star"
      : currentBlock.key === "afternoon"
        ? "sunny"
        : "moon";
  const plannedByStar = new Map<
    string,
    { block: BlockType; status: TaskStatus }
  >();
  BLOCK_CONFIG.forEach((block) => {
    plan.blocks[block.key].forEach((task) => {
      plannedByStar.set(task.starId, { block: block.key, status: task.status });
    });
  });

  const todayTasks = useMemo(
    () =>
      plan.blocks[currentBlock.key].map((task) => ({
        block: currentBlock.key,
        task,
      })),
    [plan.blocks, currentBlock.key],
  );

  const openAddStar = (constellationId?: string) => {
    if (constellations.length === 0) {
      setConstellationDraftOpen(true);
      return;
    }
    const fallbackId =
      constellationId ??
      (constellations.length === 1 ? constellations[0].id : null);
    setStarDraftFor(fallbackId);
    setStarDraft("");
    setStarDraftBlock(currentBlock.key);
    setStarDraftDate(null);
    setStarDraftOpen(true);
  };

  const handleAddStar = async () => {
    const label = starDraft.trim();
    if (!starDraftFor || !label) return;

    if (starDraftDate === null) {
      addStar(starDraftFor, label);
      setStarDraft("");
      setStarDraftDate(null);
      setStarDraftOpen(false);
      return;
    }

    if (starDraftDate !== today) {
      const key = `@neru/plans/${starDraftDate}`;
      const raw = await AsyncStorage.getItem(key);
      const targetPlan = raw
        ? JSON.parse(raw)
        : { date: starDraftDate, blocks: { morning: [], afternoon: [], evening: [] }, reflections: {} };
      if (targetPlan.blocks[starDraftBlock].length >= 4) {
        Alert.alert("That block is full", "Pick a different time block for this task.");
        return;
      }
      const newStarId = addStar(starDraftFor, label);
      targetPlan.blocks[starDraftBlock].push({
        starId: newStarId,
        constellationId: starDraftFor,
        status: "unlit",
        coinsEarned: 0,
      });
      await AsyncStorage.setItem(key, JSON.stringify(targetPlan));
      setStarDraft("");
      setStarDraftDate(null);
      setStarDraftOpen(false);
      return;
    }

    if (plan.blocks[starDraftBlock].length >= 4) {
      Alert.alert(
        "That block is full",
        "Pick a different time block for this task.",
      );
      return;
    }
    const newStarId = addStar(starDraftFor, label);
    assignTask(newStarId, starDraftFor, starDraftBlock);
    setStarDraft("");
    setStarDraftDate(null);
    setStarDraftOpen(false);
  };

  const handleAddConstellation = () => {
    const name = constellationName.trim();
    if (!name) return;
    addConstellation(name, constellationIcon.trim() || "✨");
    setConstellationName("");
    setConstellationIcon("✨");
    setConstellationDraftOpen(false);
  };

  const handleDeleteConstellation = (constellationId: string, name: string) => {
    setPendingDeleteConstellation({ id: constellationId, name });
  };

  const confirmDeleteConstellation = () => {
    if (!pendingDeleteConstellation) return;
    const { id } = pendingDeleteConstellation;
    const starsToRemove = stars.filter((star) => star.constellationId === id);
    starsToRemove.forEach((star) => {
      const planned = plannedByStar.get(star.id);
      if (planned) {
        removeTask(star.id, planned.block);
      }
    });
    deleteConstellation(id);
    setPendingDeleteConstellation(null);
  };

  const promptStarCompletion = (star: Star) => {
    const planned = plannedByStar.get(star.id);
    if (!planned) {
      Alert.alert(
        "Plan this star first",
        "Add this star to a time block before completing it today.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Planning", onPress: () => router.push("/dreams/plan") },
        ],
      );
      return;
    }
    if (planned.status === "lit") {
      Alert.alert(
        "Already lit",
        `${star.label} is already complete for today.`,
      );
      return;
    }

    const blockQuests = getQuestsForBlock(planned.block);
    const routinesComplete =
      blockQuests.length === 0 ||
      blockQuests.every((quest) => isQuestComplete(quest.id));

    if (!routinesComplete) {
      const blockLabel =
        BLOCK_CONFIG.find((b) => b.key === planned.block)?.label ??
        "this block";
      Alert.alert(
        "Finish routines first",
        `Complete all ${blockLabel} routines before lighting this star.`,
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Go to routines",
            onPress: () => router.push(`/dreams/block/${planned.block}`),
          },
        ],
      );
      return;
    }

    setPendingStarCompletion({ star, block: planned.block });
    setPhotoModalVisible(true);
  };

  const handlePhotoComplete = (photoUri: string) => {
    if (!pendingStarCompletion) return;
    const { star, block } = pendingStarCompletion;

    updateTaskStatus(star.id, block, "lit", photoUri);
    awardCoins(star.id, block, 10);
    addCoins(10);

    setPhotoModalVisible(false);
    setPendingStarCompletion(null);
  };

  const handlePhotoCancel = () => {
    setPhotoModalVisible(false);
    setPendingStarCompletion(null);
  };

  const deleteStarFromToday = (star: Star) => {
    const planned = plannedByStar.get(star.id);

    if (planned) {
      removeTask(star.id, planned.block);
    }
    deleteStar(star.id);
  };

  const promptDeleteStar = (star: Star) => {
    const planned = plannedByStar.get(star.id);

    if (planned?.status === "lit") {
      setPendingDeleteStar(star);
      return;
    }

    deleteStarFromToday(star);
  };

  return (
    <CandyScreen variant="dreams">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDate(today)}</Text>
          <View style={styles.statusRow}>
            <StatusPill
              tone="gold"
              icon="star"
              label={`${stars.length} stars`}
            />
            <StatusPill tone="gold" icon="ellipse" label={`${coins} coins`} />
          </View>
        </View>

        <CandyCard tone="lavender" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.periodIcon}>
              <Ionicons
                name={periodIconName}
                size={28}
                color={CandyColors.white}
              />
            </View>
            <View style={styles.todayHeader}>
              <Text
                style={styles.todayTitle}
              >{`${currentBlock.label}'s tasks`}</Text>
              <CandyButton
                label="Add task"
                icon="add"
                variant="secondary"
                style={styles.todayAddButton}
                onPress={() => openAddStar()}
              />
            </View>
          </View>
          <StatusPill
            tone="sky"
            icon="time"
            label={`${currentBlock.label} · ${formatTimeLeft(currentBlock.endAt)}`}
            style={styles.currentPill}
          />
          <View style={styles.routinePanel}>
            {currentRoutines.length === 0 ? (
              <Text style={styles.routineEmpty}>
                No routine tasks for this time window.
              </Text>
            ) : (
              currentRoutines.map((quest) => {
                const complete = isQuestComplete(quest.id);
                return (
                  <TouchableOpacity
                    key={quest.id}
                    activeOpacity={0.82}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: complete }}
                    accessibilityLabel={`${quest.label}, ${complete ? "complete" : "not complete"}`}
                    onPress={() => toggleQuestComplete(quest.id)}
                    style={styles.routineRow}
                  >
                    <Ionicons
                      name={complete ? "checkmark-circle" : "ellipse-outline"}
                      size={21}
                      color={
                        complete ? CandyColors.mint : CandyColors.lavenderDeep
                      }
                    />
                    <Text
                      style={[
                        styles.routineText,
                        complete && styles.routineTextDone,
                      ]}
                    >
                      {quest.icon} {quest.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
          <View style={styles.routineSeparator} />
          <View style={styles.todayPanel}>
            {todayTasks.length === 0 ? (
              <Text style={styles.todayEmpty}>
                {constellations.length === 0
                  ? "Create a galaxy, then add your first task star."
                  : "No stars planned for this time window. Tap Planning to assign stars."}
              </Text>
            ) : (
              todayTasks.map(({ block, task }) => {
                const star = stars.find((s) => s.id === task.starId);
                const constellation = constellations.find(
                  (c) => c.id === task.constellationId,
                );
                const isLit = task.status === "lit";
                const taskLabel = star?.label ?? "Task";
                return (
                  <TouchableOpacity
                    key={`${block}-${task.starId}`}
                    style={[
                      styles.todayTaskRow,
                      isLit && styles.todayTaskRowDone,
                    ]}
                    onPress={() => {
                      if (star && !isLit) {
                        promptStarCompletion(star);
                      }
                    }}
                    disabled={!star || isLit}
                    accessibilityRole="button"
                    accessibilityLabel={`${taskLabel}, ${isLit ? "complete" : "not complete"}`}
                    accessibilityHint={
                      star && !isLit
                        ? "Marks this star as complete."
                        : undefined
                    }
                    accessibilityState={{ disabled: !star || isLit }}
                  >
                    <StarToken
                      state={isLit ? "filled" : "empty"}
                      tone={isLit ? "mint" : "gold"}
                      size={28}
                    />
                    <View style={styles.todayTaskCopy}>
                      <Text
                        style={[
                          styles.todayTaskLabel,
                          isLit && styles.todayTaskLabelDone,
                        ]}
                      >
                        {taskLabel}
                      </Text>
                      <Text style={styles.todayTaskMeta}>
                        {constellation?.icon} {constellation?.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </CandyCard>

        <View style={styles.actions}>
          <CandyButton
            label="Planning"
            icon="calendar"
            style={styles.actionButton}
            onPress={() => router.push("/dreams/plan")}
          />
        </View>

        <GalaxyView
          constellations={constellations}
          stars={stars}
          plannedByStar={plannedByStar}
          destroyMode={destroyMode}
          onStarPress={promptStarCompletion}
          onDeleteStar={promptDeleteStar}
          onAddStar={() => openAddStar()}
          onAddConstellation={() => setConstellationDraftOpen(true)}
          onDeleteConstellation={handleDeleteConstellation}
          onToggleDestroyMode={() => setDestroyMode((current) => !current)}
        />
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={starDraftOpen}
        onRequestClose={() => {
          setStarDraftFor(null);
          setStarDraftDate(null);
          setStarDraftOpen(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setStarDraftFor(null);
            setStarDraftDate(null);
            setStarDraftOpen(false);
          }}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Add task star</Text>
            {constellations.length > 1 ? (
              <>
                {starDraftFor ? (
                  <Text style={styles.pickerLabel}>Galaxy</Text>
                ) : (
                  <Text style={styles.constellationHint}>
                    Select a galaxy to continue.
                  </Text>
                )}
                <View style={styles.constellationPicker}>
                  {constellations.map((constellation) => (
                    <TouchableOpacity
                      key={constellation.id}
                      style={[
                        styles.constellationOption,
                        starDraftFor === constellation.id &&
                          styles.constellationOptionSelected,
                      ]}
                      onPress={() => setStarDraftFor(constellation.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${constellation.name}`}
                      accessibilityState={{
                        selected: starDraftFor === constellation.id,
                      }}
                    >
                      <Text style={styles.constellationOptionText}>
                        {constellation.icon} {constellation.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : constellations[0] ? (
              <Text style={styles.constellationHint}>
                Adding to {constellations[0].icon} {constellations[0].name}
              </Text>
            ) : null}
            <Text style={styles.pickerLabel}>Day</Text>
            <View style={styles.dayPicker}>
              <TouchableOpacity
                style={[
                  styles.dayOption,
                  styles.dayOptionAny,
                  starDraftDate === null && styles.dayOptionSelected,
                ]}
                onPress={() => setStarDraftDate(null)}
                accessibilityRole="button"
                accessibilityLabel="Any day, no assignment"
                accessibilityState={{ selected: starDraftDate === null }}
              >
                <Text
                  style={[
                    styles.dayOptionLabel,
                    starDraftDate === null && styles.dayOptionTextSelected,
                  ]}
                >
                  ?
                </Text>
                <Text
                  style={[
                    styles.dayOptionNum,
                    starDraftDate === null && styles.dayOptionTextSelected,
                  ]}
                >
                  ?
                </Text>
              </TouchableOpacity>
              {weekDays.map((day) => {
                const isSelected = starDraftDate === day.date;
                return (
                  <TouchableOpacity
                    key={day.date}
                    disabled={day.isPast}
                    style={[
                      styles.dayOption,
                      isSelected && styles.dayOptionSelected,
                      day.isPast && styles.dayOptionDisabled,
                    ]}
                    onPress={() => setStarDraftDate(day.date)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.label} ${day.dayNum}`}
                    accessibilityState={{ selected: isSelected, disabled: day.isPast }}
                  >
                    <Text
                      style={[
                        styles.dayOptionLabel,
                        isSelected && styles.dayOptionTextSelected,
                        day.isPast && styles.dayOptionTextDisabled,
                      ]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[
                        styles.dayOptionNum,
                        isSelected && styles.dayOptionTextSelected,
                        day.isPast && styles.dayOptionTextDisabled,
                      ]}
                    >
                      {day.dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.pickerLabel, starDraftDate === null && styles.pickerLabelDisabled]}>Time block</Text>
            <View style={[styles.blockPicker, starDraftDate === null && styles.blockPickerDisabled]}>
              {BLOCK_CONFIG.map((block) => {
                const count = plan.blocks[block.key].length;
                const isSelected = starDraftBlock === block.key;
                const isFull = count >= 4;
                return (
                  <TouchableOpacity
                    key={block.key}
                    style={[
                      styles.blockOption,
                      isSelected && styles.blockOptionSelected,
                      isFull && styles.blockOptionFull,
                      starDraftDate === null && styles.blockOptionDisabled,
                    ]}
                    onPress={() => setStarDraftBlock(block.key)}
                    disabled={starDraftDate === null}
                    accessibilityRole="button"
                    accessibilityLabel={`${block.label} block, ${count} of 4`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.blockOptionTextRow}>
                      <Text
                        style={[
                          styles.blockOptionText,
                          isFull && styles.blockOptionTextMuted,
                        ]}
                      >
                        {block.label}
                      </Text>
                      <Text
                        style={[
                          styles.blockOptionMeta,
                          isFull && styles.blockOptionTextMuted,
                        ]}
                      >
                        {count}/4
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={starDraft}
              onChangeText={setStarDraft}
              placeholder="Task name"
              placeholderTextColor={CandyColors.inkMuted}
              style={styles.input}
              autoFocus
            />
            <View style={styles.modalActions}>
              <CandyButton
                label="Cancel"
                variant="secondary"
                style={styles.modalButton}
                onPress={() => {
                  setStarDraftFor(null);
                  setStarDraftDate(null);
                  setStarDraftOpen(false);
                }}
              />
              <CandyButton
                label="Add"
                icon="add"
                style={styles.modalButton}
                disabled={!starDraft.trim() || !starDraftFor}
                onPress={handleAddStar}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={constellationDraftOpen}
        onRequestClose={() => setConstellationDraftOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setConstellationDraftOpen(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>New galaxy</Text>
            <View style={styles.constellationInputRow}>
              <TextInput
                value={constellationIcon}
                onChangeText={setConstellationIcon}
                placeholder="✨"
                placeholderTextColor={CandyColors.inkMuted}
                style={[styles.input, styles.iconInput]}
                maxLength={3}
              />
              <TextInput
                value={constellationName}
                onChangeText={setConstellationName}
                placeholder="Galaxy name"
                placeholderTextColor={CandyColors.inkMuted}
                style={[styles.input, styles.nameInput]}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <CandyButton
                label="Cancel"
                variant="secondary"
                style={styles.modalButton}
                onPress={() => setConstellationDraftOpen(false)}
              />
              <CandyButton
                label="Create"
                icon="add-circle"
                style={styles.modalButton}
                onPress={handleAddConstellation}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={pendingDeleteStar !== null}
        onRequestClose={() => setPendingDeleteStar(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPendingDeleteStar(null)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Delete completed star?</Text>
            <Text style={styles.modalText}>
              {pendingDeleteStar?.label} is already complete today. Delete it
              anyway?
            </Text>
            <View style={styles.modalActions}>
              <CandyButton
                label="Cancel"
                variant="secondary"
                style={styles.modalButton}
                onPress={() => setPendingDeleteStar(null)}
              />
              <CandyButton
                label="Delete"
                icon="trash"
                style={styles.modalButton}
                onPress={() => {
                  if (pendingDeleteStar) {
                    deleteStarFromToday(pendingDeleteStar);
                  }
                  setPendingDeleteStar(null);
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={pendingDeleteConstellation !== null}
        onRequestClose={() => setPendingDeleteConstellation(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPendingDeleteConstellation(null)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Delete galaxy?</Text>
            <Text style={styles.modalText}>
              {pendingDeleteConstellation?.name} and its stars will be removed.
            </Text>
            <View style={styles.modalActions}>
              <CandyButton
                label="Cancel"
                variant="secondary"
                style={styles.modalButton}
                onPress={() => setPendingDeleteConstellation(null)}
              />
              <CandyButton
                label="Delete"
                icon="trash"
                style={styles.modalButton}
                onPress={confirmDeleteConstellation}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <PhotoCompletionModal
        visible={photoModalVisible}
        taskLabel={pendingStarCompletion?.star.label ?? ''}
        onComplete={handlePhotoComplete}
        onCancel={handlePhotoCancel}
      />
    </CandyScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: CandySpacing.lg,
    paddingBottom: 128,
    gap: CandySpacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: CandySpacing.md,
    flexWrap: "wrap",
  },
  kicker: {
    color: CandyColors.lavenderDeep,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  dateText: {
    color: CandyColors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CandySpacing.xs,
    justifyContent: "flex-end",
    flexShrink: 1,
  },
  heroCard: {
    gap: CandySpacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: CandySpacing.md,
  },
  periodIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CandyColors.lavenderDeep,
    borderWidth: 2,
    borderColor: CandyColors.white,
    shadowColor: CandyColors.ink,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  todayHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: CandySpacing.sm,
  },
  todayTitle: {
    color: CandyColors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  todayAddButton: {
    minWidth: 120,
  },
  todayPanel: {
    gap: CandySpacing.sm,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.72)",
    padding: CandySpacing.md,
  },
  todayEmpty: {
    color: CandyColors.inkSoft,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  todayTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: CandySpacing.sm,
    backgroundColor: CandyColors.white,
    borderWidth: 2,
    borderColor: "rgba(255, 226, 122, 0.5)",
    borderRadius: 16,
    paddingHorizontal: CandySpacing.md,
    paddingVertical: CandySpacing.sm,
  },
  todayTaskRowDone: {
    opacity: 0.7,
  },
  todayTaskCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  todayTaskLabel: {
    color: CandyColors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  todayTaskLabelDone: {
    color: CandyColors.inkMuted,
    textDecorationLine: "line-through",
  },
  todayTaskMeta: {
    color: CandyColors.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  routinePanel: {
    gap: CandySpacing.sm,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.72)",
    padding: CandySpacing.md,
  },
  currentPill: {
    alignSelf: "flex-start",
  },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: CandySpacing.sm,
    minHeight: 28,
  },
  routineText: {
    flex: 1,
    minWidth: 0,
    color: CandyColors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  routineTextDone: {
    color: CandyColors.inkSoft,
    textDecorationLine: "line-through",
  },
  routineEmpty: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  routineSeparator: {
    height: 2,
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    borderRadius: 1,
  },
  actions: {
    flexDirection: "row",
    gap: CandySpacing.sm,
    flexWrap: "wrap",
  },
  actionButton: {
    flex: 1,
  },
  constellationSection: {
    gap: CandySpacing.md,
  },
  constellationCard: {
    gap: CandySpacing.md,
  },
  constellationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: CandySpacing.md,
  },
  constellationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: CandySpacing.xs,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CandyColors.lavender,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: CandyColors.white,
    shadowColor: CandyColors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconButtonDanger: {
    backgroundColor: CandyColors.danger,
  },
  constellationNameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: CandySpacing.sm,
  },
  constellationIcon: {
    fontSize: 30,
  },
  constellationNameCopy: {
    flex: 1,
    minWidth: 0,
  },
  constellationTitle: {
    color: CandyColors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  constellationSubtitle: {
    color: CandyColors.inkSoft,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  constellationMap: {
    height: 186,
    borderRadius: 22,
    backgroundColor: "rgba(255, 248, 237, 0.78)",
    borderWidth: 2,
    borderColor: "rgba(255, 226, 122, 0.65)",
    overflow: "hidden",
    position: "relative",
  },
  constellationNode: {
    position: "absolute",
    width: 86,
    alignItems: "center",
    gap: 4,
    transform: [{ translateX: -18 }],
  },
  constellationNodeDestroy: {
    opacity: 0.72,
  },
  nodeLabel: {
    color: CandyColors.ink,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
    textAlign: "center",
    backgroundColor: CandyColors.white,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
    maxWidth: 86,
  },
  moreStarsPill: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: CandyColors.lavender,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: CandyColors.white,
  },
  moreStarsText: {
    color: CandyColors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  constellationEmpty: {
    gap: CandySpacing.md,
  },
  constellationEmptyCopy: {
    gap: CandySpacing.xs,
  },
  emptyConstellationMap: {
    minHeight: 132,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.25)",
    backgroundColor: "rgba(255, 248, 237, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    gap: CandySpacing.sm,
  },
  emptyConstellationText: {
    color: CandyColors.inkSoft,
    fontSize: 13,
    fontWeight: "900",
  },
  bottomAddButton: {
    alignSelf: "stretch",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 41, 55, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    padding: CandySpacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 28,
    backgroundColor: CandyColors.white,
    borderWidth: 3,
    borderColor: "rgba(255, 226, 122, 0.8)",
    padding: CandySpacing.lg,
    gap: CandySpacing.md,
    shadowColor: CandyColors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modalTitle: {
    color: CandyColors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  modalText: {
    color: CandyColors.inkSoft,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  pickerLabel: {
    color: CandyColors.inkSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  pickerLabelDisabled: {
    opacity: 0.38,
  },
  constellationPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CandySpacing.xs,
    marginTop: CandySpacing.xs,
    marginBottom: CandySpacing.xs,
  },
  constellationOption: {
    paddingHorizontal: CandySpacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.26)",
    backgroundColor: CandyColors.white,
  },
  constellationOptionSelected: {
    backgroundColor: "#F0E9FF",
    borderColor: CandyColors.lavenderDeep,
  },
  constellationOptionText: {
    color: CandyColors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  constellationHint: {
    color: CandyColors.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  blockPicker: {
    gap: CandySpacing.xs,
  },
  blockPickerDisabled: {
    opacity: 0.38,
  },
  blockOption: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.26)",
    backgroundColor: CandyColors.white,
    paddingHorizontal: CandySpacing.md,
    paddingVertical: 8,
  },
  blockOptionSelected: {
    backgroundColor: "#F0E9FF",
    borderColor: CandyColors.lavenderDeep,
  },
  blockOptionFull: {
    borderColor: "rgba(248, 113, 113, 0.4)",
  },
  blockOptionDisabled: {
    opacity: 0.42,
  },
  dayPicker: {
    flexDirection: "row",
    gap: CandySpacing.xs,
  },
  dayOption: {
    width: 44,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.26)",
    backgroundColor: CandyColors.white,
  },
  dayOptionSelected: {
    backgroundColor: "#F0E9FF",
    borderColor: CandyColors.lavenderDeep,
  },
  dayOptionDisabled: {
    opacity: 0.32,
  },
  dayOptionAny: {
    borderStyle: "dashed",
  },
  dayOptionLabel: {
    color: CandyColors.ink,
    fontSize: 11,
    fontWeight: "800",
  },
  dayOptionNum: {
    color: CandyColors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  dayOptionTextSelected: {
    color: CandyColors.lavenderDeep,
  },
  dayOptionTextDisabled: {
    color: CandyColors.inkMuted,
  },
  blockOptionTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blockOptionText: {
    color: CandyColors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  blockOptionMeta: {
    color: CandyColors.inkSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  blockOptionTextMuted: {
    color: CandyColors.inkMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255, 248, 237, 0.94)",
    borderWidth: 2,
    borderColor: "rgba(167, 139, 250, 0.26)",
    paddingHorizontal: CandySpacing.md,
    color: CandyColors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  constellationInputRow: {
    flexDirection: "row",
    gap: CandySpacing.sm,
  },
  iconInput: {
    width: 72,
    textAlign: "center",
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
  },
  modalActions: {
    flexDirection: "row",
    gap: CandySpacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
