import { AppBox } from '@/components/app-box';
import { ScrollView } from '@/components/feedback-scroll-view';
import { ActionButton, ActionRow, ButtonIcon, ButtonLabel, TextButton } from '@/components/app-controls';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { EditorModal, SectionLabel } from './components';
import { AppsEditorContent, FocusEditorContent, ModeEditorContent, RestPromptContent, ScheduleEditorContent } from './editors';
import { getFocusBlockError, formatDuration, type ControlEditor } from './model';
import { parseTimeMinutes as timeToMinutes, durationBetweenTimes as durationBetween } from '@/utils/time';
import { controlStyles } from './styles';
import { useControlScreen } from './use-control-screen';

export default function ControlScreen() {
  const { colors: Palette } = useAppTheme();
  const styles = useThemedStyles(controlStyles);
  const {
    editor,
    setEditor,
    search,
    setSearch,
    sleepError,
    retrySleep,
    selectedApps,
    appsError,
    retryApps,
    blocksError,
    retryBlocks,
    effects,
    effectsError,
    retryEffects,
    editingMode,
    setEditingMode,
    durationSettings,
    appsDraft,
    blocksDraft,
    effectsDraft,
    sleepDraft,
    durationDraft,
    editorError,
    setFocusBlocks,
    setFocusDuration,
    openEditor,
    saveEditor,
    session,
    remainingSeconds,
    startRestSession,
    endSession,
    sessionError,
    retrySession,
    selectedIds,
    filteredApps,
    validFocusBlocks,
    date,
    sleepTimelineSegments,
    scheduledFocusMinutes,
    modeMeta,
    toggleApp,
    updateLimit,
    updateSleep,
    updateBlock,
    updateEffect,
    startFocus,
    formatCountdown
  } = useControlScreen();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Control"
          tabIndex={0}
          actions={[
            {
              accessibilityLabel: session
                ? `End ${session.kind} session`
                : "Start focus session",
              icon: session ? "stop-outline" : "play-outline",
              active: Boolean(session),
              onPress: () => (session ? endSession() : openEditor("focus")),
            },
            {
              accessibilityLabel: "Open mode settings",
              icon: "options-outline",
              onPress: () => openEditor("mode"),
            },
          ]}
        />

        {[appsError, blocksError, effectsError, sleepError, sessionError, durationSettings.error].some(Boolean) && <TextButton accessibilityRole="button" accessibilityLabel="Retry settings save" onPress={() => { void Promise.allSettled([retryApps(), retryBlocks(), retryEffects(), retrySleep(), retrySession(), durationSettings.retry()]); }}><ButtonLabel accessibilityRole="alert">{[appsError, blocksError, effectsError, sleepError, sessionError, durationSettings.error].find(Boolean)?.message} · Retry</ButtonLabel></TextButton>}
        <AppBox variant="inset" style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={styles.modeIdentity}>
              <AppBox variant="icon" padding="none" tone="solid" style={styles.modeIcon}>
                <Ionicons
                  name={modeMeta.icon}
                  size={22}
                  color={Palette.onAccent}
                />
              </AppBox>
              <View>
                <Text style={styles.statusLabel}>Active now</Text>
                <Text style={styles.modeTitle}>{modeMeta.label}</Text>
              </View>
            </View>
            <Text style={styles.clock}>
              {date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {formatDuration(scheduledFocusMinutes)}
              </Text>
              <Text style={styles.metricLabel}>FOCUS PLANNED</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{selectedApps.length}</Text>
              <Text style={styles.metricLabel}>APPS LIMITED</Text>
            </View>
          </View>
          {session ? (
            <View style={styles.sessionRow}>
              <Text style={styles.sessionTime}>
                {formatCountdown(remainingSeconds)}
              </Text>
              <ActionButton style={{ flex: 1 }}
                onPress={endSession}

                accessibilityLabel={`End ${session.kind} session`}
              >
                <ButtonLabel>
                  End {session.kind === "rest" ? "rest" : "session"}
                </ButtonLabel>
              </ActionButton>
            </View>
          ) : (
            <ActionButton style={{ flex: 1 }} variant="primary"
              onPress={() => openEditor("focus")}
            >
              <ButtonIcon name="play" size={16} />
              <ButtonLabel>Start focus</ButtonLabel>
            </ActionButton>
          )}
        </AppBox>

        <View style={{ gap: 12 }}>
        <View style={styles.sectionHeader}>
          <SectionLabel>Today</SectionLabel>
          <TextButton onPress={() => openEditor("schedule")}>
            <ButtonLabel>Edit schedule</ButtonLabel>
          </TextButton>
        </View>
        <AppBox variant="card" style={styles.timelineCard}>
          <View style={styles.timelineTrack}>
            {validFocusBlocks.map((block) => {
              const start = timeToMinutes(block.start) ?? 0;
              const length = durationBetween(block.start, block.end) ?? 0;
              return (
                <View
                  key={block.id}
                  style={[
                    styles.timelineFocus,
                    {
                      left: `${(start / 1440) * 100}%`,
                      width: `${Math.min(length / 1440, 1 - start / 1440) * 100}%`,
                    },
                  ]}
                />
              );
            })}
            {sleepTimelineSegments.map((segment, index) => (
              <View
                key={`sleep-${index}`}
                style={[
                  styles.timelineSleep,
                  {
                    left: `${(segment.start / 1440) * 100}%`,
                    width: `${(segment.duration / 1440) * 100}%`,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.hourRow}>
            {["00", "06", "12", "18", "24"].map((hour) => (
              <Text key={hour} style={styles.hour}>
                {hour}
              </Text>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Palette.line }]}
              />
              <Text style={styles.legendText}>Normal</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Palette.red }]}
              />
              <Text style={styles.legendText}>Focus</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Palette.blue }]}
              />
              <Text style={styles.legendText}>Sleep</Text>
            </View>
          </View>
        </AppBox>

        </View>

        <View style={{ gap: 12 }}>
        <SectionLabel>Configure</SectionLabel>
        <AppBox variant="group" style={styles.menuCard}>
          {[
            {
              editor: "apps" as ControlEditor,
              icon: "apps-outline" as const,
              title: "Apps & limits",
            },
            {
              editor: "schedule" as ControlEditor,
              icon: "calendar-outline" as const,
              title: "Schedule",
            },
            {
              editor: "mode" as ControlEditor,
              icon: "options-outline" as const,
              title: "Mode settings",
            },
          ].map((item, index) => (
            <ActionRow
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => openEditor(item.editor)}
              style={[styles.menuRow, index> 0 && styles.menuBorder]}
            >
              <AppBox variant="icon" style={styles.menuIcon}>
                <Ionicons name={item.icon} size={21} color={Palette.ink} />
              </AppBox>
              <View style={styles.menuCopy}>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Palette.muted}
              />
            </ActionRow>
          ))}
        </AppBox>

        </View>

      </ScrollView>

      <EditorModal
        visible={editor === "apps"}
        title="Apps & limits"
        onSave={saveEditor}
        error={editorError}
        onClose={() => {
          setEditor(null);
          setSearch("");
        }}
      >
        <AppsEditorContent
          search={search}
          setSearch={setSearch}
          selectedApps={appsDraft.value}
          selectedIds={selectedIds}
          filteredApps={filteredApps}
          toggleApp={toggleApp}
          updateLimit={updateLimit}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "schedule"}
        title="Schedule"
        onSave={saveEditor}
        error={editorError}
        onClose={() => setEditor(null)}
      >
        <ScheduleEditorContent
          schedule={sleepDraft.value}
          updateSleep={updateSleep}
          focusBlocks={blocksDraft.value}
          setFocusBlocks={setFocusBlocks}
          updateBlock={updateBlock}
          blockError={block => getFocusBlockError(block, blocksDraft.value, sleepDraft.value)}
          showErrors={!!editorError}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "focus"}
        title="Start focus"
        fill={false}
        onClose={() => setEditor(null)}
      >
        <FocusEditorContent
          focusDuration={durationDraft.value}
          setFocusDuration={setFocusDuration}
          startFocus={startFocus}
        />
        {!!editorError && <Text accessibilityRole="alert" style={{ color: Palette.accentStrong, padding: 20 }}>{editorError}</Text>}
      </EditorModal>

      <EditorModal
        visible={editor === "rest"}
        title="Focus complete"
        onClose={() => setEditor(null)}
      >
        <RestPromptContent
          restMinutes={effects.focus.breakMinutes}
          startRest={() => {
            startRestSession(effects.focus.breakMinutes);
            setEditor(null);
          }}
        />
      </EditorModal>

      <EditorModal
        visible={editor === "mode"}
        title="Mode settings"
        onSave={saveEditor}
        error={editorError}
        onClose={() => setEditor(null)}
      >
        <ModeEditorContent
          editingMode={editingMode}
          setEditingMode={setEditingMode}
          effects={effectsDraft.value}
          updateEffect={updateEffect}
          selectedApps={selectedApps}
        />
      </EditorModal>
    </SafeAreaView>
  );
}
