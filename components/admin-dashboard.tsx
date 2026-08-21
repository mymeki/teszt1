'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { getMonthLabel, formatDateKey, getWeekStartKey, WEEKDAYS_HU } from '@/lib/date-utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserManagement } from '@/components/user-management';
import { ChatInterface } from '@/components/chat-interface';
import { ScheduleEditor } from '@/components/schedule-editor';
import {
  ChevronLeft, ChevronRight, Printer, FileSpreadsheet, Bell, Users, CalendarDays,
  Send, Clock, Lock, Unlock, Trash2, HardHat, GraduationCap, Smile, Shield,
  Sun, Sunset, Moon, CalendarOff, Plane, Building2, AlertTriangle, StickyNote, MessageSquare,
  CalendarCog,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, addDays, isSameWeek, addWeeks, subWeeks } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  DAY_STATUS_BADGE, SHIFT_TYPE_BADGE, DAY_STATUS_LABELS, SHIFT_TYPE_LABELS,
  getPriorityMark, getShiftHours, POSITION_LABELS, POSITION_COLORS,
  type ShiftRequest, type Position
} from '@/lib/types';
import { toast } from 'sonner';

const POSITION_TABS: { key: Position; icon: typeof HardHat }[] = [
  { key: 'shift_leader', icon: HardHat },
  { key: 'crew_trainer', icon: GraduationCap },
  { key: 'guest_experience', icon: Smile },
];

