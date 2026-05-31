import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors, CandyRadii, CandySpacing } from '@/constants/candy-theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SleepTimeSliderProps {
  sleepTime: string;
  wakeTime: string;
  onSleepTimeChange: (time: string) => void;
  onWakeTimeChange: (time: string) => void;
  sleepDuration: number | null;
}

interface ArcSegment {
  startAngle: number;
  endAngle: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MINUTES_IN_DAY = 24 * 60; // 1440
const PERIOD_SLICE = 5 * 60; // 300 min per awake sub-period
const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const TRACK_RADIUS = 108;
const RING_WIDTH = 22;
const HANDLE_RADIUS = 13;
const HANDLE_DOT_R = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const clamped = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function angularDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

/** Convert touch coords (relative to SIZE×SIZE container) to degrees where 0° = top. */
function touchToAngle(x: number, y: number): number {
  const dx = x - CX;
  const dy = y - CY;
  const rad = Math.atan2(dy, dx);
  let deg = rad * 180 / Math.PI + 90;
  if (deg < 0) deg += 360;
  return deg;
}

/** Convert angle (0°=top, CW) to SVG cartesian coords. */
function polarToCartesian(angleDeg: number, r: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

/** Build an SVG arc path d-string for a stroked arc on the ring. */
function arcPath(startAngle: number, endAngle: number, r: number): string {
  const start = polarToCartesian(startAngle, r);
  const end = polarToCartesian(endAngle, r);
  const delta = ((endAngle - startAngle) % 360 + 360) % 360;
  const largeArc = delta > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** Sleep duration in minutes between two times (overnight-aware). */
function sleepDurationMinutes(sleep: number, wake: number): number {
  return ((wake - sleep + MINUTES_IN_DAY) % MINUTES_IN_DAY) || MINUTES_IN_DAY;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SleepTimeSlider({
  sleepTime,
  wakeTime,
  onSleepTimeChange,
  onWakeTimeChange,
  sleepDuration,
}: SleepTimeSliderProps) {
  // ---- refs (keep PanResponder stable) ----
  const onSleepTimeChangeRef = useRef(onSleepTimeChange);
  onSleepTimeChangeRef.current = onSleepTimeChange;
  const onWakeTimeChangeRef = useRef(onWakeTimeChange);
  onWakeTimeChangeRef.current = onWakeTimeChange;

  const sleepMinRef = useRef(0);
  sleepMinRef.current = parseTimeToMinutes(sleepTime);
  const wakeMinRef = useRef(0);
  wakeMinRef.current = parseTimeToMinutes(wakeTime);

  const draggingRef = useRef<'sleep' | 'wake'>('sleep');
  const shiftRef = useRef(false);
  const shiftStartAngleRef = useRef(0);
  const shiftStartSleepRef = useRef(0);
  const shiftStartWakeRef = useRef(0);

  // ---- derived ----
  const sleepMinutes = sleepMinRef.current;
  const wakeMinutes = wakeMinRef.current;

  const durationDisplay = useMemo(() => {
    const durHours = sleepDuration !== null ? sleepDuration : 8;
    if (durHours <= 0) return '0h sleep';
    const totalMin = Math.round(durHours * 60);
    if (totalMin < 60) return `${totalMin}m sleep`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h}h sleep` : `${h}h ${m}m sleep`;
  }, [sleepDuration]);

  const isOutOfRange = sleepDuration !== null && (sleepDuration < 7 || sleepDuration > 9);

  // ---- build coloured arc segments ----
  const arcSegments = useMemo((): ArcSegment[] => {
    const sleepAngle = (sleepMinutes / MINUTES_IN_DAY) * 360;
    const wakeAngle = (wakeMinutes / MINUTES_IN_DAY) * 360;

    const segs: ArcSegment[] = [];

    const sleepColor = isOutOfRange ? '#FF9AA2' : '#6C7AEA';
    segs.push({ startAngle: sleepAngle, endAngle: wakeAngle, color: sleepColor });

    // Awake sub-segments
    const awakeDur = MINUTES_IN_DAY - sleepDurationMinutes(sleepMinutes, wakeMinutes);
    const periods = [
      { dur: Math.min(PERIOD_SLICE, awakeDur), color: CandyColors.goldDeep },
      { dur: Math.min(PERIOD_SLICE, Math.max(0, awakeDur - PERIOD_SLICE)), color: '#5BA4CF' },
      { dur: Math.min(PERIOD_SLICE, Math.max(0, awakeDur - PERIOD_SLICE * 2)), color: CandyColors.lavenderDeep },
      { dur: Math.max(0, awakeDur - PERIOD_SLICE * 3), color: '#B39DDB' },
    ];

    let cursorMin = wakeMinutes;
    for (const p of periods) {
      if (p.dur > 0) {
        const endMin = (cursorMin + p.dur) % MINUTES_IN_DAY;
        segs.push({
          startAngle: (cursorMin / MINUTES_IN_DAY) * 360,
          endAngle: (endMin / MINUTES_IN_DAY) * 360,
          color: p.color,
        });
        cursorMin = endMin;
      }
    }

    return segs;
  }, [sleepMinutes, wakeMinutes, isOutOfRange]);

  // ---- PanResponder ----
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const angle = touchToAngle(locationX, locationY);
        const sA = (sleepMinRef.current / MINUTES_IN_DAY) * 360;
        const wA = (wakeMinRef.current / MINUTES_IN_DAY) * 360;
        const distToSleep = angularDist(angle, sA);
        const distToWake = angularDist(angle, wA);

        if (Math.min(distToSleep, distToWake) > 22) {
          shiftRef.current = true;
          shiftStartAngleRef.current = angle;
          shiftStartSleepRef.current = sleepMinRef.current;
          shiftStartWakeRef.current = wakeMinRef.current;
        } else {
          shiftRef.current = false;
          draggingRef.current = distToSleep <= distToWake ? 'sleep' : 'wake';
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const angle = touchToAngle(locationX, locationY);
        const minutes = Math.round((angle / 360) * MINUTES_IN_DAY) % MINUTES_IN_DAY;

        if (shiftRef.current) {
          const deltaDeg = angle - shiftStartAngleRef.current;
          const deltaMin = Math.round((deltaDeg / 360) * MINUTES_IN_DAY);
          const newSleep = (shiftStartSleepRef.current + deltaMin + MINUTES_IN_DAY) % MINUTES_IN_DAY;
          const newWake = (shiftStartWakeRef.current + deltaMin + MINUTES_IN_DAY) % MINUTES_IN_DAY;
          onSleepTimeChangeRef.current(minutesToTime(newSleep));
          onWakeTimeChangeRef.current(minutesToTime(newWake));
        } else if (draggingRef.current === 'sleep') {
          onSleepTimeChangeRef.current(minutesToTime(minutes));
        } else {
          onWakeTimeChangeRef.current(minutesToTime(minutes));
        }
      },
    }),
  ).current;

  // ---- handle positions ----
  const sleepAngle = (sleepMinutes / MINUTES_IN_DAY) * 360;
  const wakeAngle = (wakeMinutes / MINUTES_IN_DAY) * 360;
  const sleepHandle = polarToCartesian(sleepAngle, TRACK_RADIUS);
  const wakeHandle = polarToCartesian(wakeAngle, TRACK_RADIUS);

  // ---- render ----
  return (
    <View style={styles.wrapper}>
      {/* ── Labels row ── */}
      <View style={styles.labelsRow}>
        <View style={styles.labelGroup}>
          <Ionicons name="moon" size={14} color={CandyColors.lavenderDeep} />
          <View>
            <Text style={styles.labelText}>Bedtime</Text>
            <Text style={styles.labelTime}>{sleepTime}</Text>
          </View>
        </View>

        <View style={styles.labelCenter}>
          <Text style={styles.durationLabel}>{durationDisplay}</Text>
        </View>

        <View style={styles.labelGroup}>
          <View style={styles.labelRight}>
            <Text style={styles.labelText}>Wake Up</Text>
            <Text style={styles.labelTime}>{wakeTime}</Text>
          </View>
          <Ionicons name="sunny" size={14} color={CandyColors.goldDeep} />
        </View>
      </View>

      {/* ── Circular slider ── */}
      <View style={styles.circleOuter}>
        <View style={styles.circleTouch} {...panResponder.panHandlers}>
          <Svg width={SIZE} height={SIZE}>
            {/* Base ring */}
            <Circle
              cx={CX}
              cy={CY}
              r={TRACK_RADIUS}
              stroke={CandyColors.creamDeep}
              strokeWidth={RING_WIDTH}
              fill="none"
            />

            {/* Coloured arc segments */}
            {arcSegments.map((seg, i) => (
              <Path
                key={i}
                d={arcPath(seg.startAngle, seg.endAngle, TRACK_RADIUS)}
                stroke={seg.color}
                strokeWidth={RING_WIDTH}
                fill="none"
                strokeLinecap="butt"
              />
            ))}

            {/* Bedtime handle */}
            <Circle
              cx={sleepHandle.x}
              cy={sleepHandle.y}
              r={HANDLE_RADIUS}
              fill={CandyColors.white}
              stroke={CandyColors.lavenderDeep}
              strokeWidth={2.5}
            />
            <Circle
              cx={sleepHandle.x}
              cy={sleepHandle.y}
              r={HANDLE_DOT_R}
              fill={CandyColors.lavenderDeep}
            />

            {/* Wake time handle */}
            <Circle
              cx={wakeHandle.x}
              cy={wakeHandle.y}
              r={HANDLE_RADIUS}
              fill={CandyColors.white}
              stroke={CandyColors.goldDeep}
              strokeWidth={2.5}
            />
            <Circle
              cx={wakeHandle.x}
              cy={wakeHandle.y}
              r={HANDLE_DOT_R}
              fill={CandyColors.goldDeep}
            />
          </Svg>
        </View>

        {/* Center overlay (non-interactive) */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text style={[styles.centerDuration, isOutOfRange && styles.centerDurationWarn]}>
            {durationDisplay}
          </Text>
          <View style={styles.centerTimesRow}>
            <View style={styles.centerTimeItem}>
              <Ionicons name="moon" size={12} color={CandyColors.lavenderDeep} />
              <Text style={styles.centerTimeText}>{sleepTime}</Text>
            </View>
            <Text style={styles.centerDash}>—</Text>
            <View style={styles.centerTimeItem}>
              <Text style={styles.centerTimeText}>{wakeTime}</Text>
              <Ionicons name="sunny" size={12} color={CandyColors.goldDeep} />
            </View>
          </View>
          {isOutOfRange && (
            <Text style={styles.centerWarning}>Aim for 7–9h of sleep</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: CandyColors.white,
    borderRadius: CandyRadii.md,
    borderWidth: 2,
    borderColor: CandyColors.border,
    padding: CandySpacing.lg,
    gap: CandySpacing.md,
  },

  // ---- labels row ----
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: CandySpacing.xs,
    flex: 1,
  },
  labelRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '900',
    color: CandyColors.ink,
  },
  labelTime: {
    fontSize: 12,
    fontWeight: '700',
    color: CandyColors.inkSoft,
    marginTop: 2,
  },
  labelCenter: {
    alignItems: 'center',
    paddingHorizontal: CandySpacing.sm,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: CandyColors.inkSoft,
  },

  // ---- circle ----
  circleOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
  },
  circleTouch: {
    width: SIZE,
    height: SIZE,
  },

  // ---- center overlay ----
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: CandySpacing.xs,
  },
  centerDuration: {
    fontSize: 22,
    fontWeight: '900',
    color: CandyColors.ink,
  },
  centerDurationWarn: {
    color: CandyColors.pink,
  },
  centerTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CandySpacing.xs,
  },
  centerTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  centerTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: CandyColors.inkSoft,
  },
  centerDash: {
    fontSize: 13,
    fontWeight: '700',
    color: CandyColors.inkMuted,
  },
  centerWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: CandyColors.pink,
    marginTop: 2,
  },
});
