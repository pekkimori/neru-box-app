export type PersonalityId = 'warm' | 'direct' | 'curious';
type ResponseIntent = 'plan' | 'hello' | 'focus' | 'tired' | 'study' | 'help';

export interface Personality {
  id: PersonalityId;
  label: string;
  description: string;
  greeting: string;
}

export interface MemoryItem {
  id: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'neru' | 'user';
  timestamp: Date;
}

export const PERSONALITIES: Personality[] = [
  {
    id: 'warm',
    label: 'Warm',
    description: 'Encouraging, gentle, and on your side.',
    greeting: "Hi, I'm NERU. I'm here to help you make today feel a little lighter. What's on your mind?",
  },
  {
    id: 'direct',
    label: 'Direct',
    description: 'Clear, concise, and focused on action.',
    greeting: "I'm NERU. Tell me what needs attention and we'll turn it into a clear next step.",
  },
  {
    id: 'curious',
    label: 'Curious',
    description: 'Reflective, open, and ready to explore.',
    greeting: "I'm NERU. What have you been thinking about lately, and where should we begin?",
  },
];

const KEYWORD_INTENTS: { keywords: string[]; intent: ResponseIntent }[] = [
  { keywords: ['break down', 'week', 'plan'], intent: 'plan' },
  { keywords: ['hello', 'hi', 'hey'], intent: 'hello' },
  { keywords: ['focus', 'distracted'], intent: 'focus' },
  { keywords: ['tired', 'break', 'exhausted'], intent: 'tired' },
  { keywords: ['study', 'learn', 'exam'], intent: 'study' },
  { keywords: ['help', 'stuck'], intent: 'help' },
];

const RESPONSES: Record<ResponseIntent, Record<PersonalityId, string>> = {
  plan: {
    warm: "Absolutely. Let's keep the week realistic: choose one important outcome, give it two focused sessions, and leave breathing room between them. What matters most?",
    direct: 'Start with one weekly outcome. Break it into three tasks, schedule the hardest first, and reserve one catch-up block. Name the outcome.',
    curious: 'If this week went well, what would be different by Sunday? We can work backward from that answer and build the plan together.',
  },
  hello: {
    warm: "Hi. It's good to see you. How are you feeling today?",
    direct: 'Hi. What do you want to work through?',
    curious: "Hello. What's taking up the most space in your mind right now?",
  },
  focus: {
    warm: "Let's make focus easier, not stricter. Pick one small task, silence distractions, and give it 20 minutes. I'll be here when you're done.",
    direct: 'Choose one task. Put the phone away. Set 25 minutes. Start with the first visible action.',
    curious: 'What usually pulls your attention away? If we name the strongest distraction, we can design a focus block around it.',
  },
  tired: {
    warm: 'That sounds heavy. Take ten quiet minutes, drink some water, and decide whether your body needs rest or a gentler task. Rest still counts.',
    direct: 'Pause for ten minutes. Hydrate. Then choose: stop for proper rest or complete one low-effort task.',
    curious: 'Does this feel more like physical tiredness, mental overload, or loss of motivation? The answer changes what will actually help.',
  },
  study: {
    warm: 'We can make studying feel manageable. Choose one topic, test what you already know, then review only the gaps. What subject are we tackling?',
    direct: 'Pick one topic. Do ten minutes of active recall, check errors, then repeat. Which topic?',
    curious: 'What would prove that you understand the material: recalling it, solving a problem, or explaining it? Let us build the session around that.',
  },
  help: {
    warm: 'Of course. I can help you plan, focus, study, or simply sort through what you are feeling. Where should we start?',
    direct: 'I can help with planning, focus, study, or reflection. Choose one.',
    curious: 'What kind of help would feel most useful right now: an answer, a plan, or space to think aloud?',
  },
};

const FALLBACK_RESPONSES: Record<PersonalityId, string[]> = {
  warm: [
    "I hear you. Tell me a little more and we'll take it one step at a time.",
    'That makes sense. What part of it feels most important right now?',
  ],
  direct: [
    'Understood. What outcome do you want from this?',
    'Give me the main constraint and the next decision you need to make.',
  ],
  curious: [
    'What do you think is underneath that?',
    'If you looked at this from a different angle, what might you notice?',
  ],
};

export const SEEDED_MEMORIES: MemoryItem[] = [
  { id: 'study-time', text: 'I focus best in the evening' },
  { id: 'current-goal', text: 'I am building a consistent study routine' },
];

export const SUGGESTIONS = [
  { label: 'Plan my week', value: 'Help me plan my week' },
  { label: 'Find my focus', value: 'Help me focus on my work' },
  { label: 'I need a break', value: "I'm feeling tired and need a break" },
];

export function getNeruResponse(
  input: string,
  personality: PersonalityId,
  random = Math.random,
): string {
  const lower = input.toLowerCase();
  const words = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  const matched = KEYWORD_INTENTS.find(({ keywords }) =>
    keywords.some((keyword) => keyword.includes(' ')
      ? lower.includes(keyword)
      : words.has(keyword)));
  if (matched) return RESPONSES[matched.intent][personality];

  const fallbacks = FALLBACK_RESPONSES[personality];
  return fallbacks[Math.floor(random() * fallbacks.length)];
}
