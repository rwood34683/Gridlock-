import {createClient} from "npm:@supabase/supabase-js@2";
import {createAccountHandler} from "./handler.ts";
Deno.serve(createAccountHandler(Deno.env,createClient));
