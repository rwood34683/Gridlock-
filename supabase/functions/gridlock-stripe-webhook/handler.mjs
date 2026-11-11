import {AMOUNT,boundMetadata,readRaw,rpc} from '../_shared/web-payments.mjs';

// Signature verification precedes every read of event data. Payment time is
// the signed payment_intent.succeeded event time, not browser/Checkout time.
export function createStripeWebhook(env,createClient,stripe,now=()=>Date.now()) {
  const live=env.get('GRIDLOCK_STRIPE_MODE')==='live';
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  return async(req)=>{
    if(!['test','live'].includes(env.get('GRIDLOCK_STRIPE_MODE')))return reply({error:'Payments are not configured.'},503);
    if(req.method!=='POST')return reply({error:'Use POST.'},405);
    const signature=req.headers.get('stripe-signature'),secret=env.get('STRIPE_WEBHOOK_SECRET');
    if(!stripe || !signature || !secret)return reply({error:'Signature required.'},400);
    let event;
    try{event=await stripe.webhooks.constructEventAsync(await readRaw(req),signature,secret,300);}
    catch{return reply({error:'Invalid payment signature.'},400);}
    if(event.livemode!==live)return reply({error:'Wrong payment mode.'},400);
    const supported=['checkout.session.completed','checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed','checkout.session.expired','payment_intent.succeeded',
      'charge.refunded','charge.dispute.created'];
    if(!supported.includes(event.type))return reply({received:true});
    try{
      const db=createClient(env.get('SUPABASE_URL'),env.get('SUPABASE_SERVICE_ROLE_KEY'),
        {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const object=event.data.object;
      let intent,meta,kind,paidAt=null,refunded=false,disputed=false;
      if(event.type.startsWith('checkout.session.')){
        meta=boundMetadata(object);if(!meta)return reply({received:true});
        // Retrieve the session to avoid granting from an old event snapshot.
        const session=await stripe.checkout.sessions.retrieve(object.id);
        if(session.livemode!==live || session.client_reference_id!==meta.gridlock_owner ||
          boundMetadata(session)?.gridlock_order!==meta.gridlock_order)throw new Error('Session mismatch');
        if(event.type==='checkout.session.expired'){
          if(session.status==='expired')await rpc(db,'gridlock_expire_checkout',{
            p_order:meta.gridlock_order,p_session:session.id});
          return reply({received:true});
        }
        if(!session.payment_intent)return reply({received:true});
        intent=await stripe.paymentIntents.retrieve(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id,{expand:['latest_charge']});
        kind=event.type==='checkout.session.async_payment_failed'?'failed':'processing';
        // Completion only records processing. The signed succeeded event is
        // mandatory: it fixes midnight correctly even for delayed methods.
      }else if(event.type==='payment_intent.succeeded'){
        meta=boundMetadata(object);if(!meta)return reply({received:true});
        intent=await stripe.paymentIntents.retrieve(object.id,{expand:['latest_charge']});
        if(intent.status!=='succeeded')throw new Error('Payment not confirmed');
        if(!Number.isSafeInteger(event.created) || event.created<=0 || event.created*1000>now()+300000)
          throw new Error('Invalid payment time');
        kind='paid';paidAt=new Date(event.created*1000).toISOString();
      }else{
        const chargeId=event.type==='charge.refunded'?object.id:object.charge;
        const charge=await stripe.charges.retrieve(typeof chargeId==='string'?chargeId:chargeId.id);
        if(!charge.payment_intent)return reply({received:true});
        intent=await stripe.paymentIntents.retrieve(typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent.id,{expand:['latest_charge']});
        meta=boundMetadata(intent);if(!meta)return reply({received:true});
        kind=event.type==='charge.refunded'?'refund':'dispute';
        refunded=charge.refunded===true && charge.amount_refunded>=AMOUNT;
        disputed=kind==='dispute';
      }
      const verified=boundMetadata(intent);
      if(!verified || verified.gridlock_order!==meta.gridlock_order || verified.gridlock_owner!==meta.gridlock_owner ||
        intent.livemode!==live || intent.currency!=='usd' || intent.amount!==AMOUNT ||
        (kind==='paid' && intent.amount_received!==AMOUNT))throw new Error('Payment mismatch');
      const charge=intent.latest_charge;
      if(charge && typeof charge==='object'){
        refunded=refunded || (charge.refunded===true && charge.amount_refunded>=AMOUNT);
        disputed=disputed || charge.disputed===true;
      }
      const result=await rpc(db,'gridlock_apply_payment_event',{p_id:event.id,p_kind:kind,p_live:live,
        p_order:meta.gridlock_order,p_owner:meta.gridlock_owner,p_intent:intent.id,p_paid_at:paidAt,
        p_refunded:refunded,p_disputed:disputed});
      if(result.refund_due && !result.refunded){
        // Full automatic refund only for duplicate charges or undeliverable
        // access, the owner's approved policy. Idempotent across webhook retries.
        await stripe.refunds.create({payment_intent:intent.id,reason:result.refund_due==='duplicate'?'duplicate':'requested_by_customer'},
          {idempotencyKey:'gridlock-refund-'+intent.id});
      }
      return reply({received:true});
    }catch{return reply({error:'Payment update needs retry.'},500);}
  };
}
