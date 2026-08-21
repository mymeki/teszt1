'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

// VAPID public key — safe to expose in client code
const VAPID_PUBLIC_KEY = 'BCSMaHg1mcKfNSau1AwBwFtVqwGmOfLkD8Z90Ba0Id3fOC5RIP6ZBMG_B-PqyepAu5HRvkuHnyAIQBO6yzImwMI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const { currentManager, pushMessages, fetchPushMessages } = useStore();
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Subscribe to push notifications when a manager logs in
  useEffect(() => {
    if (!currentManager) return;

    let cancelled = false;

    const subscribeToPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      if (!('Notification' in window)) return;

      // Request notification permission
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return;

      try {
        const reg = await navigator.serviceWorker.ready;
        let subscription = await reg.pushManager.getSubscription();

        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        if (cancelled) return;

        // Save subscription to database — upsert by endpoint
        const sub = subscription.toJSON();
        await supabase.from('push_subscriptions').upsert(
          {
            manager_id: currentManager.id,
            endpoint: sub.endpoint,
            p256dh: sub.keys!.p256dh,
            auth: sub.keys!.auth,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        );
      } catch {
        // Subscription failed — user may have blocked push or browser doesn't support it
      }
    };

    subscribeToPush();

    return () => {
      cancelled = true;
    };
  }, [currentManager]);

  // Mark all currently-loaded messages as "known" so we don't notify for old ones
  useEffect(() => {
    if (!initialized.current && pushMessages.length > 0) {
      pushMessages.forEach((m) => knownIds.current.add(m.id));
      initialized.current = true;
    }
  }, [pushMessages]);

  // Subscribe to realtime for in-app panel updates (the actual push is sent by the edge function)
  useEffect(() => {
    if (!currentManager) return;

    const channel = supabase
      .channel('push-messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'push_messages' },
        () => {
          fetchPushMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentManager, fetchPushMessages]);
}
