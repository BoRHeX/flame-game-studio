// Authored jobs share identical solver/renderer contracts; only definitions differ.
export const JOBS=Object.freeze([
  {
    id:'backyard',symbol:'✦',chamber:'backyard',burner:{airflowFactor:1,heatLoss:0.35},
    initialCash:110,payout:45,deadline:130,
    objective:{type:'light-hold',seconds:4,minStability:0.43},
    clue:['◆','≋','ϟ','◎'],label:'Backyard light-off'
  },
  {
    id:'warehouse',symbol:'▤',chamber:'warehouse',
    burner:{airflowFactor:0.71,draftFactor:0.78,heatLoss:0.33},
    initialCash:130,payout:85,deadline:155,
    objective:{type:'light-hold',seconds:6,minStability:0.57},
    clue:['≋','↻','◎'],label:'Warehouse restart'
  },
  {
    id:'heat-hold',symbol:'◉',chamber:'heat-hold',
    burner:{airflowFactor:0.90,draftFactor:1.05,heatLoss:0.24},
    initialCash:150,payout:125,deadline:185,
    objective:{type:'temperature-hold',seconds:8,minTemp:0.62,maxTemp:1.25,maxSoot:0.18,minStability:0.53},
    clue:['ϟ','◉','◎'],label:'Heat-hold contract'
  }
]);
export class MissionEvaluator{
  constructor(job){this.job=job;this.hold=0;this.status='active';this.elapsed=0;}
  tick(simDt,missionDt,state,money){
    if(this.status!=='active')return this.status;
    this.elapsed+=missionDt;
    if(state.failed||money<=0||this.elapsed>=this.job.deadline){this.status='failed';return this.status;}
    const o=this.job.objective;
    let good=state.mainLit&&state.pilotLit&&state.stability>=o.minStability;
    if(o.type==='temperature-hold')good=good&&state.temperature>=o.minTemp&&state.temperature<=o.maxTemp&&state.soot<=o.maxSoot;
    this.hold=good?this.hold+simDt:Math.max(0,this.hold-simDt*1.2);
    if(this.hold>=o.seconds)this.status='won';
    return this.status;
  }
  progress(){return Math.min(1,this.hold/this.job.objective.seconds);}
}
