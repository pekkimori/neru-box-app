import { SectionHeading } from '@/components/section-heading';
import { Space } from '@/theme/layout';
import { boxStyle } from '@/theme/boxes';
import { AppBox } from '@/components/app-box';
import { ActionButton, ButtonLabel, ChoiceCard, ChoiceChip, TextButton } from '@/components/app-controls';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';


import { useAppTheme, useThemedStyles } from '@/theme/app-theme';
import { createEditorialPalette, createEditorialStyles } from '@/theme/editorial-theme';
import { Type } from '@/theme/typography';
import { PERSONALITIES, type MemoryItem, type PersonalityId } from './preview-model';
import { FOCUS_TIMES, QUIZ_QUESTIONS, readQuizProfile, recommendPersonality, type QuizProfile } from './personality-quiz-model';

const Palette = createEditorialPalette();

export function PersonalityQuiz({ memories, disabled, onSave, onCancel }: {
  memories: MemoryItem[];
  disabled: boolean;
  onSave: (personality: PersonalityId, profile: QuizProfile) => Promise<boolean>;
  onCancel: () => void;
}) {
  const styles = useThemedStyles(themedStyles);
  const { colors } = useAppTheme();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PersonalityId[]>([]);
  const [profile, setProfile] = useState(() => readQuizProfile(memories));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const locked = disabled || saving;
  const question = QUIZ_QUESTIONS[step];
  const isAboutYou = step === QUIZ_QUESTIONS.length;
  const isResult = step> QUIZ_QUESTIONS.length;
  const personality = PERSONALITIES.find(item => item.id === recommendPersonality(answers))!;
  const progress = Math.min(step + 1, 4);
  const setField = (field: keyof QuizProfile, value: string) => setProfile(current => ({ ...current, [field]: value }));

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      if (await onSave(personality.id, profile)) onCancel();
      else setSaveError('Could not use this match. Please try again.');
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not use this match. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SectionHeading>{isResult ? 'YOUR MATCH' : `STEP ${progress} OF 4 · ABOUT A MINUTE`}</SectionHeading>
      <View accessibilityRole="progressbar" accessibilityLabel="Quiz progress" accessibilityValue={{ min: 0, max: 4, now: isResult ? 4 : step }} style={styles.progress}>
        {[0, 1, 2, 3].map(index => <View key={index} style={[styles.progressSegment, index < (isResult ? 4 : step) && styles.progressComplete]} />)}
      </View>

      {question ? (
        <>
          <SectionHeading style={styles.headingSpacing}>{question.title}</SectionHeading>
          <View accessibilityRole="radiogroup" accessibilityLabel={question.title} style={styles.options}>
            {question.options.map(option => {
              const selected = answers[step] === option.personality;
              return (
                <ChoiceCard key={option.personality} accessibilityRole="radio" accessibilityState={{ selected, disabled: locked }} disabled={locked}
                  onPress={() => setAnswers(current => { const next = [...current]; next[step] = option.personality; return next; })}
                  style={[styles.option, selected && styles.selected]}>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.red : colors.muted} />
                  <Text style={styles.optionText}>{option.label}</Text>
                </ChoiceCard>
              );
            })}
          </View>
        </>
      ) : isAboutYou ? (
        <>
          <SectionHeading style={styles.headingSpacing}>A little about you.</SectionHeading>
          <Text style={styles.label}>WHAT SHOULD NERU CALL YOU? · OPTIONAL</Text>
          <TextInput accessibilityLabel="Preferred name (optional)" value={profile.name} onChangeText={value => setField('name', value)} editable={!locked}
            placeholder="Your name or nickname" placeholderTextColor={colors.muted} maxLength={60} autoComplete="nickname" style={styles.input} />
          <Text style={styles.label}>WHAT WOULD YOU LIKE HELP WITH?</Text>
          <TextInput accessibilityLabel="Current goal" value={profile.goal} onChangeText={value => setField('goal', value)} editable={!locked}
            placeholder="e.g. Build a consistent study routine" placeholderTextColor={colors.muted} maxLength={160} multiline style={[styles.input, styles.goalInput]} />
          <SectionHeading style={styles.headingSpacing}>When do you focus best? · Optional</SectionHeading>
          <View accessibilityRole="radiogroup" accessibilityLabel="Best focus time" style={styles.chips}>
            {FOCUS_TIMES.map(time => <ChoiceChip key={time} accessibilityRole="radio" accessibilityState={{ selected: profile.focusTime === time, disabled: locked }} disabled={locked}
              onPress={() => setField('focusTime', profile.focusTime === time ? '' : time)}>
              <ButtonLabel>{time}</ButtonLabel>
            </ChoiceChip>)}
          </View>
        </>
      ) : (
        <>
          <SectionHeading style={styles.headingSpacing}>{`${personality.label} is your match.`}</SectionHeading>
          <Text style={styles.description}>{personality.description}</Text>
          <AppBox variant="notice" padding="md" tone="accent" style={styles.match}>
            <SectionHeading style={styles.headingSpacing}>A little preview</SectionHeading>
            <Text style={styles.preview}>{personality.greeting}</Text>
          </AppBox>
          <SectionHeading style={styles.headingSpacing}>What NERU will remember</SectionHeading>
          <View style={styles.summary}>
            {!!profile.name.trim() && <Text style={styles.optionText}>Call me {profile.name.trim()}</Text>}
            <Text style={styles.optionText}>My goal: {profile.goal.trim()}</Text>
            {!!profile.focusTime && <Text style={styles.optionText}>Best focus time: {profile.focusTime}</Text>}
          </View>
          {saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text>}
        </>
      )}

      <View style={styles.actions}>
        <TextButton accessibilityRole="button" disabled={locked} onPress={() => step === 0 ? onCancel() : setStep(current => current - 1)}>
          <ButtonLabel>{step === 0 ? 'Not now' : 'Back'}</ButtonLabel>
        </TextButton>
        <ActionButton style={{ flex: 1 }} variant="primary" accessibilityRole="button" accessibilityLabel={isResult ? 'Use my match' : isAboutYou ? 'See my match' : 'Continue'} accessibilityState={{ disabled: locked || (isAboutYou ? !profile.goal.trim() : !isResult && !answers[step]) }}
          disabled={locked || (isAboutYou ? !profile.goal.trim() : !isResult && !answers[step])}
          onPress={isResult ? save : () => setStep(current => current + 1)}
        >
          {saving && <ActivityIndicator size="small" color={colors.onAccent} />}
          <ButtonLabel>{saving ? 'Applying…' : isResult ? 'Use my match' : isAboutYou ? 'See my match' : 'Continue'}</ButtonLabel>
          {!saving && <Ionicons name={isResult ? 'checkmark' : 'arrow-forward'} size={17} color={colors.onAccent} />}
        </ActionButton>
      </View>
    </View>
  );
}

