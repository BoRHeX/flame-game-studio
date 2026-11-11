// Local budget math. A true daily/global cap requires an atomic, durable
// shared ledger with concurrency control. Paid invocation is therefore disabled.
export function dollarsForTokens({input=0,cached=0,output=0},pricing){
 for(const v of [input,cached,output,pricing.inputPerMillion,pricing.cachedInputPerMillion,pricing.outputPerMillion]){
   if(!Number.isFinite(v)||v<0)throw Error('invalid budget arithmetic');
 }
 if(cached>input)throw Error('cached tokens exceed input tokens');
 return ((input-cached)*pricing.inputPerMillion+cached*pricing.cachedInputPerMillion+
   output*pricing.outputPerMillion)/1_000_000;
}
export function assertWithinCap(estimate,cap){
 if(!Number.isFinite(estimate)||estimate<0||!Number.isFinite(cap)||cap<0)throw Error('invalid cost cap');
 if(estimate>cap)throw Error('estimated spend exceeds budget');
 return true;
}
export function canInvokePaid(policy){
 // Safety default: explicit flags and a separately audited, shared ledger are mandatory.
 return policy.STUDIO_ENABLED===true && policy.ENFORCEMENT_IMPLEMENTED===true &&
   policy.DURABLE_LEDGER_ENABLED===true;
}
