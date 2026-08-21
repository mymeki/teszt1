'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, MessageCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { POSITION_LABELS, type Position } from '@/lib/types';
import { toast } from 'sonner';

export function ChatInterface({ position, canDelete = false }: { position: Position | 'all'; canDelete?: boolean }) {
  const { chatMessages, sendChatMessage, deleteChatMessage, currentManager, fetchChatMessages } = useStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const roomLabel = position === 'all' ? 'Minden vezető' : POSITION_LABELS[position];
  const messages = chatMessages.filter((m) => m.position === position);

  useEffect(() => {
    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchChatMessages, position]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !currentManager) return;
    setSending(true);
    try {
      await sendChatMessage(position, currentManager.id, currentManager.name, text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteChatMessage(id);
    toast.success('Üzenet törölve');
  };

  return (
    <Card className="flex h-[500px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{roomLabel} csevegés</h3>
        <span className="ml-auto text-xs text-muted-foreground">{messages.length} üzenet</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageCircle className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Még nincs üzenet. Légy te az első!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.manager_id === currentManager?.id;
            return (
              <div key={msg.id} className={`group flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {!isMe && (
                    <p className="mb-0.5 text-xs font-semibold text-primary">{msg.manager_name}</p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`mt-0.5 text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="mb-1 flex-shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="Üzenet törlése"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Üzenet írása..."
          disabled={sending}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
