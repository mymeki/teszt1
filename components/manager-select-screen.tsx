'use client';

import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { ChevronRight, ArrowLeft, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { POSITION_LABELS, POSITION_COLORS, type Position } from '@/lib/types';

export function ManagerSelectScreen() {
  const { managers, selectedPosition, setCurrentManager, setSelectedPosition } = useStore();
  const positionManagers = managers.filter((m) => m.position === selectedPosition);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{selectedPosition ? POSITION_LABELS[selectedPosition] : ''}</h1>
          <p className="mt-2 text-lg text-muted-foreground">Ki vagy te?</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Válaszd ki a neved a belépéshez</p>
        </motion.div>

        {positionManagers.length === 0 ? (
          <div className="mb-6 text-center">
            <p className="text-sm text-muted-foreground">Nincs még regisztrált {selectedPosition ? POSITION_LABELS[selectedPosition].toLowerCase() : ''}.</p>
            <p className="text-xs text-muted-foreground/70">A főmenedzser tud hozzáadni új embereket.</p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {positionManagers.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card
                  onClick={() => setCurrentManager(m)}
                  className="group cursor-pointer border-2 border-transparent p-5 transition-all hover:border-primary/30 hover:shadow-lg active:scale-95"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md transition-transform group-hover:scale-110"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold">{m.name}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPosition(null)}
          className="mt-8 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Vissza a pozíció választáshoz
        </Button>
      </div>
    </div>
  );
}
