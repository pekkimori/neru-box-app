const listeners = new Set<() => void>();
export function planningChanged() { listeners.forEach(listener => listener()); }
export function subscribePlanning(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
