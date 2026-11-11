import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateWorkOrder} from '../studio/orchestrator/context.mjs';
import {validateProposal} from '../studio/runtime/proposal.mjs';
import {normalizeAgentDraft,runSession} from '../studio/runtime/runner.mjs';
const order=JSON.parse(readFileSync('studio/work-orders/ice-flame-root-01.json','utf8'));
test('target-file scope cannot escape its role or accepted paths',()=>{
 assert.equal(validateWorkOrder(order).role.id,'particle_engineer');
 assert.throws(()=>validateWorkOrder({...order,target_file:'studio/runtime/runner.mjs'}));
 assert.throws(()=>validateWorkOrder({...order,target_file:'game/simulation/burner.mjs'}));
});
test('single-file response has no model-controlled destination',()=>{
 const raw={summary:'Keep a deterministic flame',content:"export const flame=1;\n",tests:[],risks:[]};
 const normalized=normalizeAgentDraft(raw,order);
 assert.deepEqual(normalized.changes,[{path:order.target_file,content:raw.content}]);
 const proposal={orderId:order.id,runId:'123',changes:normalized.changes};
 assert.equal(validateProposal(proposal,order)[0].path,order.target_file);
 assert.throws(()=>validateProposal({...proposal,changes:[{path:'game/flame/other.mjs',content:'ok'}]},order));
 assert.throws(()=>validateProposal({...proposal,changes:[]},order));
});
test('model completes one targeted source file, reviewer accepts and billing is recorded',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'ice-single-file-'));
 const saved={ICE_STUDIO_ENABLED:process.env.ICE_STUDIO_ENABLED,GITHUB_RUN_ID:process.env.GITHUB_RUN_ID,
 OPENAI_API_KEY:process.env.OPENAI_API_KEY};
 process.env.ICE_STUDIO_ENABLED='true';
 process.env.GITHUB_RUN_ID='90123';
 process.env.OPENAI_API_KEY='fake-test';
 const outputs=[
  {summary:'one file',steps:['improve'],contracts:[]},
  {summary:'targeted patch',content:'export class FlameParticles {}\n',tests:['unit'],risks:[]},
  {approved:true,concerns:[],missing_tests:[]}
 ];
 let count=0,call2;
 const mock=async(_url,req)=>{
  if(count===1)call2=JSON.parse(req.body);
  const output=outputs[count++];
  return {ok:true,status:200,json:async()=>({
   status:'completed',
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}],
   usage:{input_tokens:100,output_tokens:50,input_tokens_details:{cached_tokens:0}}
  })};
 };
 try{
  const result=await runSession('studio/work-orders/ice-flame-root-01.json',
   join(temp,'proposal.json'),{fetchImpl:mock,reportPath:join(temp,'spend.json')});
  assert.equal(count,3);
  assert.ok(call2.text.format.schema.properties.content);
  assert.equal(call2.text.format.schema.properties.changes,undefined);
  assert.deepEqual(result.changes.map(x=>x.path),[order.target_file]);
  assert.equal(result.review.approved,true);
  assert.equal(JSON.parse(readFileSync(join(temp,'spend.json'),'utf8')).modelAudit.length,3);
 }finally{
  for(const [k,v] of Object.entries(saved)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
