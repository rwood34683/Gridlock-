// All privileged database operations live behind a verified Auth UUID allowlist.
type ClientOptions = { auth: { persistSession: boolean; autoRefreshToken: boolean; detectSessionInUrl: boolean } };
type ClientFactory = (url: string, key: string, options: ClientOptions) => any;
type Settings = { get(name: string): string | undefined };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLANS = new Set(["free", "team", "program"]);
const MAX_BODY = 4096;
const split = (value: string | undefined) => (value || "").split(",").map((s) => s.trim()).filter(Boolean);
function exactOrigin(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || u.pathname !== "/") return null;
    if (u.protocol !== "https:" && !(u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))) return null;
    return u.origin;
  } catch { return null; }
}
const text = (value: unknown): string | null => typeof value === "string" ? value : null;
function entitlement(row: any) {
  return row ? { user_id: text(row.user_id), plan: PLANS.has(row.plan) ? row.plan : "free",
    expires_at: text(row.expires_at), source: text(row.source), updated_at: text(row.updated_at) } : null;
}
function pageArgs(url: URL) {
  const page = url.searchParams.get("page") || "1", perPage = url.searchParams.get("per_page") || "50";
  if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(perPage)) return null;
  const p = Number(page), n = Number(perPage);
  return p <= 100000 && n <= 100 ? { page: p, per_page: n, offset: (p - 1) * n } : null;
}
function expiry(value: unknown, now: number): string | null | false {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed <= now) return false;
  const normalized = value.includes(".") ? value : value.replace("Z", ".000Z");
  return new Date(parsed).toISOString() === normalized ? normalized : false;
}
async function readBody(req: Request): Promise<unknown> {
  const announced = req.headers.get("content-length");
  if (announced && Number(announced) > MAX_BODY) throw new Error("too-large");
  if (!req.body) throw new Error("invalid-json");
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); throw new Error("too-large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export function createAdminHandler(settings: Settings, createClient: ClientFactory, now = () => Date.now(), audit = (event: Record<string, unknown>) => console.info(JSON.stringify(event))) {
  const projectUrl = settings.get("SUPABASE_URL") || "", serviceKey = settings.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const ids = split(settings.get("ADMIN_USER_IDS")).map((s) => s.toLowerCase());
  const origins = split(settings.get("ADMIN_ALLOWED_ORIGINS")).map(exactOrigin);
  const configured = !!(exactOrigin(projectUrl) && serviceKey && ids.length && ids.every((id) => UUID.test(id)) && origins.length && origins.every(Boolean));
  const admins = new Set(ids);
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin"), originAllowed = !origin || origins.includes(origin);
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff",
    };
    if (origin && originAllowed) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type";
      headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    }
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!configured) return reply({ error: "Administration is not configured." }, 503);
    if (!originAllowed) return reply({ error: "This origin is not allowed." }, 403);
    if (req.method === "OPTIONS") {
      const method = req.headers.get("access-control-request-method");
      if (!origin || (method && !["GET", "POST"].includes(method))) return reply({ error: "Invalid preflight." }, 403);
      return new Response(null, { status: 204, headers });
    }
    if (!["GET", "POST"].includes(req.method)) return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: { ...headers, Allow: "GET, POST, OPTIONS" } });
    const match = (req.headers.get("authorization") || "").match(/^Bearer ([^\s]+)$/i);
    if (!match || match[1].length > 16384) return reply({ error: "Sign in as an administrator." }, 401);
    try {
      // The service key supplies the server API key. The caller's bearer token
      // is explicitly verified; role or email values supplied by a caller are ignored.
      const db = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data: who, error: authError } = await db.auth.getUser(match[1]);
      const user = who?.user;
      if (authError || !user || typeof user.id !== "string" || !UUID.test(user.id)) return reply({ error: "Your sign-in is no longer valid. Sign in again." }, 401);
      if (!user.email_confirmed_at || typeof user.email !== "string" || !admins.has(user.id.toLowerCase())) return reply({ error: "This account does not have administrator access." }, 403);
      const caller = { id: user.id, email: user.email };
      const {data:verified,error:claimsError}=await db.auth.getClaims(match[1]);
      const claims=verified?.claims;
      if(claimsError || claims?.sub!==user.id) return reply({error:"Your sign-in could not be verified."},401);
      const mfaRequired=claims.aal!=="aal2";
      if(req.method==="GET" && new URL(req.url).searchParams.get("action")==="identity") return reply({caller,mfa_required:mfaRequired});
      if(mfaRequired) return reply({error:"Verify your authenticator to use administration.",code:"mfa_required"},403);
      if (req.method === "GET") {
        const url = new URL(req.url), paging = pageArgs(url);
        if (!paging) return reply({ error: "Use a positive page and per_page between 1 and 100." }, 400);
        const { page, per_page, offset } = paging;
        const action = url.searchParams.get("action") || "overview";
        if (action === "overview") {
          const { data, error } = await db.auth.admin.listUsers({ page, perPage: per_page });
          if (error || !Array.isArray(data?.users)) return reply({ error: "User accounts could not be loaded." }, 502);
          const users = data.users, userIds = users.map((u: any) => u.id);
          let rows: any[] = [];
          if (userIds.length) {
            const result = await db.from("entitlements").select("user_id,plan,expires_at,source,updated_at").in("user_id", userIds);
            if (result.error || !Array.isArray(result.data)) return reply({ error: "Account plans could not be loaded." }, 502);
            rows = result.data;
          }
          const plans = new Map(rows.map((r: any) => [r.user_id, entitlement(r)]));
          const hasMore = Number.isInteger(data.total) ? page * per_page < data.total : Number.isInteger(data.nextPage) ? data.nextPage > page : users.length === per_page;
          return reply({ caller, users: users.map((u: any) => ({
            id: u.id, email: text(u.email), created_at: text(u.created_at), last_sign_in_at: text(u.last_sign_in_at),
            email_confirmed_at: text(u.email_confirmed_at), entitlement: plans.get(u.id) || null,
          })), page, per_page, has_more: hasMore });
        }
        if (action === "seasons") {
          const size=Math.min(per_page,5),start=(page-1)*size;
          const { data, error } = await db.from("seasons").select("owner,label,payload,updated_at")
            .is("deleted_at",null)
            .order("updated_at", { ascending: false }).order("owner", { ascending: true }).range(start, start + size);
          if (error || !Array.isArray(data)) return reply({ error: "Uploaded seasons could not be loaded." }, 502);
          return reply({ caller, seasons: data.slice(0, size).map((s: any) => ({ owner: s.owner, label: text(s.label), payload: s.payload, updated_at: text(s.updated_at) })), page, per_page:size, has_more: data.length > size });
        }
        return reply({ error: "Unknown administration action." }, 400);
      }
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) return reply({ error: "Send a JSON request." }, 415);
      let body: any;
      try { body = await readBody(req); }
      catch (error) { const tooLarge = error instanceof Error && error.message === "too-large"; return reply({ error: tooLarge ? "Request is too large." : "Invalid JSON request." }, tooLarge ? 413 : 400); }
      if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).some((key) => !["action", "user_id", "plan", "expires_at"].includes(key)) ||
        body.action !== "set_entitlement" || typeof body.user_id !== "string" || !UUID.test(body.user_id) || !PLANS.has(body.plan)) return reply({ error: "Choose a valid user and Free, Team, or Program plan." }, 400);
      const expiresAt = expiry(body.expires_at, now());
      if (expiresAt === false || (body.plan === "free" && expiresAt !== null)) return reply({ error: "Use no expiry, or a future UTC expiry for a paid plan." }, 400);
      const target = await db.auth.admin.getUserById(body.user_id);
      if (target.error || !target.data?.user) return reply({ error: "That user account was not found." }, 404);
      const record = { user_id: target.data.user.id, plan: body.plan, expires_at: expiresAt, source: "admin:" + user.id, updated_at: new Date(now()).toISOString() };
      const saved = await db.rpc("gridlock_admin_set_entitlement",{actor:user.id,target:record.user_id,new_plan:record.plan,new_expiry:record.expires_at});
      if (saved.error || !saved.data) return reply({ error: "The plan could not be saved. Refresh before retrying." }, 502);
      // Log only the completed administrative change, never a token, email,
      // password, or season payload. Logging failure must not imply the write failed.
      try { audit({ event: "gridlock.admin.entitlement.updated", actor_user_id: user.id,
        target_user_id: record.user_id, plan: record.plan, expires_at: record.expires_at, timestamp: record.updated_at }); } catch { /* Best-effort platform log. */ }
      return reply({ ok: true, entitlement: entitlement(saved.data) });
    } catch { return reply({ error: "The account service could not be reached. Try again shortly." }, 502); }
  };
}
