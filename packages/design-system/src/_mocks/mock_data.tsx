import { SelectOption } from '../components/SelectButtons/SelectButtons';

export const randomSelectValues: SelectOption[] = Array.from(
  { length: 20 },
  (_, i) => ({
    label: `label ${i}`, // generating a random string of length 5 for label
    value: `val${i}`, // generating a random string of length 5 for value
  })
);

export const colors = ['#fbc02d', '#663399', '#ffa000', '#1976d2', '#689f38'];
export const colorOptions: SelectOption[] = colors.map((color) => ({
  label: color,
  value: color,
}));
