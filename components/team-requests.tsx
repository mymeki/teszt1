'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getMonthMatrix, getMonthLabel, formatDateKey, WEEKDAYS_HU } from '@/lib/date-utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameMonth, isToday, eachDayOfInterval } from 'date-fns';
import { hu } from 'date-fns/locale';
import { DAY_STATUS_BADGE, SHIFT_TYPE_BADGE, DAY_STATUS_LABELS, SHIFT_TYPE_LABELS, getPriorityMark, type ShiftRequest, type Manager, type Priority } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StickyNote } from 'lucide-react';

export function TeamRequests() {
  const { managers, requests, currentManager } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const regularManagers = managers.filter((m) => m.position === currentManager?.position);
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getRequest = (managerId: string, date: Date): ShiftRequest | undefined => {
    const key = formatDateKey(date);
    return requests.find((r) => r.manager_id === managerId && r.request_date === key);
  };

  const getBadge = (req: ShiftRequest | undefined) => {
    if (!req) return null;
    if (req.day_status === 'day_off') return DAY_STATUS_BADGE.day_off;
    if (req.day_status === 'vacation') return DAY_STATUS_BADGE.vacation;
    if (req.day_status === 'sick') return DAY_STATUS_BADGE.sick;
    if (req.day_status === 'training') return DAY_STATUS_BADGE.training;
    if (req.day_status === 'office') return DAY_STATUS_BADGE.office;
    if (req.shift_type !== 'none') return SHIFT_TYPE_BADGE[req.shift_type];
    return null;
  };

  const getTooltipText = (req: ShiftRequest | undefined, manager: Manager) => {
    if (!req) return `${manager.name}: Nincs kérelem`;
    let text = `${manager.name}: `;
    if (req.day_status !== 'none') text += DAY_STATUS_LABELS[req.day_status];
    if (req.shift_type !== 'none') {
      if (req.day_status !== 'none') text += ', ';
      text += SHIFT_TYPE_LABELS[req.shift_type];
      if (req.shift_type === 'custom' && req.shift_start && req.shift_end) {
        text += ` (${req.shift_start}–${req.shift_end})`;
      }
    }
    if (req.priority === 'strong') text += ' — ! Erős preferencia';
    if (req.priority === 'cannot_other') text += ' — !! Nem tudok mást';
    if (req.notes) text += ` — ${req.notes}`;
    return text;
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">Csapat kérelmek</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize text-muted-foreground">{getMonthLabel(currentDate)}</span>
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[100px] bg-muted/50 p-2 text-left text-xs font-semibold text-muted-foreground">
                Menedzser
              </th>
              {monthDays.map((day) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const today = isToday(day);
                return (
                  <th
                    key={day.toISOString()}
                    className={`min-w-[44px] border-l border-border p-1 text-center text-xs font-medium ${isWeekend ? 'bg-muted/30 text-muted-foreground' : ''} ${today ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <div className="text-[10px] uppercase text-muted-foreground">{WEEKDAYS_HU[(day.getDay() + 6) % 7]}</div>
                    <div className="font-bold">{format(day, 'd')}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {regularManagers.map((manager) => (
              <tr key={manager.id} className="border-b border-border last:border-0">
                <td className="sticky left-0 z-10 bg-card p-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: manager.color }}
                    >
                      {manager.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">{manager.name}</span>
                  </div>
                </td>
                {monthDays.map((day) => {
                  const req = getRequest(manager.id, day);
                  const badge = getBadge(req);
                  const today = isToday(day);
                  return (
                    <td
                      key={day.toISOString()}
                      className={`border-l border-border p-1 text-center ${today ? 'bg-primary/5' : ''}`}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative flex min-h-[28px] items-center justify-center">
                              {badge ? (
                                <span className={`rounded px-1 py-0.5 text-[9px] font-bold leading-none ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">·</span>
                              )}
                              {req && getPriorityMark(req.priority) && (
                                <span className="absolute -right-0.5 -top-0.5 text-[8px] font-bold text-amber-500">
                                  {getPriorityMark(req.priority)}
                                </span>
                              )}
                              {req && req.notes && (
                                <span className="absolute -left-0.5 -top-0.5">
                                  <StickyNote className="h-2 w-2 text-blue-500" />
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{getTooltipText(req, manager)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Ez a nézet csak olvasható. A cellák felé húzva megtekintheted a megjegyzéseket.
      </p>
    </div>
  );
}
