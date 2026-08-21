'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getMonthLabel, formatDateKey, WEEKDAYS_HU } from '@/lib/date-utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChevronLeft, ChevronRight, CalendarCog, MessageSquare, Trash2, StickyNote, CheckCircle2, Circle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { getWeekStartKey } from '@/lib/date-utils';
import { hu } from 'date-fns/locale';
import {
  DAY_STATUS_BADGE, SHIFT_TYPE_BADGE, DAY_STATUS_LABELS, SHIFT_TYPE_LABELS,
  POSITION_LABELS, type ScheduleAssignment, type ShiftType, type DayStatus, type Position,
} from '@/lib/types';
import { toast } from 'sonner';

const POSITION_TABS: Position[] = ['shift_leader', 'crew_trainer', 'guest_experience'];

const SHIFT_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'none', label: 'Nincs' },
  { value: 'morning', label: '06:00–14:00' },
  { value: 'afternoon', label: '14:00–22:00' },
  { value: 'night', label: '22:00–06:00' },
  { value: 'long_morning', label: '06:00–18:00' },
  { value: 'long_night', label: '18:00–06:00' },
  { value: 'custom', label: 'Egyéni műszak' },
];

const DAY_STATUS_OPTIONS: { value: DayStatus; label: string }[] = [
  { value: 'none', label: 'Nincs' },
  { value: 'day_off', label: 'Pihenőnap' },
  { value: 'vacation', label: 'Szabadság' },
  { value: 'sick', label: 'Beteg' },
  { value: 'training', label: 'Képzés' },
  { value: 'office', label: 'Köztes nap' },
];

interface EditState {
  managerId: string;
  managerName: string;
  date: Date;
  shiftType: ShiftType;
  shiftStart: string;
  shiftEnd: string;
  dayStatus: DayStatus;
  comment: string;
  assignmentId: string | null;
}

