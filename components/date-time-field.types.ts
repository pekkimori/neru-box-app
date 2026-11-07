export type DateTimeFieldProps = {
  mode: 'date' | 'time';
  value: Date;
  label: string;
  onChange: (value: Date) => void;
  maximumDate?: Date;
};
