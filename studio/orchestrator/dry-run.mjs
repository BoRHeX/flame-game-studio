// Demonstrates scoped task compilation without sending any request to a provider.
import {readFileSync} from 'node:fs';
import {compileBrief} from './context.mjs';
const file=process.argv[2]||'studio/work-orders/flame-lab-renderer.json';
const workOrder=JSON.parse(readFileSync(file,'utf8'));
console.log(JSON.stringify(compileBrief(workOrder),null,2));
