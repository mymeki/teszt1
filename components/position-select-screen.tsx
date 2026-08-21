'use client';

import { motion } from 'framer-motion';
import { HardHat, GraduationCap, Smile, Shield, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useStore } from '@/lib/store';
import { POSITION_LABELS, POSITION_COLORS, type Position } from '@/lib/types';

const POSITIONS: { key: Position; icon: typeof HardHat; desc: string }[] = [
  { key: 'shift_leader', icon: HardHat, desc: 'Műszakvezetői beosztás' },
  { key: 'crew_trainer', icon: GraduationCap, desc: 'Tréneri beosztás' },
  { key: 'guest_experience', icon: Smile, desc: 'Vendégélmény beosztás' },
  { key: 'general_manager', icon: Shield, desc: 'Vezetői irányítópult' },
];

export function PositionSelectScreen() {
  const { setSelectedPosition } = useStore();

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
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HardHat className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Műszaktervező</h1>
          <p className="mt-3 text-lg text-muted-foreground">Milyen beosztást készítesz?</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Válaszd ki a pozíciót a folytatáshoz</p>
        </motion.div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {POSITIONS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <Card
                  onClick={() => setSelectedPosition(p.key)}
                  className="group flex cursor-pointer items-center gap-4 border-2 border-transparent p-5 transition-all hover:border-primary/30 hover:shadow-lg active:scale-95"
                >
                  <div
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: POSITION_COLORS[p.key] }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold">{POSITION_LABELS[p.key]}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
