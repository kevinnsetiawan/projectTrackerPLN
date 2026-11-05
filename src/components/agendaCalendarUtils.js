export const pad2 = (value) => String(value).padStart(2, '0');

export function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseCalendarDate(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
}

export function startOfWeek(value) {
  const date = parseCalendarDate(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function shiftCalendarDate(value, amount, view) {
  const date = parseCalendarDate(value);
  if (view === 'week') date.setDate(date.getDate() + amount * 7);
  else date.setMonth(date.getMonth() + amount, 1);
  return date;
}

export function agendaHour(agenda) {
  const hour = Number.parseInt(String(agenda?.jam_rapat || '').slice(0, 2), 10);
  return Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : null;
}
