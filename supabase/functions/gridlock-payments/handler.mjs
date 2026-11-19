import {AMOUNT,UUID,exactWebUrl,signAccess,readJson,metadata,boundMetadata,rpc} from '../_shared/web-payments.mjs';

export function createPaymentsHandler(env,createClient,stripe,now=()=>Date.now()) {
  const mode=env.get('GRIDLOCK_STRIPE_MODE')||'test',live=mode==='live';
  const app=exactWebUrl(env.get('PAYMENTS_APP_URL'),!live);
  const project=env.get('SUPABASE_URL'),service=env.get('SUPABASE_SERVICE_ROLE_KEY');
  return async(req)=>{
    const origin=req.headers.get('origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    if(app && origin===app.origin)Object.assign(headers,{'Access-Control-Allow-Origin':origin,
      'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(!app || !['test','live'].includes(mode) || !project || !service)return reply({error:'Payments are not configured.'},503);
    if(origin && origin!==app.origin)return reply({error:'Origin not allowed.'},403);
    if(req.method==='OPTIONS')return origin===app.origin?new Response(null,{status:204,headers}):reply({error:'Origin required.'},403);
    if(req.method!=='POST')return reply({error:'Use POST.'},405);
    const bearer=(req.headers.get('authorization')||'').match(/^Bearer ([^\s]+)$/i)?.[1];
    if(!bearer || bearer.length>16384)return reply({error:'Sign in first.'},401);
    let body;try{body=await readJson(req);}catch{return reply({error:'Use a small JSON request.'},400);}
    if(!body || Array.isArray(body) || Object.keys(body).length!==1 || !['access','checkout'].includes(body.action))
      return reply({error:'Choose access or checkout.'},400);
    try {
      const db=createClient(project,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const who=await db.auth.getUser(bearer),user=who.data?.user;
      if(who.error || !UUID.test(user?.id||''))return reply({error:'Sign in again.'},401);
      if(!user.email_confirmed_at || typeof user.email!=='string')return reply({error:'Confirm your email first.'},403);
      const access=await rpc(db,'gridlock_payment_access',{p_owner:user.id,p_live:live});
      if(!access || !['free','program'].includes(access.plan))throw new Error('Invalid access');
      if(body.action==='access'){
        const expires=access.expires_at===null || access.expires_at===undefined ? null : Date.parse(access.expires_at);
        if(expires!==null && !Number.isFinite(expires))throw new Error('Invalid expiry');
        const receipt=await signAccess(JSON.parse(env.get('GRIDLOCK_ACCESS_PRIVATE_JWK')||'null'),{
          user:user.id,plan:access.plan,source:access.source,expires,audience:app.origin,mode
        },now());
        return reply({ok:true,user:{id:user.id},receipt});
      }
      if(access.plan==='program')return reply({ok:true,alreadyActive:true});
      // Two independent switches: deployable code does not enable charges.
      const pilot=(env.get('GRIDLOCK_LIVE_PILOT_UIDS')||'').split(',').map(s=>s.trim()).filter(s=>UUID.test(s));
      if(!stripe || env.get('GRIDLOCK_CHECKOUT_ENABLED')!=='true' ||
        (live && env.get('GRIDLOCK_LIVE_FLOW_VERIFIED')!=='true' && !pilot.includes(user.id)))
        return reply({error:'Purchases are not open yet. Your saved season is safe.'},503);
      const priceId=env.get('STRIPE_COACH_PRICE_ID')||'';
      if(!/^price_[A-Za-z0-9]+$/.test(priceId))throw new Error('Price not configured');
      const price=await stripe.prices.retrieve(priceId);
      if(!price.active || price.type!=='one_time' || price.currency!=='usd' ||
        price.unit_amount!==AMOUNT || price.livemode!==live)
        return reply({error:'The pass price could not be confirmed. Nothing was charged.'},503);
      for(let attempt=0;attempt<2;attempt++){
        const order=await rpc(db,'gridlock_reserve_checkout',{p_owner:user.id,p_live:live});
        if(order.access)return reply({ok:true,alreadyActive:true});
        if(!UUID.test(order.id||'') || order.owner!==user.id || order.live!==live)throw new Error('Invalid order');
        let session;
        if(order.checkout_id){
          session=await stripe.checkout.sessions.retrieve(order.checkout_id);
          const m=boundMetadata(session);
          if(!m || m.gridlock_order!==order.id || m.gridlock_owner!==user.id || session.livemode!==live)
            throw new Error('Invalid session');
          if(session.status==='expired'){
            await rpc(db,'gridlock_expire_checkout',{p_order:order.id,p_session:session.id});continue;
          }
          if(session.status==='complete')return reply({ok:true,pending:true});
        }else{
          if(now()-Date.parse(order.created_at)>23*3600000)
            return reply({error:'An earlier checkout needs checking. Contact support before paying again.'},409);
          const meta=metadata(order.id,user.id);
          session=await stripe.checkout.sessions.create({
            mode:'payment',line_items:[{price:priceId,quantity:1}],adaptive_pricing:{enabled:false},
            allowed_payment_method_types:['card','link'],
            client_reference_id:user.id,customer_email:user.email,
            metadata:meta,payment_intent_data:{metadata:meta},
            success_url:app.href+'?payment=return',cancel_url:app.href+'?payment=cancelled',
            integration_identifier:'gridlock_coach_lqmpzvra',
            custom_text:{submit:{message:'All Coach tools for this account until midnight Eastern on the payment date. One-time payment; no automatic renewal.'}}
          },{idempotencyKey:'gridlock-checkout-'+order.id});
          if(session.livemode!==live)throw new Error('Wrong Stripe mode');
          await rpc(db,'gridlock_attach_checkout',{p_order:order.id,p_session:session.id});
        }
        const target=new URL(session.url);
        if(target.protocol!=='https:' || target.hostname!=='checkout.stripe.com' || target.username || target.password)
          throw new Error('Invalid checkout URL');
        return reply({ok:true,url:target.href});
      }
      return reply({error:'Checkout needs another check. Try again.'},409);
    }catch{
      // No raw Stripe/database exception, token, tax data or key in responses/logs.
      return reply({error:'Payments could not be checked. Do not pay again if you were charged; contact support.'},503);
    }
  };
}