const themedStyles = createEditorialStyles(() => ({
  container: { paddingBottom: 12 },
  progress: { flexDirection: 'row', gap: 5, marginTop: 12, marginBottom: Space.xxl },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Palette.line },
  progressComplete: { backgroundColor: Palette.red },
  headingSpacing: { marginBottom: Space.sm },
  description: { ...Type.body, color: Palette.secondary, marginBottom: Space.lg },
  options: { gap: Space.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Space.lg, minHeight: 64, borderWidth: 1, borderColor: Palette.line, borderRadius: 8 },
  selected: { borderColor: Palette.red, backgroundColor: Palette.redSoft },
  optionText: { ...Type.body, color: Palette.ink, flexShrink: 1 },
  label: { ...Type.label, color: Palette.secondary, marginBottom: 8, marginTop: 8 },
  input: { ...boxStyle(Palette, { variant: 'field' }), ...Type.input, color: Palette.ink, minHeight: 46, marginBottom: Space.lg },
  goalInput: { minHeight: 70, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  match: { marginBottom: Space.lg },
  preview: { ...Type.body, color: Palette.ink },
  summary: { gap: Space.sm, marginBottom: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 24 },
  back: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 15 },
  disabled: { opacity: 0.45 },
  error: { ...Type.bodySmall, color: Palette.red },
}));
