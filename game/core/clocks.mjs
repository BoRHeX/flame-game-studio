// Independent simulation, presentation, mission, audio and economy clocks.
// Simulation time scaling never changes requested world/flame presentation frame rates.
export const TIME_PROFILES=Object.freeze({
  normal:Object.freeze({process:1,mission:1,cashDrain:1}),
  watching:Object.freeze({process:2,mission:2,cashDrain:0.35})
});
export class GameClocks {
  constructor(){this.simTime=0;this.missionTime=0;this.economyTime=0;this.worldAccumulator=0;this.flameAccumulator=0;this.simAccumulator=0;}
  // Consume a bounded wall-time increment: avoids a background-tab catch-up spiral.
  advance(realSeconds,watching,onStep){
    if(!Number.isFinite(realSeconds)||realSeconds<0)throw Error('invalid elapsed time');
    const elapsed=Math.min(realSeconds,0.10);
    const profile=watching?TIME_PROFILES.watching:TIME_PROFILES.normal;
    const fixed=1/60;
    this.simAccumulator+=elapsed;
    this.worldAccumulator+=elapsed;
    this.flameAccumulator+=elapsed;
    let steps=0;
    while(this.simAccumulator>=fixed && steps<7){
      this.simAccumulator-=fixed;
      this.simTime+=fixed*profile.process;
      this.missionTime+=fixed*profile.mission;
      this.economyTime+=fixed*profile.cashDrain;
      onStep(fixed*profile.process,fixed*profile.mission,fixed*profile.cashDrain);
      steps++;
    }
    if(steps===7)this.simAccumulator=0;
    const world=this.worldAccumulator>=1/18;
    const flame=this.flameAccumulator>=1/24;
    if(world)this.worldAccumulator%=1/18;
    if(flame)this.flameAccumulator%=1/24;
    return {world,flame,steps};
  }
  resetMission(){this.missionTime=0;}
}
