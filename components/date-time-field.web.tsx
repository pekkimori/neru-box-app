import { boxCSSStyle } from '@/theme/box-css';
import { useAppTheme } from '@/theme/app-theme';
import { Type } from '@/theme/typography';
import { formatLocalDate, parseLocalDate, TIME_24_HOUR_PATTERN } from '@/utils/time';
import type { DateTimeFieldProps } from './date-time-field.types';

/** The native community picker supports iOS/Android; browsers supply their own control. */
export function DateTimeField({ mode, value, label, onChange, maximumDate }: DateTimeFieldProps) {
  const { appearance, colors } = useAppTheme();
  const inputValue = mode === 'date' ? formatLocalDate(value)
    : `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

  return (
    <input
      type={mode}
      aria-label={label}
      value={inputValue}
      max={mode === 'date' && maximumDate ? formatLocalDate(maximumDate) : undefined}
      step={mode === 'time' ? 60 : undefined}
      onChange={event => {
        if (!event.currentTarget.validity.valid) return;
        const next = event.currentTarget.value;
        if (mode === 'date') {
          const date = parseLocalDate(next);
          if (date) onChange(date);
        } else if (TIME_24_HOUR_PATTERN.test(next)) {
          const date = new Date(value);
          const [hours, minutes] = next.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);
          onChange(date);
        }
      }}
      style={{
        ...boxCSSStyle(colors, { variant: 'field' }),
        boxSizing: 'border-box', width: '100%', minWidth: 0,
        color: colors.ink, colorScheme: appearance.mode,
        fontFamily: Type.bodyStrong.fontFamily, fontSize: Type.bodyStrong.fontSize, fontWeight: Type.bodyStrong.fontWeight,
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  );
}
