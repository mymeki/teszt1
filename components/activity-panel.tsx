'use client';

import { useStore } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Bell } from 'lucide-react';

export function ActivityPanel() {
  const { activity } = useStore();

  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Bell className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Még nincs tevékenység</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="space-y-2 p-1">
        {activity.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: hu })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
