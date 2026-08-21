import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, isSameMonth, isToday, getDaysInMonth, startOfWeek, endOfWeek } from 'date-fns';
import { hu } from 'date-fns/locale';

export { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, isSameMonth, isToday, getDaysInMonth, startOfWeek, endOfWeek, hu };

export function getMonthMatrix(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getMonthName(date: Date): string {
  return format(date, 'yyyy. MMMM', { locale: hu });
}

export function getMonthLabel(date: Date): string {
  return format(date, 'yyyy. MMMM', { locale: hu });
}

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekStartKey(date: Date): string {
  return format(getWeekStart(date), 'yyyy-MM-dd');
}

export function getWeeksInMonth(date: Date): Date[][] {
  const matrix = getMonthMatrix(date);
  const weeks: Date[][] = [];
  for (let i = 0; i < matrix.length; i += 7) {
    weeks.push(matrix.slice(i, i + 7));
  }
  return weeks;
}

export const WEEKDAYS_HU = ['Hé', 'Ke', 'Sze', 'Csü', 'Pé', 'Szo', 'Va'];
export const WEEKDAYS_HU_FULL = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
export const MONTHS_HU = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
