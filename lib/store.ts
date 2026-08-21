import { create } from 'zustand';
import { supabase } from './supabase';
import type {
  Manager, ShiftRequest, ActivityLog, ChatMessage, PushMessage, WeeklyDeadline,
  ScheduleAssignment,
  DayStatus, ShiftType, Priority, Position
} from './types';

const STORAGE_KEY = 'shift-planner-session';

interface SessionState {
  selectedPosition: Position | null;
  currentManager: Manager | null;
}

function loadSession(): SessionState {
  if (typeof window === 'undefined') return { selectedPosition: null, currentManager: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { selectedPosition: null, currentManager: null };
    return JSON.parse(raw);
  } catch {
    return { selectedPosition: null, currentManager: null };
  }
}

function saveSession(state: SessionState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

interface AppState {
  managers: Manager[];
  requests: ShiftRequest[];
  activity: ActivityLog[];
  chatMessages: ChatMessage[];
  pushMessages: PushMessage[];
  deadlines: WeeklyDeadline[];
  assignments: ScheduleAssignment[];
  selectedPosition: Position | null;
  currentManager: Manager | null;
  loading: boolean;
  error: string | null;

  setSelectedPosition: (p: Position | null) => void;
  setCurrentManager: (m: Manager | null) => void;
  logout: () => void;

  fetchManagers: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchActivity: () => Promise<void>;
  fetchChatMessages: () => Promise<void>;
  fetchPushMessages: () => Promise<void>;
  fetchDeadlines: () => Promise<void>;
  fetchAssignments: () => Promise<void>;

  saveRequest: (req: Partial<ShiftRequest> & { manager_id: string; request_date: string }) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;

  sendChatMessage: (position: string, managerId: string, managerName: string, message: string) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  sendPushMessage: (senderId: string, senderName: string, recipientId: string | null, recipientPosition: string | null, title: string, message: string) => Promise<void>;
  markPushRead: (id: string) => Promise<void>;

  addManager: (name: string, position: Position, color: string) => Promise<void>;
  updateManager: (id: string, name: string, position: Position, color: string) => Promise<void>;
  deleteManager: (id: string) => Promise<void>;

  saveDeadline: (position: string, weekStart: string, deadline: string) => Promise<void>;
  toggleDeadlineClosed: (id: string, closed: boolean) => Promise<void>;
  deleteDeadline: (id: string) => Promise<void>;

  saveAssignment: (assignment: Partial<ScheduleAssignment> & { manager_id: string; assignment_date: string }) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  validateSchedule: (weekStart: string, validated: boolean) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => {
  const session = loadSession();

  return {
    managers: [],
    requests: [],
    activity: [],
    chatMessages: [],
    pushMessages: [],
    deadlines: [],
    assignments: [],
    selectedPosition: session.selectedPosition,
    currentManager: session.currentManager,
    loading: false,
    error: null,

    setSelectedPosition: (p) => {
      set({ selectedPosition: p });
      saveSession({ selectedPosition: p, currentManager: get().currentManager });
    },

    setCurrentManager: (m) => {
      set({ currentManager: m });
      saveSession({ selectedPosition: get().selectedPosition, currentManager: m });
    },

    logout: () => {
      set({ selectedPosition: null, currentManager: null });
      saveSession({ selectedPosition: null, currentManager: null });
    },

    fetchManagers: async () => {
      const { data, error } = await supabase.from('managers').select('*').order('sort_order');
      if (error) { set({ error: error.message }); return; }
      set({ managers: data || [] });
    },

    fetchRequests: async () => {
      set({ loading: true });
      const { data, error } = await supabase.from('shift_requests').select('*');
      if (error) { set({ error: error.message, loading: false }); return; }
      set({ requests: data || [], loading: false });
    },

    fetchActivity: async () => {
      const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) { set({ error: error.message }); return; }
      set({ activity: data || [] });
    },

    fetchChatMessages: async () => {
      const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200);
      if (error) { set({ error: error.message }); return; }
      set({ chatMessages: data || [] });
    },

    fetchPushMessages: async () => {
      const { data, error } = await supabase.from('push_messages').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) { set({ error: error.message }); return; }
      set({ pushMessages: data || [] });
    },

    fetchDeadlines: async () => {
      const { data, error } = await supabase.from('weekly_deadlines').select('*').order('week_start', { ascending: true });
      if (error) { set({ error: error.message }); return; }
      set({ deadlines: data || [] });
    },

    fetchAssignments: async () => {
      const { data, error } = await supabase.from('schedule_assignments').select('*').order('assignment_date', { ascending: true });
      if (error) { set({ error: error.message }); return; }
      set({ assignments: data || [] });
    },

    saveRequest: async (req) => {
      const { currentManager, fetchRequests, fetchActivity } = get();
      const existing = get().requests.find(
        (r) => r.manager_id === req.manager_id && r.request_date === req.request_date
      );
      if (existing) {
        const { error } = await supabase.from('shift_requests').update({
          day_status: req.day_status || 'none',
          shift_type: req.shift_type || 'none',
          shift_start: req.shift_start || null,
          shift_end: req.shift_end || null,
          priority: req.priority || 'preferred',
          notes: req.notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) { set({ error: error.message }); return; }
      } else {
        const { error } = await supabase.from('shift_requests').insert({
          manager_id: req.manager_id,
          request_date: req.request_date,
          day_status: req.day_status || 'none',
          shift_type: req.shift_type || 'none',
          shift_start: req.shift_start || null,
          shift_end: req.shift_end || null,
          priority: req.priority || 'preferred',
          notes: req.notes || null,
        });
        if (error) { set({ error: error.message }); return; }
      }
      if (currentManager) {
        await supabase.from('activity_log').insert({
          manager_id: currentManager.id,
          manager_name: currentManager.name,
          action: `${currentManager.name} frissítette: ${req.request_date}`,
          request_date: req.request_date,
        });
      }
      await fetchRequests();
      await fetchActivity();
    },

    deleteRequest: async (id) => {
      const { error } = await supabase.from('shift_requests').delete().eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchRequests();
    },

    sendChatMessage: async (position, managerId, managerName, message) => {
      const { error } = await supabase.from('chat_messages').insert({
        position, manager_id: managerId, manager_name: managerName, message,
      });
      if (error) { set({ error: error.message }); return; }
      await get().fetchChatMessages();
    },

    deleteChatMessage: async (id) => {
      const { error } = await supabase.from('chat_messages').delete().eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchChatMessages();
    },

    sendPushMessage: async (senderId, senderName, recipientId, recipientPosition, title, message) => {
      const { error } = await supabase.from('push_messages').insert({
        sender_id: senderId, sender_name: senderName,
        recipient_id: recipientId, recipient_position: recipientPosition,
        title, message,
      });
      if (error) { set({ error: error.message }); return; }
      await get().fetchPushMessages();

      // Trigger real Web Push notifications via edge function
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            sender_id: senderId,
            sender_name: senderName,
            recipient_id: recipientId,
            recipient_position: recipientPosition,
            title,
            message,
          }),
        });
      } catch {
        // Push delivery failed — the in-app message is still saved
      }
    },

    markPushRead: async (id) => {
      const { error } = await supabase.from('push_messages').update({ read: true }).eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchPushMessages();
    },

    addManager: async (name, position, color) => {
      const maxSort = get().managers.reduce((mx, m) => Math.max(mx, m.sort_order), 0);
      const { error } = await supabase.from('managers').insert({
        name, position, color, sort_order: maxSort + 1,
      });
      if (error) { set({ error: error.message }); return; }
      await get().fetchManagers();
    },

    updateManager: async (id, name, position, color) => {
      const { error } = await supabase.from('managers').update({
        name, position, color,
      }).eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchManagers();
    },

    deleteManager: async (id) => {
      const { error } = await supabase.from('managers').delete().eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchManagers();
    },

    saveDeadline: async (position, weekStart, deadline) => {
      const existing = get().deadlines.find(d => d.position === position && d.week_start === weekStart);
      if (existing) {
        const { error } = await supabase.from('weekly_deadlines').update({
          deadline, closed: false,
        }).eq('id', existing.id);
        if (error) { set({ error: error.message }); return; }
      } else {
        const { error } = await supabase.from('weekly_deadlines').insert({
          position, week_start: weekStart, deadline, closed: false,
        });
        if (error) { set({ error: error.message }); return; }
      }
      await get().fetchDeadlines();
    },

    toggleDeadlineClosed: async (id, closed) => {
      const { error } = await supabase.from('weekly_deadlines').update({ closed }).eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchDeadlines();
    },

    deleteDeadline: async (id) => {
      const { error } = await supabase.from('weekly_deadlines').delete().eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchDeadlines();
    },

    saveAssignment: async (assignment) => {
      const { currentManager } = get();
      const existing = get().assignments.find(
        (a) => a.manager_id === assignment.manager_id && a.assignment_date === assignment.assignment_date
      );
      const hadComment = existing?.comment;
      const newComment = assignment.comment;

      if (existing) {
        const { error } = await supabase.from('schedule_assignments').update({
          shift_type: assignment.shift_type || 'none',
          shift_start: assignment.shift_start || null,
          shift_end: assignment.shift_end || null,
          day_status: assignment.day_status || 'none',
          comment: assignment.comment || null,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) { set({ error: error.message }); return; }
      } else {
        const { error } = await supabase.from('schedule_assignments').insert({
          manager_id: assignment.manager_id,
          assignment_date: assignment.assignment_date,
          shift_type: assignment.shift_type || 'none',
          shift_start: assignment.shift_start || null,
          shift_end: assignment.shift_end || null,
          day_status: assignment.day_status || 'none',
          comment: assignment.comment || null,
          created_by: currentManager?.id || null,
        });
        if (error) { set({ error: error.message }); return; }
      }
      await get().fetchAssignments();

      // Send push notification when a comment is added or changed
      const commentChanged = newComment && newComment.trim() && newComment !== hadComment;
      if (commentChanged && currentManager) {
        const manager = get().managers.find((m) => m.id === assignment.manager_id);
        const dateStr = assignment.assignment_date;
        await get().sendPushMessage(
          currentManager.id,
          currentManager.name,
          assignment.manager_id,
          null,
          'Új megjegyzés a beosztásodhoz',
          `${dateStr}: ${newComment}${manager ? '' : ''}`
        );
      }
    },

    deleteAssignment: async (id) => {
      const { error } = await supabase.from('schedule_assignments').delete().eq('id', id);
      if (error) { set({ error: error.message }); return; }
      await get().fetchAssignments();
    },

    validateSchedule: async (weekStart, validated) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      const { error } = await supabase.from('schedule_assignments')
        .update({ validated })
        .gte('assignment_date', weekStart)
        .lte('assignment_date', weekEndStr);
      if (error) { set({ error: error.message }); return; }
      await get().fetchAssignments();
    },
  };
});
