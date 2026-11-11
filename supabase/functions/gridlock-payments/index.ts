import Stripe from 'npm:stripe@23.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createPaymentsHandler} from './handler.mjs';
import {STRIPE_API_VERSION} from '../_shared/web-payments.mjs';
const key=Deno.env.get('STRIPE_API_KEY');
const stripe=key ? new Stripe(key,{apiVersion:STRIPE_API_VERSION}) : null;
Deno.serve(createPaymentsHandler(Deno.env,createClient,stripe));
