import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { TIME_24_HOUR_PATTERN, timeRangesOverlap } from "../../utils/time";

export type Mode = "normal" | "focus" | "sleep";
export type ControlEditor = "apps" | "schedule" | "mode" | "focus" | null;

export interface InstalledApp {
  id: string;
  name: string;
  category: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
}

export interface SelectedApp {
  id: string;
  limitMinutes: number;
}

export interface FocusBlock {
  id: string;
  label: string;
  start: string;
  end: string;
  enabled: boolean;
}

export interface ModeEffects {
  mute: boolean;
  grayscale: boolean;
  blueLight: boolean;
  pomodoro: boolean;
  reduceInterruptions: boolean;
  workMinutes: number;
  breakMinutes: number;
  allowedAppIds: string[];
}

type BooleanEffectKey = {
  [Key in keyof ModeEffects]: ModeEffects[Key] extends boolean ? Key : never;
}[keyof ModeEffects];

interface SleepRange {
  enabled: boolean;
  bedtime: string;
  wakeTime: string;
}

export const INSTALLED_APPS: InstalledApp[] = [
  {
    id: "instagram",
    name: "Instagram",
    category: "Social",
    icon: "logo-instagram",
    tint: "#D94673",
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Entertainment",
    icon: "logo-youtube",
    tint: "#E21D2F",
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "Entertainment",
    icon: "musical-notes",
    tint: "#171717",
  },
  {
    id: "reddit",
    name: "Reddit",
    category: "Social",
    icon: "logo-reddit",
    tint: "#F4511E",
  },
  {
    id: "discord",
    name: "Discord",
    category: "Social",
    icon: "logo-discord",
    tint: "#5865F2",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    category: "Social",
    icon: "chatbubble",
    tint: "#D0B900",
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "Music",
    icon: "musical-note",
    tint: "#168943",
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "Entertainment",
    icon: "film",
    tint: "#B20710",
  },
  {
    id: "messages",
    name: "Messages",
    category: "Communication",
    icon: "chatbubbles",
    tint: "#2A9D55",
  },
  {
    id: "mail",
    name: "Mail",
    category: "Productivity",
    icon: "mail",
    tint: "#2E73C5",
  },
];

export const DEFAULT_EFFECTS: Record<Mode, ModeEffects> = {
  normal: {
    mute: false,
    grayscale: false,
    blueLight: false,
    pomodoro: false,
    reduceInterruptions: false,
    workMinutes: 25,
    breakMinutes: 5,
    allowedAppIds: [],
  },
  focus: {
    mute: true,
    grayscale: false,
    blueLight: false,
    pomodoro: false,
    reduceInterruptions: true,
    workMinutes: 25,
    breakMinutes: 5,
    allowedAppIds: ["messages", "spotify"],
  },
  sleep: {
    mute: true,
    grayscale: true,
    blueLight: true,
    pomodoro: false,
    reduceInterruptions: true,
    workMinutes: 25,
    breakMinutes: 5,
    allowedAppIds: ["messages"],
  },
};

export const EFFECT_ROWS: {
  key: BooleanEffectKey;
  label: string;
  detail: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    key: "mute",
    label: "Mute notifications",
    detail: "Quiet alerts while this mode is active",
    icon: "notifications-off-outline",
  },
  {
    key: "grayscale",
    label: "Grayscale",
    detail: "Remove color to reduce visual pull",
    icon: "contrast-outline",
  },
  {
    key: "blueLight",
    label: "Blue-light filter",
    detail: "Warm the display for easier viewing",
    icon: "sunny-outline",
  },
  {
    key: "pomodoro",
    label: "Pomodoro",
    detail: "Alternate focused work and breaks",
    icon: "timer-outline",
  },
  {
    key: "reduceInterruptions",
    label: "Reduce interruptions",
    detail: "Keep only important activity visible",
    icon: "shield-checkmark-outline",
  },
];

export function clampMinutes(
  value: string | number,
  min = 1,
  max = 1440,
): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min));
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "Check time format";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours}h ` : ""}${remainder ? `${remainder}m` : ""}`.trim();
}

export function getFocusBlockError(
  block: FocusBlock,
  blocks: readonly FocusBlock[],
  sleepRanges: readonly SleepRange[],
): string | null {
  if (
    !TIME_24_HOUR_PATTERN.test(block.start) ||
    !TIME_24_HOUR_PATTERN.test(block.end)
  ) {
    return "Use 24-hour time, for example 09:30";
  }
  if (
    blocks.some(
      (other) =>
        other.id !== block.id &&
        other.enabled &&
        timeRangesOverlap(block.start, block.end, other.start, other.end),
    )
  ) {
    return "Overlaps another focus block";
  }
  if (
    sleepRanges.some(
      (sleep) =>
        sleep.enabled &&
        timeRangesOverlap(
          block.start,
          block.end,
          sleep.bedtime,
          sleep.wakeTime,
        ),
    )
  ) {
    return "Overlaps your sleep schedule";
  }
  return null;
}
