export type ManagerRole = 'manager' | 'general_manager';

export type Position = 'shift_leader' | 'crew_trainer' | 'guest_experience' | 'general_manager';

export type DayStatus = 'none' | 'day_off' | 'vacation' | 'sick' | 'training' | 'office';

export type ShiftType = 'none' | 'morning' | 'afternoon' | 'night' | 'long_morning' | 'long_night' | 'custom';

export type Priority = 'preferred' | 'strong' | 'cannot_other';

export interface Manager {
  id: string;
  name: string;
  role: ManagerRole;
  position: Position;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface ShiftRequest {
  id: string;
  manager_id: string;
  request_date: string;
  day_status: DayStatus;
  shift_type: ShiftType;
  shift_start?: string;
  shift_end?: string;
  priority: Priority;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  manager_id?: string;
  manager_name: string;
  action: string;
  request_date?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  position: string;
  manager_id: string;
  manager_name: string;
  message: string;
  created_at: string;
}

export interface PushMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string | null;
  recipient_position: string | null;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ScheduleAssignment {
  id: string;
  manager_id: string;
  assignment_date: string;
  shift_type: ShiftType;
  shift_start?: string;
  shift_end?: string;
  day_status: DayStatus;
  comment?: string;
  validated?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyDeadline {
  id: string;
  position: string;
  week_start: string;
  deadline: string;
  closed: boolean;
  created_at: string;
}

export const POSITION_LABELS: Record<Position, string> = {
  shift_leader: 'Műszakvezető',
  crew_trainer: 'Tréner',
  guest_experience: 'Vendégélmény Manager',
  general_manager: 'Főmenedzser',
};

export const POSITION_ICONS: Record<Position, string> = {
  shift_leader: 'HardHat',
  crew_trainer: 'GraduationCap',
  guest_experience: 'Smile',
  general_manager: 'Shield',
};

export const POSITION_COLORS: Record<Position, string> = {
  shift_leader: '#2563eb',
  crew_trainer: '#059669',
  guest_experience: '#d97706',
  general_manager: '#7c3aed',
};

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  none: 'Nincs kérelem',
  day_off: 'Pihenőnap',
  vacation: 'Szabadság',
  sick: 'Beteg',
  training: 'Képzés',
  office: 'Köztes nap',
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  none: 'Nincs',
  morning: '06:00–14:00',
  afternoon: '14:00–22:00',
  night: '22:00–06:00',
  long_morning: '06:00–18:00',
  long_night: '18:00–06:00',
  custom: 'Egyéni műszak',
};

export const SHIFT_SHORT_LABELS: Record<ShiftType, string> = {
  none: '',
  morning: '6–14',
  afternoon: '14–22',
  night: '22–06',
  long_morning: '6–18',
  long_night: '18–06',
  custom: 'EGYÉNI',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  preferred: 'Preferált',
  strong: 'Erős preferencia',
  cannot_other: 'Nem tudok mást',
};

export const DAY_STATUS_BADGE: Record<DayStatus, { label: string; bg: string; text: string }> = {
  none: { label: '', bg: '', text: '' },
  day_off: { label: 'PIH', bg: 'bg-red-500', text: 'text-white' },
  vacation: { label: 'SZAB', bg: 'bg-purple-500', text: 'text-white' },
  sick: { label: 'BETEG', bg: 'bg-orange-400', text: 'text-white' },
  training: { label: 'TR', bg: 'bg-yellow-500', text: 'text-white' },
  office: { label: 'KÖZT', bg: 'bg-gray-500', text: 'text-white' },
};

export function getPriorityMark(priority: Priority): string {
  if (priority === 'cannot_other') return '!!';
  if (priority === 'strong') return '!';
  return '';
}

export const SHIFT_TYPE_BADGE: Record<ShiftType, { label: string; bg: string; text: string }> = {
  none: { label: '', bg: '', text: '' },
  morning: { label: '6–14', bg: 'bg-green-500', text: 'text-white' },
  afternoon: { label: '14–22', bg: 'bg-orange-500', text: 'text-white' },
  night: { label: '22–06', bg: 'bg-blue-900', text: 'text-white' },
  long_morning: { label: '6–18', bg: 'bg-emerald-600', text: 'text-white' },
  long_night: { label: '18–06', bg: 'bg-indigo-800', text: 'text-white' },
  custom: { label: 'EGYÉNI', bg: 'bg-teal-500', text: 'text-white' },
};

export const SHIFT_HOURS: Record<ShiftType, number> = {
  none: 0,
  morning: 8,
  afternoon: 8,
  night: 8,
  long_morning: 12,
  long_night: 12,
  custom: 0,
};

export function getShiftHours(req: ShiftRequest): number {
  if (req.day_status !== 'none') return 0;
  if (req.shift_type === 'custom' && req.shift_start && req.shift_end) {
    const [sh, sm] = req.shift_start.split(':').map(Number);
    const [eh, em] = req.shift_end.split(':').map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return Math.round(mins / 60);
  }
  return SHIFT_HOURS[req.shift_type];
}