export function ScheduleEditor() {
  const { managers, assignments, saveAssignment, deleteAssignment, validateSchedule } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<Position>('shift_leader');
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [dateRange, setDateRange] = useState<'month' | 'week'>('month');

  const positionManagers = useMemo(
    () => managers.filter((m) => m.position === activeTab),
    [managers, activeTab]
  );

  const displayDays = useMemo(() => {
    if (dateRange === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate, dateRange]);

  const getAssignment = (managerId: string, date: Date): ScheduleAssignment | undefined => {
    const key = formatDateKey(date);
    return assignments.find((a) => a.manager_id === managerId && a.assignment_date === key);
  };

  const getBadge = (a: ScheduleAssignment | undefined) => {
    if (!a) return null;
    if (a.day_status !== 'none') return DAY_STATUS_BADGE[a.day_status];
    if (a.shift_type !== 'none') return SHIFT_TYPE_BADGE[a.shift_type];
    return null;
  };

  const prevPeriod = () => setCurrentDate(dateRange === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1) : subWeeks(currentDate, 1));
  const nextPeriod = () => setCurrentDate(dateRange === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) : addWeeks(currentDate, 1));

  const currentWeekStart = getWeekStartKey(currentDate);
  const weekAssignments = useMemo(
    () => assignments.filter((a) => {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      const aDate = new Date(a.assignment_date);
      return aDate >= ws && aDate <= we;
    }),
    [assignments, currentDate]
  );
  const weekValidated = weekAssignments.length > 0 && weekAssignments.every((a) => a.validated);

  const handleValidate = async () => {
    await validateSchedule(currentWeekStart, !weekValidated);
    toast.success(weekValidated ? 'Beosztás validálás visszavonva' : 'Beosztás validálva');
  };

  const handleCellClick = (managerId: string, managerName: string, date: Date) => {
    const existing = getAssignment(managerId, date);
    setEditState({
      managerId,
      managerName,
      date,
      shiftType: existing?.shift_type || 'none',
      shiftStart: existing?.shift_start || '',
      shiftEnd: existing?.shift_end || '',
      dayStatus: existing?.day_status || 'none',
      comment: existing?.comment || '',
      assignmentId: existing?.id || null,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editState) return;
    await saveAssignment({
      manager_id: editState.managerId,
      assignment_date: formatDateKey(editState.date),
      shift_type: editState.shiftType,
      shift_start: editState.shiftType === 'custom' ? editState.shiftStart : undefined,
      shift_end: editState.shiftType === 'custom' ? editState.shiftEnd : undefined,
      day_status: editState.dayStatus,
      comment: editState.comment.trim() || undefined,
    });
    toast.success('Beosztás mentve');
    setEditOpen(false);
    setEditState(null);
  };

  const handleDelete = async () => {
    if (!editState?.assignmentId) return;
    await deleteAssignment(editState.assignmentId);
    toast.success('Beosztás törölve');
    setEditOpen(false);
    setEditState(null);
  };

  return (
    <div className="space-y-4">
      {/* Position tabs */}
      <div className="flex flex-wrap gap-2">
        {POSITION_TABS.map((pos) => (
          <Button
            key={pos}
            variant={activeTab === pos ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(pos)}
          >
            {POSITION_LABELS[pos]}
          </Button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold capitalize sm:text-2xl">{dateRange === 'week' ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy. MMM d.') + ' – ' + format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d.') : getMonthLabel(currentDate)}</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              variant={dateRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateRange('month')}
              className="h-7 px-2 text-xs"
            >Hónap</Button>
            <Button
              variant={dateRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDateRange('week')}
              className="h-7 px-2 text-xs"
            >Hét</Button>
          </div>
          <Button variant="outline" size="icon" onClick={prevPeriod} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextPeriod} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Schedule grid */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[100px] bg-muted/50 p-2 text-left text-xs font-semibold text-muted-foreground">
                Munkatárs
              </th>
              {displayDays.map((day) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const today = isToday(day);
                return (
                  <th
                    key={day.toISOString()}
                    className={`min-w-[44px] border-l border-border p-1 text-center text-xs font-medium ${
                      isWeekend ? 'bg-muted/30 text-muted-foreground' : ''
                    } ${today ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <div className="text-[10px] uppercase text-muted-foreground">{WEEKDAYS_HU[(day.getDay() + 6) % 7]}</div>
                    <div className="font-bold">{format(day, 'd')}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {positionManagers.length === 0 ? (
              <tr>
                <td colSpan={displayDays.length + 1} className="p-4 text-center text-sm text-muted-foreground">
                  Nincs munkatárs ebben a pozícióban
                </td>
              </tr>
            ) : (
              positionManagers.map((manager) => (
                <tr key={manager.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-card p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: manager.color }}>
                        {manager.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium">{manager.name}</span>
                    </div>
                  </td>
                  {displayDays.map((day) => {
                    const a = getAssignment(manager.id, day);
                    const badge = getBadge(a);
                    const today = isToday(day);
                    return (
                      <td
                        key={day.toISOString()}
                        className={`border-l border-border p-1 text-center ${today ? 'bg-primary/5' : ''}`}
                      >
                        <button
                          onClick={() => handleCellClick(manager.id, manager.name, day)}
                          className="relative flex min-h-[28px] w-full items-center justify-center rounded transition-colors hover:bg-accent/50"
                        >
                          {badge ? (
                            <span className={`rounded px-1 py-0.5 text-[9px] font-bold leading-none ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/20">·</span>
                          )}
                          {a?.comment && (
                            <span className="absolute -left-0.5 -top-0.5">
                              <StickyNote className="h-2.5 w-2.5 text-blue-500" />
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Validate button */}
      {dateRange === 'week' && weekAssignments.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            {weekValidated ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {weekValidated ? 'A heti beosztás validálva' : 'A heti beosztás még nincs validálva'}
            </span>
          </div>
          <Button
            variant={weekValidated ? 'outline' : 'default'}
            size="sm"
            onClick={handleValidate}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {weekValidated ? 'Visszavon' : 'Beosztás validálása'}
          </Button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-green-500 hover:bg-green-500">6–14 Reggel</Badge>
        <Badge className="bg-orange-500 hover:bg-orange-500">14–22 Délután</Badge>
        <Badge className="bg-blue-900 hover:bg-blue-900">22–06 Éjszaka</Badge>
        <Badge className="bg-red-500 hover:bg-red-500">PIH Pihenő</Badge>
        <Badge className="bg-purple-500 hover:bg-purple-500">SZAB Szabadság</Badge>
        <Badge className="bg-gray-500 hover:bg-gray-500">KÖZT Köztes</Badge>
        <Badge variant="outline" className="gap-1"><StickyNote className="h-3 w-3 text-blue-500" /> Megjegyzés</Badge>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCog className="h-5 w-5" />
              {editState && `${editState.managerName} — ${format(editState.date, 'yyyy. MMM d.')}`}
            </DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nap státusza</Label>
                <Select
                  value={editState.dayStatus}
                  onValueChange={(v) => setEditState({ ...editState, dayStatus: v as DayStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Műszak típusa</Label>
                <Select
                  value={editState.shiftType}
                  onValueChange={(v) => setEditState({ ...editState, shiftType: v as ShiftType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editState.shiftType === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Kezdés</Label>
                    <Input
                      type="time"
                      value={editState.shiftStart}
                      onChange={(e) => setEditState({ ...editState, shiftStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vége</Label>
                    <Input
                      type="time"
                      value={editState.shiftEnd}
                      onChange={(e) => setEditState({ ...editState, shiftEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Megjegyzés a munkatársnak
                </Label>
                <Textarea
                  value={editState.comment}
                  onChange={(e) => setEditState({ ...editState, comment: e.target.value })}
                  placeholder="pl. Gyere 15 perccel korábban, helyettesíted X-et..."
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground">
                  A munkatáros push értesítést kap, ha megjegyzést írsz.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editState?.assignmentId && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditOpen(false)}>Mégse</Button>
            <Button onClick={handleSave} className="gap-2">
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
