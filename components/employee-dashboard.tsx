'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { getMonthMatrix, getMonthLabel, formatDateKey, getWeekStartKey, WEEKDAYS_HU } from '@/lib/date-utils';
import { DayDialog } from '@/components/day-dialog';
import { TeamRequests } from '@/components/team-requests';
import { ActivityPanel } from '@/components/activity-panel';
import { ChatInterface } from '@/components/chat-interface';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, CalendarDays, Users, Bell, MessageCircle, Clock, Lock, CalendarCog, StickyNote, MessageSquare } from 'lucide-react';
import { format, addMonths, subMonths, isSameMonth, isToday, startOfWeek, addDays, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { hu } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DAY_STATUS_BADGE, SHIFT_TYPE_BADGE, getPriorityMark, getShiftHours,
  POSITION_LABELS, type ShiftRequest
} from '@/lib/types';


export function EmployeeDashboard() {
  const { currentManager, requests, deadlines, pushMessages, markPushRead, assignments } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<'calendar' | 'team' | 'chat' | 'schedule'>('calendar');
  const [dateRange, setDateRange] = useState<'month' | 'week'>('month');
  const [activityOpen, setActivityOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);

  const monthMatrix = useMemo(() => getMonthMatrix(currentDate), [currentDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const myRequests = useMemo(
    () => requests.filter((r) => r.manager_id === currentManager?.id),
    [requests, currentManager]
  );

  const myAssignments = useMemo(
    () => assignments.filter((a) => a.manager_id === currentManager?.id),
    [assignments, currentManager]
  );

  const assignmentsWithComments = useMemo(
    () => myAssignments.filter((a) => a.comment && a.comment.trim()),
    [myAssignments]
  );

  // My push messages
  const myPushMessages = useMemo(() => {
    if (!currentManager) return [];
    return pushMessages.filter(
      (pm) => pm.recipient_id === currentManager.id ||
             pm.recipient_position === currentManager.position ||
             pm.recipient_id === null && pm.recipient_position === null
    );
  }, [pushMessages, currentManager]);

  const unreadCount = myPushMessages.filter((m) => !m.read).length;

  // Weekly hours for current week
  const currentWeekHours = useMemo(() => {
    if (!currentManager) return 0;
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    const wsKey = formatDateKey(ws);
    const weKey = formatDateKey(addDays(ws, 6));
    return requests
      .filter((r) => r.manager_id === currentManager.id && r.request_date >= wsKey && r.request_date <= weKey)
      .reduce((sum, r) => sum + getShiftHours(r), 0);
  }, [requests, currentManager]);

  // Current week deadline
  const currentDeadline = useMemo(() => {
    if (!currentManager) return null;
    const wsKey = getWeekStartKey(new Date());
    return deadlines.find(
      (d) => (d.position === currentManager.position || d.position === 'all') && d.week_start === wsKey
    );
  }, [deadlines, currentManager]);

  const deadlinePassed = currentDeadline && (currentDeadline.closed || new Date() > new Date(currentDeadline.deadline));

  const getRequestForDate = (date: Date): ShiftRequest | undefined => {
    const key = formatDateKey(date);
    return myRequests.find((r) => r.request_date === key);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevPeriod = () => dateRange === 'week' ? setCurrentDate(subWeeks(currentDate, 1)) : prevMonth();
  const nextPeriod = () => dateRange === 'week' ? setCurrentDate(addWeeks(currentDate, 1)) : nextMonth();

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Deadline banner */}
      {currentDeadline && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
          deadlinePassed
            ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
        }`}>
          {deadlinePassed ? <Lock className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" /> : <Clock className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />}
          <span className="flex-1">
            {deadlinePassed
              ? `A heti kérelem leadása lezárva. Határidő: ${format(new Date(currentDeadline.deadline), 'yyyy. MMM d. HH:mm')}`
              : `Határidő: ${format(new Date(currentDeadline.deadline), 'yyyy. MMM d. HH:mm')} — Még leadhatsz kérelmet!`
            }
          </span>
        </div>
      )}

      {/* Weekly hours + push notification bar */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Card className="flex items-center gap-3 px-4 py-2.5">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Ezen heti órák</p>
            <p className="text-lg font-bold leading-none">{currentWeekHours} óra</p>
          </div>
        </Card>

        <Sheet open={pushOpen} onOpenChange={setPushOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Értesítések</span>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Értesítések</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3 overflow-y-auto">
              {myPushMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincs új értesítés.</p>
              ) : (
                myPushMessages.map((pm) => (
                  <Card key={pm.id} className={`p-3 ${!pm.read ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold">{pm.title}</p>
                      {!pm.read && <Badge variant="default" className="text-[10px]">Új</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{pm.message}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">Feladó: {pm.sender_name} · {format(new Date(pm.created_at), 'MM.dd HH:mm')}</p>
                      {!pm.read && (
                        <Button variant="ghost" size="sm" onClick={() => markPushRead(pm.id)} className="h-6 text-xs">
                          Olvasottnak jelöl
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* View toggle */}
      <div className="mb-6 flex items-center justify-between gap-2 no-print">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          <Button
            variant={view === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('calendar')}
            className="gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Naptár</span>
          </Button>
          <Button
            variant={view === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('team')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Csapat</span>
          </Button>
          <Button
            variant={view === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('chat')}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Csevegés</span>
          </Button>
          <Button
            variant={view === 'schedule' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('schedule')}
            className="gap-2"
          >
            <CalendarCog className="h-4 w-4" />
            <span className="hidden sm:inline">Beosztásom</span>
            {assignmentsWithComments.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                {assignmentsWithComments.length}
              </span>
            )}
          </Button>
        </div>

        <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Történet</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Legutóbbi tevékenység</SheetTitle>
            </SheetHeader>
            <ActivityPanel />
          </SheetContent>
        </Sheet>
      </div>

      <AnimatePresence mode="wait">
        {view === 'calendar' ? (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Period navigation */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold capitalize sm:text-2xl">
                {dateRange === 'week'
                  ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy. MMM d.') + ' – ' + format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d.')
                  : getMonthLabel(currentDate)
                }
              </h2>
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
                <Button variant="outline" size="icon" onClick={prevPeriod} className="h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextPeriod} className="h-9 w-9">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar */}
            {dateRange === 'week' ? (
              <Card className="overflow-hidden p-2 sm:p-4">
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {WEEKDAYS_HU.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((date) => {
                    const today = isToday(date);
                    const req = getRequestForDate(date);
                    const hasRequest = req && (req.day_status !== 'none' || req.shift_type !== 'none');
                    return (
                      <TooltipProvider key={date.toISOString()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDayClick(date)}
                              className={`relative flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-center transition-all active:scale-95 ${
                                'border-border bg-card hover:border-primary/40 hover:shadow-md'
                              } ${today ? 'ring-2 ring-primary' : ''}`}
                            >
                              <span className={`text-xs font-medium ${today ? 'text-primary' : 'text-foreground'}`}>
                                {format(date, 'd')}
                              </span>
                              {hasRequest && (
                                <div className="flex flex-1 items-center justify-center">
                                  {req.day_status !== 'none' && req.day_status !== 'day_off' && (
                                    <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${DAY_STATUS_BADGE[req.day_status].bg} ${DAY_STATUS_BADGE[req.day_status].text}`}>
                                      {DAY_STATUS_BADGE[req.day_status].label}
                                    </span>
                                  )}
                                  {req.day_status === 'day_off' && (
                                    <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${DAY_STATUS_BADGE.day_off.bg} ${DAY_STATUS_BADGE.day_off.text}`}>
                                      {DAY_STATUS_BADGE.day_off.label}
                                    </span>
                                  )}
                                  {req.shift_type !== 'none' && req.day_status === 'none' && (
                                    <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${SHIFT_TYPE_BADGE[req.shift_type].bg} ${SHIFT_TYPE_BADGE[req.shift_type].text}`}>
                                      {SHIFT_TYPE_BADGE[req.shift_type].label}
                                    </span>
                                  )}
                                </div>
                              )}
                              {hasRequest && getPriorityMark(req.priority) && (
                                <span className="absolute right-0.5 top-0.5 text-[9px] font-bold text-amber-500">
                                  {getPriorityMark(req.priority)}
                                </span>
                              )}
                              {hasRequest && req.notes && (
                                <span className="absolute left-0.5 top-0.5">
                                  <StickyNote className="h-2.5 w-2.5 text-blue-500" />
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                          {hasRequest && (
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                {req.day_status !== 'none' && <p><strong>{DAY_STATUS_BADGE[req.day_status].label}</strong></p>}
                                {req.shift_type !== 'none' && req.day_status === 'none' && <p><strong>{SHIFT_TYPE_BADGE[req.shift_type].label}</strong></p>}
                                {req.priority !== 'preferred' && <p>Prioritás: {req.priority === 'cannot_other' ? '!! Nem tudok mást' : '! Erős preferencia'}</p>}
                                {req.notes && <p className="italic">{req.notes}</p>}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </Card>
            ) : (
            <Card className="overflow-hidden p-2 sm:p-4">
              {/* Weekday headers */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS_HU.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {monthMatrix.map((date) => {
                  const inMonth = isSameMonth(date, currentDate);
                  const today = isToday(date);
                  const req = getRequestForDate(date);
                  const hasRequest = req && (req.day_status !== 'none' || req.shift_type !== 'none');

                  return (
                    <TooltipProvider key={date.toISOString()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleDayClick(date)}
                            className={`
                              relative flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-center transition-all
                              ${inMonth ? 'border-border bg-card hover:border-primary/40 hover:shadow-md' : 'border-transparent bg-muted/30 opacity-40'}
                              ${today ? 'ring-2 ring-primary' : ''}
                              active:scale-95
                            `}
                          >
                            <span className={`text-xs font-medium ${inMonth ? 'text-foreground' : 'text-muted-foreground'} ${today ? 'text-primary' : ''}`}>
                              {format(date, 'd')}
                            </span>
                            {hasRequest && (
                              <div className="flex flex-1 items-center justify-center">
                                {req.day_status !== 'none' && req.day_status !== 'day_off' && (
                                  <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${DAY_STATUS_BADGE[req.day_status].bg} ${DAY_STATUS_BADGE[req.day_status].text}`}>
                                    {DAY_STATUS_BADGE[req.day_status].label}
                                  </span>
                                )}
                                {req.day_status === 'day_off' && (
                                  <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${DAY_STATUS_BADGE.day_off.bg} ${DAY_STATUS_BADGE.day_off.text}`}>
                                    {DAY_STATUS_BADGE.day_off.label}
                                  </span>
                                )}
                                {req.shift_type !== 'none' && req.day_status === 'none' && (
                                  <span className={`rounded px-1 py-0.5 text-[8px] font-bold leading-none ${SHIFT_TYPE_BADGE[req.shift_type].bg} ${SHIFT_TYPE_BADGE[req.shift_type].text}`}>
                                    {SHIFT_TYPE_BADGE[req.shift_type].label}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Priority mark */}
                            {hasRequest && getPriorityMark(req.priority) && (
                              <span className="absolute right-0.5 top-0.5 text-[9px] font-bold text-amber-500">
                                {getPriorityMark(req.priority)}
                              </span>
                            )}
                            {/* Notes indicator */}
                            {hasRequest && req.notes && (
                              <span className="absolute left-0.5 top-0.5">
                                <StickyNote className="h-2.5 w-2.5 text-blue-500" />
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        {hasRequest && (
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              {req.day_status !== 'none' && <p><strong>{DAY_STATUS_BADGE[req.day_status].label}</strong></p>}
                              {req.shift_type !== 'none' && req.day_status === 'none' && <p><strong>{SHIFT_TYPE_BADGE[req.shift_type].label}</strong></p>}
                              {req.priority !== 'preferred' && <p>Prioritás: {req.priority === 'cannot_other' ? '!! Nem tudok mást' : '! Erős preferencia'}</p>}
                              {req.notes && <p className="italic">{req.notes}</p>}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </Card>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-green-500 hover:bg-green-500">6–14 Reggel</Badge>
              <Badge className="bg-orange-500 hover:bg-orange-500">14–22 Délután</Badge>
              <Badge className="bg-blue-900 hover:bg-blue-900">22–06 Éjszaka</Badge>
              <Badge className="bg-red-500 hover:bg-red-500">PIH Pihenőnap</Badge>
              <Badge className="bg-purple-500 hover:bg-purple-500">SZAB Szabadság</Badge>
              <Badge className="bg-gray-500 hover:bg-gray-500">KÖZT Köztes nap</Badge>
              <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600"><span className="font-bold">!</span> Erős preferencia</Badge>
              <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600"><span className="font-bold">!!</span> Nem tudok mást</Badge>
            </div>
          </motion.div>
        ) : view === 'team' ? (
          <motion.div
            key="team"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TeamRequests />
          </motion.div>
        ) : view === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ChatInterface position={currentManager?.position || 'shift_leader'} />
          </motion.div>
        ) : (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-4">
              <h2 className="text-xl font-bold sm:text-2xl">Beosztásom</h2>
              {myAssignments.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Még nincs beosztásod. A főmenedzser még nem készítette el.
                </Card>
              ) : (
                <div className="space-y-3">
                  {myAssignments
                    .filter((a) => a.shift_type !== 'none' || a.day_status !== 'none' || a.comment)
                    .sort((a, b) => a.assignment_date.localeCompare(b.assignment_date))
                    .map((a) => {
                      const badge = a.day_status !== 'none'
                        ? DAY_STATUS_BADGE[a.day_status]
                        : SHIFT_TYPE_BADGE[a.shift_type];
                      const date = new Date(a.assignment_date);
                      return (
                        <Card key={a.id} className={`p-4 ${a.comment ? 'border-blue-200 dark:border-blue-900' : ''}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-semibold">
                                {format(date, 'yyyy. MMM d. (EEEE)')}
                              </div>
                              {badge && (
                                <span className={`rounded px-2 py-0.5 text-xs font-bold ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {a.comment && (
                            <div className="mt-3 flex gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                              <MessageSquare className="h-4 w-4 flex-shrink-0 text-blue-500" />
                              <p className="text-sm text-foreground">{a.comment}</p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Dialog */}
      {selectedDate && (
        <DayDialog
          date={selectedDate}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
