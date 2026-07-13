function shiftLocalDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateProductivityStreak(
  productiveDates: Iterable<string>,
  today: string,
): number {
  const dates = new Set(productiveDates);
  let cursor = dates.has(today) ? today : shiftLocalDate(today, -1);
  let streak = 0;

  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDate(cursor, -1);
  }
  return streak;
}
