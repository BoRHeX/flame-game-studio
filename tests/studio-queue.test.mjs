import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectProductionRequest} from '../studio/orchestrator/queue.mjs';
const request={requestId:'ICE-20261111-FLAME-003',order:'studio/work-orders/ice-flame-polish-01.json',note:'Assistant controlled single run'};
test('assistant can queue a scoped run without manual GitHub dispatch',()=>{
 const selection=selectProductionRequest({eventName:'push',queuedRequest:request});
 assert.equal(selection.orderPath,request.order);
 assert.equal(selection.id,'ICE-FLAME-001');
 assert.equal(selection.role,'particle_engineer');
});
test('manual dispatch remains an optional validated fallback',()=>{
 const selection=selectProductionRequest({eventName:'workflow_dispatch',manualOrder:request.order});
 assert.equal(selection.id,'ICE-FLAME-001');
});
test('invalid requests and unsupported event types fail closed',()=>{
 for(const req of [
  {...request,order:'../../.github/workflows/ice-studio-produce.yml'},
  {...request,order:'studio/work-orders/../budget/policy.json'},
  {...request,requestId:'!bad'},
  {...request,order:'studio/work-orders/nonexistent.json'},
  {...request,extra:'attack'}
 ])assert.throws(()=>selectProductionRequest({eventName:'push',queuedRequest:req}));
 assert.throws(()=>selectProductionRequest({eventName:'pull_request',queuedRequest:request}));
});
test('GitHub Actions triggers only on dedicated main branch queue file',()=>{
 const yaml=readFileSync(new URL('../.github/workflows/ice-studio-produce.yml',import.meta.url),'utf8');
 assert.match(yaml,/push:\s*\n\s+branches: \[main\]\s*\n\s+paths:\s*\n\s+- 'studio\/requests\/next\.json'/);
 assert.match(yaml,/group: ice-paid-studio-reservations/);
 assert.match(yaml,/vars\.ICE_STUDIO_ENABLED == 'true'/);
 assert.match(yaml,/needs\.reserve\.outputs\.order_path/);
});
