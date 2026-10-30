// Gridlock administration. Configure immutable Auth UUIDs and exact browser origins.
// ADMIN_USER_IDS=uuid1,uuid2
// ADMIN_ALLOWED_ORIGINS=https://your-staging-host
// Platform-provided SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY stay server-side.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createAdminHandler } from "./handler.ts";

Deno.serve(createAdminHandler(Deno.env, createClient));
