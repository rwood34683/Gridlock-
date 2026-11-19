import {createClient} from "npm:@supabase/supabase-js@2";
import {createHuntHandler} from "./handler.ts";
Deno.serve(createHuntHandler(Deno.env,createClient));
