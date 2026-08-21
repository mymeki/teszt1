'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { DAY_STATUS_LABELS, SHIFT_TYPE_LABELS, PRIORITY_LABELS, type DayStatus, type ShiftType, type Priority } from '@/lib/types';
import { formatDateKey, getWeekStartKey } from '@/lib/date-utils';
import { Trash2, Save, AlertTriangle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface DayDialogProps {
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DayDialog({ date, open, onOpenChange }: DayDialogProps) {
  const { currentManager, requests, saveRequest, deleteRequest, deadlines } = useStore();
  const [dayStatus, setDayStatus] = useState<DayStatus>('none');
  const [shiftType, setShiftType] = useState<ShiftType>('none');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [priority, setPriority] = useState<Priority>('preferred');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  const dateKey = format(date, 'yyyy-MM-dd');
  const existing = requests.find((r) => r.manager_id === currentManager?.id && r.request_date === dateKey);

  useEffect(() => {
    if (existing) {
      setDayStatus(existing.day_status);
      setShiftType(existing.shift_type);
      setShiftStart(existing.shift_start || '');
      setShiftEnd(existing.shift_end || '');
      setPriority(existing.priority);
      setNotes(existing.notes || '');
    } else {
      setDayStatus('none');
      setShiftType('none');
      setShiftStart('');
      setShiftEnd('');
      setPriority('preferred');
      setNotes('');
    }
    // Check deadline for this week
    const weekStartKey = getWeekStartKey(date);
    const dl = deadlines.find(
      (d) => (d.position === currentManager?.position || d.position === 'all') && d.week_start === weekStartKey
    );
    if (dl) {
      const deadlineDate = new Date(dl.deadline);
      const now = new Date();
      if (dl.closed || now > deadlineDate) {
        setDeadlinePassed(true);
      } else {
        setDeadlinePassed(false);
      }
    } else {
      setDeadlinePassed(false);
    }
  }, [existing, dateKey, deadlines, currentManager, date]);

  // Detect conflicts with other managers on the same day
  const conflicts = useMemo(() => {
    const sameDayReqs = requests.filter(
      (r) => r.request_date === dateKey && r.manager_id !== currentManager?.id
    );
    const result: string[] = [];

    const sameShift = sameDayReqs.filter((r) => r.shift_type === shiftType && shiftType !== 'none' && shiftType !== 'custom');
    if (sameShift.length > 0) {
      const names = sameDayReqs
        .filter((r) => r.shift_type === shiftType)
        .map((r) => {
          const mgr = useStore.getState().managers.find((m) => m.id === r.manager_id);
          return mgr?.name || 'Ismeretlen';
        });
      result.push(`${names.join(', ')} ugyanazt a műszakot kérte (${SHIFT_TYPE_LABELS[shiftType]})`);
    }

    if (dayStatus === 'day_off' || dayStatus === 'vacation') {
      const offReqs = sameDayReqs.filter((r) => r.day_status === 'day_off' || r.day_status === 'vacation');
      const totalManagers = useStore.getState().managers.filter((m) => m.role === 'manager').length;
      if (offReqs.length >= totalManagers - 1) {
        result.push('Szinte minden menedzser pihenőnapot/szabadságot kért ezen a napon');
      }
    }

    return result;
  }, [requests, dateKey, currentManager, shiftType, dayStatus]);

  const performSave = async () => {
    if (!currentManager) return;
    setSaving(true);
    try {
      await saveRequest({
        manager_id: currentManager.id,
        request_date: dateKey,
        day_status: dayStatus,
        shift_type: shiftType,
        shift_start: shiftType === 'custom' ? shiftStart : undefined,
        shift_end: shiftType === 'custom' ? shiftEnd : undefined,
        priority,
        notes,
      });
      toast.success('Műszak kérelem mentve');
      onOpenChange(false);
    } catch {
      toast.error('Hiba történt a mentés során');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (conflicts.length > 0) {
      setConflictDialogOpen(true);
    } else {
      performSave();
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await deleteRequest(existing.id);
      toast.success('Kérelem törölve');
      onOpenChange(false);
    } catch {
      toast.error('Hiba történt a törlés során');
    } finally {
      setSaving(false);
    }
  };

  const dayStatusOptions: DayStatus[] = ['none', 'day_off', 'vacation', 'sick', 'training', 'office'];
  const shiftOptions: ShiftType[] = ['morning', 'afternoon', 'night', 'long_morning', 'long_night', 'custom'];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {format(date, 'yyyy. MMMM d., EEEE', { locale: hu })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Deadline warning */}
            {deadlinePassed && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">Lezárva</p>
                  <p className="text-xs text-red-700 dark:text-red-300">A heti határidő lejárt. Nem lehet új kérelmet leadni.</p>
                </div>
              </div>
            )}

            {/* Day Status */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nap státusza</Label>
              <Select value={dayStatus} onValueChange={(v) => setDayStatus(v as DayStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayStatusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DAY_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Shift */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Preferált műszak</Label>
              <RadioGroup
                value={shiftType}
                onValueChange={(v) => setShiftType(v as ShiftType)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {shiftOptions.map((s) => (
                  <div key={s} className="flex items-center space-x-2 rounded-lg border p-2 hover:bg-accent">
                    <RadioGroupItem value={s} id={`shift-${s}`} />
                    <Label htmlFor={`shift-${s}`} className="cursor-pointer text-sm font-normal">
                      {SHIFT_TYPE_LABELS[s]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Custom shift times */}
            {shiftType === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Kezdés</Label>
                  <Input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Végzés</Label>
                  <Input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Prioritás</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Megjegyzés</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pl. Orvosi időpont 15:00 után"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            {existing ? (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Törlés
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Mégse
              </Button>
              <Button onClick={handleSave} disabled={saving || deadlinePassed} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Mentés...' : 'Mentés'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict confirmation */}
      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ütemezési konfliktus
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="mb-2 block">A következő konfliktusok vannak ezen a napon:</span>
              <ul className="list-disc space-y-1 pl-4">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-sm">{c}</li>
                ))}
              </ul>
              <span className="mt-3 block font-medium">Biztosan folytatod a mentést?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={performSave}>
              Igen, mentés folytatása
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