export function AdminDashboard() {
  const { managers, requests, deadlines, pushMessages, sendPushMessage, saveDeadline, toggleDeadlineClosed, deleteDeadline, currentManager } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<string>('shift_leader');
  const [filterManager, setFilterManager] = useState<string>('all');
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushRecipient, setPushRecipient] = useState<string>('all');
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineWeek, setDeadlineWeek] = useState(getWeekStartKey(new Date()));
  const [viewMode, setViewMode] = useState<'requests' | 'schedule'>('requests');
  const [dateRange, setDateRange] = useState<'month' | 'week'>('month');

  const positionManagers = useMemo(
    () => managers.filter((m) => m.position === activeTab),
    [managers, activeTab]
  );

  const filteredManagers = filterManager === 'all'
    ? positionManagers
    : positionManagers.filter((m) => m.id === filterManager);

  const displayDays = useMemo(() => {
    if (dateRange === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate, dateRange]);

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

  // Weekly hours counter for each manager
  const getWeeklyHours = (managerId: string, weekStart: Date): number => {
    const weekStartKey = formatDateKey(weekStart);
    const weekEnd = addDays(weekStart, 6);
    const weekEndKey = formatDateKey(weekEnd);
    return requests
      .filter((r) => r.manager_id === managerId && r.request_date >= weekStartKey && r.request_date <= weekEndKey)
      .reduce((sum, r) => sum + getShiftHours(r), 0);
  };

  // Get weeks in current month
  const monthWeeks = useMemo(() => {
    const firstDay = startOfMonth(currentDate);
    const start = startOfWeek(firstDay, { weekStartsOn: 1 });
    const weeks: Date[] = [];
    let d = start;
    while (d <= endOfMonth(currentDate)) {
      weeks.push(d);
      d = addDays(d, 7);
    }
    return weeks;
  }, [currentDate]);

  // Statistics for current position
  const stats = useMemo(() => {
    const positionReqIds = positionManagers.map((m) => m.id);
    const periodReqs = requests.filter((r) => {
      const reqDate = new Date(r.request_date);
      if (dateRange === 'week') {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = addDays(ws, 6);
        return reqDate >= ws && reqDate <= we && positionReqIds.includes(r.manager_id);
      }
      return reqDate.getMonth() === currentDate.getMonth() &&
             reqDate.getFullYear() === currentDate.getFullYear() &&
             positionReqIds.includes(r.manager_id);
    });
    return {
      morning: periodReqs.filter((r) => r.shift_type === 'morning').length,
      afternoon: periodReqs.filter((r) => r.shift_type === 'afternoon').length,
      night: periodReqs.filter((r) => r.shift_type === 'night').length,
      dayOff: periodReqs.filter((r) => r.day_status === 'day_off').length,
      vacation: periodReqs.filter((r) => r.day_status === 'vacation').length,
      office: periodReqs.filter((r) => r.day_status === 'office').length,
    };
  }, [requests, currentDate, positionManagers, dateRange]);

  const prevPeriod = () => setCurrentDate(dateRange === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1) : subWeeks(currentDate, 1));
  const nextPeriod = () => setCurrentDate(dateRange === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) : addWeeks(currentDate, 1));

  const handleExportExcel = () => {
    const headers = ['Menedzser', ...displayDays.map((d) => format(d, 'yyyy-MM-dd'))];
    const rows = filteredManagers.map((m) => {
      const row = [m.name];
      displayDays.forEach((d) => {
        const req = getRequest(m.id, d);
        if (!req) { row.push(''); return; }
        if (req.day_status !== 'none') {
          row.push(DAY_STATUS_LABELS[req.day_status]);
        } else if (req.shift_type !== 'none') {
          if (req.shift_type === 'custom' && req.shift_start && req.shift_end) {
            row.push(`${req.shift_start}-${req.shift_end}`);
          } else {
            row.push(SHIFT_TYPE_LABELS[req.shift_type]);
          }
        } else {
          row.push('');
        }
      });
      return row;
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beosztas_${POSITION_LABELS[activeTab as Position]}_${format(currentDate, 'yyyy_MM')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export letöltése kész');
  };

  const handleSendPush = async () => {
    if (!currentManager || !pushTitle.trim() || !pushMessage.trim()) return;
    const recipientId = pushRecipient === 'all' || pushRecipient === 'position' ? null : pushRecipient;
    const recipientPosition = pushRecipient === 'position' ? activeTab : null;
    await sendPushMessage(currentManager.id, currentManager.name, recipientId, recipientPosition, pushTitle.trim(), pushMessage.trim());
    toast.success('Üzenet elküldve');
    setPushTitle('');
    setPushMessage('');
    setPushRecipient('all');
    setPushOpen(false);
  };

  const handleSaveDeadline = async () => {
    if (!deadlineDate) return;
    await saveDeadline(activeTab, deadlineWeek, new Date(deadlineDate).toISOString());
    toast.success('Határidő beállítva');
    setDeadlineDate('');
    setDeadlineOpen(false);
  };

  const positionDeadlines = useMemo(
    () => deadlines.filter((d) => d.position === activeTab || d.position === 'all').sort((a, b) => a.week_start.localeCompare(b.week_start)),
    [deadlines, activeTab]
  );

  const currentWeekDeadline = deadlines.find(
    (d) => (d.position === activeTab || d.position === 'all') && d.week_start === getWeekStartKey(currentDate)
  );

  const statCards = [
    { label: 'Reggeli', value: stats.morning, icon: Sun, color: 'bg-green-500' },
    { label: 'Délután', value: stats.afternoon, icon: Sunset, color: 'bg-orange-500' },
    { label: 'Éjszaka', value: stats.night, icon: Moon, color: 'bg-blue-900' },
    { label: 'Pihenő', value: stats.dayOff, icon: CalendarOff, color: 'bg-red-500' },
    { label: 'Szabadság', value: stats.vacation, icon: Plane, color: 'bg-purple-500' },
    { label: 'Köztes', value: stats.office, icon: Building2, color: 'bg-gray-500' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      {/* Schedule toggle button */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === 'schedule' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode(viewMode === 'schedule' ? 'requests' : 'schedule')}
          className="gap-1.5"
        >
          <CalendarCog className="h-4 w-4" />
          <span className="hidden sm:inline">{viewMode === 'schedule' ? 'Kérések nézet' : 'Beosztás szerkesztése'}</span>
        </Button>
      </div>

      {viewMode === 'schedule' ? (
        <ScheduleEditor />
      ) : (
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setFilterManager('all'); }}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            {POSITION_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  <span className="hidden text-xs sm:inline">{POSITION_LABELS[t.key]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPushOpen(true)} className="gap-1.5">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Üzenet</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeadlineOpen(true)} className="gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Határidő</span>
            </Button>
          </div>
        </div>

        {POSITION_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <div className="flex flex-col gap-4">
              {/* Header bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold sm:text-2xl">{POSITION_LABELS[tab.key]}</h2>
                  <Badge variant="secondary" className="capitalize">{dateRange === 'week' ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy. MMM d.') + ' – ' + format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d.') : getMonthLabel(currentDate)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={prevPeriod} className="h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextPeriod} className="h-8 w-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select value={filterManager} onValueChange={setFilterManager}>
                    <SelectTrigger className="h-8 w-[130px] sm:w-[180px]">
                      <SelectValue placeholder="Mindenki" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Mindenki</SelectItem>
                      {positionManagers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                </div>
              </div>

              {/* Deadline status */}
              {currentWeekDeadline && (
                <div className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                  currentWeekDeadline.closed || new Date() > new Date(currentWeekDeadline.deadline)
                    ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                    : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                }`}>
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">
                    Határidő: {format(new Date(currentWeekDeadline.deadline), 'yyyy. MMM d. HH:mm')}
                    {currentWeekDeadline.closed && ' — Kézzel lezárva'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDeadlineClosed(currentWeekDeadline.id, !currentWeekDeadline.closed)}
                    className="gap-1.5"
                  >
                    {currentWeekDeadline.closed ? (
                      <><Unlock className="h-3.5 w-3.5" /> Megnyit</>
                    ) : (
                      <><Lock className="h-3.5 w-3.5" /> Lezár</>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteDeadline(currentWeekDeadline.id)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Statistics cards */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                {statCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.label} className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold leading-none">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Weekly hours summary */}
              <Card className="overflow-x-auto p-0">
                <div className="border-b border-border bg-muted/50 px-3 py-2">
                  <p className="text-sm font-semibold">Heti órák összesítése</p>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 z-10 bg-card p-2 text-left text-xs font-semibold text-muted-foreground">Munkatárs</th>
                      {monthWeeks.map((ws) => (
                        <th key={ws.toISOString()} className="p-2 text-center text-xs font-medium text-muted-foreground">
                          {format(ws, 'MM/dd')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManagers.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="sticky left-0 z-10 bg-card p-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium">{m.name}</span>
                          </div>
                        </td>
                        {monthWeeks.map((ws) => {
                          const hours = getWeeklyHours(m.id, ws);
                          return (
                            <td key={ws.toISOString()} className="p-2 text-center">
                              <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                                hours === 0 ? 'text-muted-foreground/40' :
                                hours > 48 ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' :
                                hours >= 40 ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              }`}>
                                {hours}h
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Monthly/Weekly grid */}
              <Card className="overflow-x-auto p-0">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="sticky left-0 z-10 min-w-[100px] bg-muted/50 p-2 text-left text-xs font-semibold text-muted-foreground">
                        <Users className="h-4 w-4" />
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
                    {filteredManagers.map((manager) => (
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
                          const req = getRequest(manager.id, day);
                          const badge = getBadge(req);
                          const today = isToday(day);
                          return (
                            <td key={day.toISOString()} className={`border-l border-border p-1 text-center ${today ? 'bg-primary/5' : ''}`}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative flex min-h-[28px] items-center justify-center">
                                      {badge ? (
                                        <span className={`rounded px-1 py-0.5 text-[9px] font-bold leading-none ${badge.bg} ${badge.text}`}>
                                          {badge.label}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/20">·</span>
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
                                    <p className="text-xs">
                                      {req
                                        ? `${manager.name}: ${req.day_status !== 'none' ? DAY_STATUS_LABELS[req.day_status] : ''}${req.shift_type !== 'none' ? (req.day_status !== 'none' ? ', ' : '') + SHIFT_TYPE_LABELS[req.shift_type] : ''}${req.notes ? ' — ' + req.notes : ''}`
                                        : `${manager.name}: Nincs kérelem`}
                                    </p>
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

              {/* Legend */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-500 hover:bg-green-500">6–14 Reggel</Badge>
                <Badge className="bg-orange-500 hover:bg-orange-500">14–22 Délután</Badge>
                <Badge className="bg-blue-900 hover:bg-blue-900">22–06 Éjszaka</Badge>
                <Badge className="bg-red-500 hover:bg-red-500">PIH Pihenő</Badge>
                <Badge className="bg-purple-500 hover:bg-purple-500">SZAB Szabadság</Badge>
                <Badge className="bg-gray-500 hover:bg-gray-500">KÖZT Köztes</Badge>
                <Badge className="bg-yellow-500 hover:bg-yellow-500">TR Képzés</Badge>
                <Badge className="bg-orange-400 hover:bg-orange-400">BETEG Beteg</Badge>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      )}

      {/* User management + Chat section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5" />
            Felhasználók
          </h3>
          <UserManagement />
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <MessageSquare className="h-5 w-5" />
            {POSITION_LABELS[activeTab as Position]} csevegés
          </h3>
          <ChatInterface position={activeTab as Position} canDelete />
        </div>
      </div>

      {/* Push message dialog */}
      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Üzenet küldése</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Címzett</Label>
              <Select value={pushRecipient} onValueChange={setPushRecipient}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Minden {POSITION_LABELS[activeTab as Position]}</SelectItem>
                  <SelectItem value="position">Csak a pozíció (csoport)</SelectItem>
                  {positionManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cím</Label>
              <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Üzenet címe" />
            </div>
            <div className="space-y-2">
              <Label>Üzenet</Label>
              <Input value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} placeholder="Üzenet szövege" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPushOpen(false)}>Mégse</Button>
            <Button onClick={handleSendPush} disabled={!pushTitle.trim() || !pushMessage.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              Küldés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deadline dialog */}
      <Dialog open={deadlineOpen} onOpenChange={setDeadlineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Heti határidő beállítása</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Hét kiválasztása</Label>
              <Select value={deadlineWeek} onValueChange={setDeadlineWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => {
                    const ws = startOfWeek(addWeeks(new Date(), i - 2), { weekStartsOn: 1 });
                    const we = addDays(ws, 6);
                    const key = formatDateKey(ws);
                    return (
                      <SelectItem key={key} value={key}>
                        {format(ws, 'yyyy. MMM d.')} – {format(we, 'MMM d.')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Határidő dátuma és ideje</Label>
              <Input
                type="datetime-local"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
              />
            </div>
            {positionDeadlines.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Meglévő határidők</Label>
                {positionDeadlines.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                    <span>{d.week_start} — {format(new Date(d.deadline), 'yyyy. MMM d. HH:mm')}</span>
                    <div className="flex items-center gap-1">
                      {d.closed && <Badge variant="secondary" className="text-[10px]">Lezárva</Badge>}
                      <Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => deleteDeadline(d.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeadlineOpen(false)}>Mégse</Button>
            <Button onClick={handleSaveDeadline} disabled={!deadlineDate} className="gap-2">
              <Clock className="h-4 w-4" />
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
