import { DateTimeField } from './date-time-field';

/** Keep stored schedule times in local HH:MM format. */
export function TimeField({ value, label, onChange }: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return (
    <DateTimeField
      mode="time"
      value={date}
      label={label}
      onChange={selected => onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`)}
    />
  );
}
