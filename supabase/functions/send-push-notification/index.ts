import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VAPID_PUBLIC_KEY =
  "BCSMaHg1mcKfNSau1AwBwFtVqwGmOfLkD8Z90Ba0Id3fOC5RIP6ZBMG_B-PqyepAu5HRvkuHnyAIQBO6yzImwMI";
const VAPID_PRIVATE_KEY =
  "S8j5jDpuGgw6zQflQqikw4hvMBQ-BrS7BuWoVaYM_Is";
const VAPID_SUBJECT = "mailto:admin@shiftplanner.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushPayload {
  sender_id: string;
  sender_name: string;
  recipient_id: string | null;
  recipient_position: string | null;
  title: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: PushPayload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all subscriptions that should receive this message
    let query = supabase.from("push_subscriptions").select("*");

    if (body.recipient_id) {
      query = query.eq("manager_id", body.recipient_id);
    } else if (body.recipient_position) {
      // Get all managers with this position, then their subscriptions
      const { data: managers } = await supabase
        .from("managers")
        .select("id")
        .eq("position", body.recipient_position);
      if (managers && managers.length > 0) {
        query = query.in(
          "manager_id",
          managers.map((m) => m.id)
        );
      } else {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notificationPayload = JSON.stringify({
      title: body.title,
      body: body.message,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "shift-planner-push",
      renotify: true,
      data: { url: "/" },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        )
      )
    );

    // Remove expired subscriptions (410 Gone or 404)
    const expiredEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const status = result.reason?.statusCode;
        if (status === 410 || status === 404) {
          expiredEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(JSON.stringify({ sent, expired: expiredEndpoints.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
