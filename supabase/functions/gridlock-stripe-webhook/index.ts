import Stripe from 'npm:stripe@23.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2';
import {createStripeWebhook} from './handler.mjs';
import {STRIPE_API_VERSION} from '../_shared/web-payments.mjs';
const key=Deno.env.get('STRIPE_API_KEY');
const stripe=key ? new Stripe(key,{apiVersion:STRIPE_API_VERSION}) : null;
Deno.serve(createStripeWebhook(Deno.env,createClient,stripe));
