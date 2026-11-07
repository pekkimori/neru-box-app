import type { ReactNode } from 'react';

/** Associates Expo UI's browser range input with its visible label. */
export function ControlLabel({ children }: { children: ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</label>;
}
