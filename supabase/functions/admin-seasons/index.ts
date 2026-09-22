// Grind X — admin read for League sync.
//
// Returns every coach's latest season to an ALLOW-LISTED admin only. This is the
// one place the service-role key is used, and it stays server-side inside the
// function — it is never sent to a browser. A coach reads only his own row
// (row-level security); this function is how the league owner reads across all.
//
// Deploy:
//   supabase functions deploy admin-seasons
// Set who is allowed (comma-separated emails; the platform injects the rest):
//   supabase secrets set ADMIN_EMAILS="you@club.com,partner@club.com"
// Keep verify_jwt ON (the default) so only a real Supabase user token gets here.
//
// The Admin Portal (admin/index.html) signs the owner in for a token, then GETs
//   {SUPABASE_URL}/functions/v1/admin-seasons
// with apikey: <anon> and Authorization: Bearer <that token>.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Function is not configured." }, 500);

  const admins = (Deno.env.get("ADMIN_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) return json({ error: "No admin list is configured." }, 500);

  // Who is calling? Verify the bearer token against Auth with the anon client.
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in as an admin first." }, 401);

  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: who, error: whoErr } = await asUser.auth.getUser();
  const email = who?.user?.email?.toLowerCase() ?? "";
  if (whoErr || !email) return json({ error: "That sign-in is not valid." }, 401);
  if (!admins.includes(email)) return json({ error: "This account is not on the admin list." }, 403);

  // Read every coach's row with the service key (bypasses RLS), server-side only.
  const asAdmin = createClient(url, service, { auth: { persistSession: false } });
  const { data, error } = await asAdmin
    .from("seasons")
    .select("label, payload, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);

  return json(data ?? []);
});
