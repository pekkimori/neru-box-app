import type { MemoryItem, PersonalityId } from './preview-model';

export const QUIZ_QUESTIONS: {
  title: string;
  options: { personality: PersonalityId; label: string }[];
}[] = [
  {
    title: 'When you feel stuck, what helps most?',
    options: [
      { personality: 'warm', label: 'A little encouragement and reassurance' },
      { personality: 'direct', label: 'A clear next step to get moving' },
      { personality: 'curious', label: 'Questions that help me understand why' },
    ],
  },
  {
    title: 'How would you like to work toward a goal?',
    options: [
      { personality: 'curious', label: 'Explore ideas and find what fits' },
      { personality: 'warm', label: 'Build confidence with gentle check-ins' },
      { personality: 'direct', label: 'Make a practical plan and take action' },
    ],
  },
  {
    title: 'What kind of reply feels right to you?',
    options: [
      { personality: 'direct', label: 'Short, honest, and to the point' },
      { personality: 'curious', label: 'Thoughtful, with room to reflect' },
      { personality: 'warm', label: 'Friendly, patient, and encouraging' },
    ],
  },
];

// On an even split, the explicit reply preference (the last answer) wins.
export function recommendPersonality(answers: PersonalityId[]): PersonalityId {
  if (!answers.length) return 'warm';
  const scores = { warm: 0, direct: 0, curious: 0 };
  for (const answer of answers) scores[answer]++;
  const highest = Math.max(...Object.values(scores));
  return [...answers].reverse().find(answer => scores[answer] === highest)!;
}

export interface QuizProfile {
  name: string;
  goal: string;
  focusTime: string;
}

// Stable UUIDs let retakes update just the quiz details, preserving other memories.
const PROFILE_FIELDS = {
  name: { id: 'a65e7af1-4691-49d1-bc68-ae02aa9fa001', prefix: 'Please call me ' },
  goal: { id: 'a65e7af1-4691-49d1-bc68-ae02aa9fa002', prefix: 'My current goal is: ' },
  focusTime: { id: 'a65e7af1-4691-49d1-bc68-ae02aa9fa003', prefix: 'My best focus time is: ' },
} as const;

export const FOCUS_TIMES = ['Morning', 'Afternoon', 'Evening', 'It varies'];

export function readQuizProfile(memories: MemoryItem[]): QuizProfile {
  const read = (field: keyof QuizProfile) => {
    const { id, prefix } = PROFILE_FIELDS[field];
    const text = memories.find(memory => memory.id === id)?.text ?? '';
    return text.startsWith(prefix) ? text.slice(prefix.length) : text;
  };
  return { name: read('name'), goal: read('goal'), focusTime: read('focusTime') };
}

export function buildQuizMemories(memories: MemoryItem[], profile: QuizProfile): MemoryItem[] {
  if (!profile.goal.trim()) throw new Error('Add a current goal so NERU knows where to start.');
  if (profile.name.trim().length > 60 || profile.goal.trim().length > 160 || profile.focusTime.trim().length > 160) {
    throw new Error('Please shorten your details before saving.');
  }
  const quizIds = new Set<string>(Object.values(PROFILE_FIELDS).map(field => field.id));
  const next = memories.filter(memory => !quizIds.has(memory.id));
  for (const field of Object.keys(PROFILE_FIELDS) as (keyof QuizProfile)[]) {
    const value = profile[field].trim();
    if (value) next.push({ id: PROFILE_FIELDS[field].id, text: PROFILE_FIELDS[field].prefix + value });
  }
  if (next.length > 50) throw new Error('Your memories are full. Remove a memory in Personalize, then try again.');
  return next;
}
