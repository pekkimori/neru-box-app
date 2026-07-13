import type { GalaxyStar } from './galaxy-geometry';

type MockSpec = readonly [
  id: string,
  label: string,
  domainId: string,
  domainName: string,
  date: string,
  isoWeek: string,
  time: string,
];

const MOCK_SPECS: readonly MockSpec[] = [
  ['w25-run', 'Morning run', 'health', 'Health', '2026-06-15', '2026-W25', '07:15'],
  ['w25-chapter', 'Review one chapter', 'learning', 'Learning', '2026-06-15', '2026-W25', '12:10'],
  ['w25-brief', 'Draft project brief', 'work', 'Work', '2026-06-16', '2026-W25', '09:20'],
  ['w25-piano', 'Practice piano', 'music', 'Music', '2026-06-16', '2026-W25', '18:30'],
  ['w25-strength', 'Strength workout', 'health', 'Health', '2026-06-18', '2026-W25', '07:05'],
  ['w25-sketch', 'Sketch composition', 'art', 'Art', '2026-06-18', '2026-W25', '19:00'],
  ['w25-paper', 'Read systems paper', 'learning', 'Learning', '2026-06-18', '2026-W25', '21:15'],
  ['w25-desk', 'Clean the desk', 'home', 'Home', '2026-06-20', '2026-W25', '10:30'],
  ['w25-review', 'Weekly review', 'work', 'Work', '2026-06-20', '2026-W25', '15:45'],

  ['w26-walk', 'Walk for 30 minutes', 'health', 'Health', '2026-06-22', '2026-W26', '07:40'],
  ['w26-cards', 'Language flashcards', 'learning', 'Learning', '2026-06-22', '2026-W26', '12:15'],
  ['w26-intervals', 'Run intervals', 'health', 'Health', '2026-06-22', '2026-W26', '18:50'],
  ['w26-focus', 'Deep work block', 'work', 'Work', '2026-06-23', '2026-W26', '09:10'],
  ['w26-watercolor', 'Watercolor study', 'art', 'Art', '2026-06-23', '2026-W26', '20:05'],
  ['w26-scales', 'Practice scales', 'music', 'Music', '2026-06-25', '2026-W26', '08:25'],
  ['w26-essays', 'Read two essays', 'learning', 'Learning', '2026-06-25', '2026-W26', '19:35'],
  ['w26-bedroom', 'Organize bedroom', 'home', 'Home', '2026-06-27', '2026-W26', '10:00'],
  ['w26-meal-prep', 'Meal prep', 'health', 'Health', '2026-06-27', '2026-W26', '13:20'],
  ['w26-plan', 'Plan next week', 'work', 'Work', '2026-06-27', '2026-W26', '17:45'],

  ['w27-yoga', 'Morning yoga', 'health', 'Health', '2026-06-29', '2026-W27', '07:20'],
  ['w27-design', 'Read design book', 'learning', 'Learning', '2026-06-29', '2026-W27', '11:40'],
  ['w27-portrait', 'Sketch a portrait', 'art', 'Art', '2026-06-29', '2026-W27', '20:10'],
  ['w27-proposal', 'Write proposal', 'work', 'Work', '2026-06-30', '2026-W27', '09:05'],
  ['w27-rehearsal', 'Piano rehearsal', 'music', 'Music', '2026-06-30', '2026-W27', '18:15'],
  ['w27-cycle', 'Cycle 10 km', 'health', 'Health', '2026-07-02', '2026-W27', '07:30'],
  ['w27-typescript', 'Study TypeScript', 'learning', 'Learning', '2026-07-02', '2026-W27', '13:25'],
  ['w27-stretch', 'Evening stretch', 'health', 'Health', '2026-07-02', '2026-W27', '21:00'],
  ['w27-kitchen', 'Clean the kitchen', 'home', 'Home', '2026-07-04', '2026-W27', '10:20'],
  ['w27-reflection', 'Weekly reflection', 'work', 'Work', '2026-07-04', '2026-W27', '16:30'],

  ['w28-morning-walk', 'Morning walk', 'health', 'Health', '2026-07-06', '2026-W28', '07:10'],
  ['w28-read', 'Read a chapter', 'learning', 'Learning', '2026-07-06', '2026-W28', '12:00'],
  ['w28-evening-stretch', 'Evening stretch', 'health', 'Health', '2026-07-06', '2026-W28', '19:25'],
  ['w28-paint', 'Paint a color study', 'art', 'Art', '2026-07-07', '2026-W28', '09:15'],
  ['w28-piano', 'Practice piano', 'music', 'Music', '2026-07-07', '2026-W28', '18:40'],
  ['w28-sprint', 'Complete focus sprint', 'work', 'Work', '2026-07-09', '2026-W28', '08:50'],
  ['w28-notes', 'Review course notes', 'learning', 'Learning', '2026-07-09', '2026-W28', '14:05'],
  ['w28-inbox', 'Clear the inbox', 'work', 'Work', '2026-07-09', '2026-W28', '17:20'],
  ['w28-long-run', 'Long run', 'health', 'Health', '2026-07-11', '2026-W28', '08:00'],
  ['w28-studio', 'Tidy the studio', 'home', 'Home', '2026-07-11', '2026-W28', '11:35'],
  ['w28-illustration', 'Finish illustration', 'art', 'Art', '2026-07-11', '2026-W28', '20:30'],
] as const;

export function createGalaxyMockStars(): GalaxyStar[] {
  return MOCK_SPECS.map(([id, label, domainId, domainName, date, isoWeek, time], index) => ({
    starId: `mock-${id}`,
    label,
    constellationId: `mock-${domainId}`,
    constellationName: domainName,
    constellationIcon: '·',
    completionDate: date,
    completedAt: `${date}T${time}:00.000Z`,
    completionOrder: index,
    isoWeek,
    weekLabel: '',
    coinsEarned: 10,
    domainColor: '',
    x: 0,
    y: 0,
  }));
}
