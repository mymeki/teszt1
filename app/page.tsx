'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { PositionSelectScreen } from '@/components/position-select-screen';
import { ManagerSelectScreen } from '@/components/manager-select-screen';
import { EmployeeDashboard } from '@/components/employee-dashboard';
import { AdminDashboard } from '@/components/admin-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POSITION_LABELS } from '@/lib/types';
import { useNotifications } from '@/hooks/use-notifications';

export default function Home() {
  const {
    currentManager, setCurrentManager, selectedPosition,
    managers, fetchManagers, fetchRequests, fetchActivity,
    fetchChatMessages, fetchPushMessages, fetchDeadlines, fetchAssignments,
  } = useStore();

  useNotifications();
  const [mounted, setMounted] = useState(false);
  const [managersLoaded, setManagersLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchManagers().then(() => setManagersLoaded(true));
    fetchRequests();
    fetchActivity();
    fetchChatMessages();
    fetchPushMessages();
    fetchDeadlines();
    fetchAssignments();
  }, [fetchManagers, fetchRequests, fetchActivity, fetchChatMessages, fetchPushMessages, fetchDeadlines, fetchAssignments]);

  if (!mounted || (!currentManager && !managersLoaded && managers.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Betöltés...</div>
      </div>
    );
  }

  if (!selectedPosition) {
    return <PositionSelectScreen />;
  }

  if (!currentManager) {
    return <ManagerSelectScreen />;
  }

  const isGM = currentManager.position === 'general_manager';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: currentManager.color }}
            >
              {currentManager.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{currentManager.name}</p>
              <p className="text-xs text-muted-foreground">
                {POSITION_LABELS[currentManager.position]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentManager(null)}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Kijelentkezés</span>
            </Button>
          </div>
        </div>
      </header>

      {isGM ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}
