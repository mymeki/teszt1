'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, Trash2, User } from 'lucide-react';
import { POSITION_LABELS, POSITION_COLORS, type Position } from '@/lib/types';
import { toast } from 'sonner';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#65a30d'];

export function UserManagement() {
  const { managers, addManager, updateManager, deleteManager } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<typeof managers[0] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<typeof managers[0] | null>(null);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<Position>('shift_leader');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addManager(name.trim(), position, color);
      toast.success(`${name.trim()} hozzáadva`);
      setName('');
      setPosition('shift_leader');
      setColor(COLORS[0]);
      setAddOpen(false);
    } catch {
      toast.error('Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !name.trim()) return;
    setSaving(true);
    try {
      await updateManager(editTarget.id, name.trim(), position, color);
      toast.success('Adatok frissítve');
      setEditTarget(null);
    } catch {
      toast.error('Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteManager(deleteTarget.id);
      toast.success(`${deleteTarget.name} törölve`);
      setDeleteTarget(null);
    } catch {
      toast.error('Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (m: typeof managers[0]) => {
    setEditTarget(m);
    setName(m.name);
    setPosition(m.position);
    setColor(m.color);
  };

  const sortedManagers = [...managers].sort((a, b) => {
    const order: Position[] = ['shift_leader', 'crew_trainer', 'guest_experience', 'general_manager'];
    const pa = order.indexOf(a.position);
    const pb = order.indexOf(b.position);
    if (pa !== pb) return pa - pb;
    return a.sort_order - b.sort_order;
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Felhasználók kezelése</h2>
        <Button size="sm" onClick={() => { setName(''); setPosition('shift_leader'); setColor(COLORS[0]); setAddOpen(true); }} className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Új felhasználó</span>
        </Button>
      </div>

      <div className="space-y-2">
        {sortedManagers.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 p-3">
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="text-xs text-muted-foreground">{POSITION_LABELS[m.position]}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            {m.position !== 'general_manager' && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(m)} className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Új felhasználó</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Név</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pl. Kovács János" />
            </div>
            <div className="space-y-2">
              <Label>Pozíció</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(POSITION_LABELS) as Position[]).map((p) => (
                    <SelectItem key={p} value={p}>{POSITION_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Szín</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-all ${color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Mégse</Button>
            <Button onClick={handleAdd} disabled={saving || !name.trim()}>Hozzáadás</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Szerkesztés</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Név</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pozíció</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(POSITION_LABELS) as Position[]).map((p) => (
                    <SelectItem key={p} value={p}>{POSITION_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Szín</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full transition-all ${color === c ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Mégse</Button>
            <Button onClick={handleEdit} disabled={saving || !name.trim()}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Felhasználó törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretnéd <strong>{deleteTarget?.name}</strong>-t? Minden kérelme is törlődik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
