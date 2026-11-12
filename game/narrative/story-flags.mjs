// Pass Two narrative state contains no rewards or campaign finale.
const FLAG_NAMES = [
  'metOperator', 'learnedDraft', 'backyardComplete',
  'warehouseComplete', 'heatHoldComplete', 'assisted'
];

const JOB_FLAGS = Object.freeze({
  backyard: 'backyardComplete',
  warehouse: 'warehouseComplete',
  'heat-hold': 'heatHoldComplete'
});

const OPTIONS = Object.freeze({
  diagnose: {id: 'diagnose', icon: '◎', text: 'Inspect the flame and draft.'},
  assist: {id: 'assist', icon: '♟', text: 'Ask the operator for guidance.'},
  independent: {id: 'independent', icon: '↻', text: 'Work the equipment independently.'},
  leave: {id: 'leave', icon: '↩', text: 'Return to the equipment.'}
});

export class StoryState {
  constructor(snapshot = null) {
    this.flags = Object.fromEntries(FLAG_NAMES.map(name => [name, false]));
    this.choice = null;
    if (!snapshot || typeof snapshot !== 'object' || snapshot.version !== 1) return;
    const flags = snapshot.flags;
    if (flags && typeof flags === 'object' && !Array.isArray(flags)) {
      for (const name of FLAG_NAMES) {
        if (Object.prototype.hasOwnProperty.call(flags, name) && typeof flags[name] === 'boolean') {
          this.flags[name] = flags[name];
        }
      }
    }
    if (snapshot.choice === 'independent' || snapshot.choice === 'assisted') {
      this.choice = snapshot.choice;
    }
    if (this.choice === 'assisted') this.flags.assisted = true;
  }

  snapshot() {
    return {version: 1, flags: {...this.flags}, choice: this.choice};
  }

  record(event, jobId = null) {
    switch (event) {
      case 'meet':
        this.flags.metOperator = true;
        break;
      case 'diagnose':
        this.flags.learnedDraft = true;
        break;
      case 'assist':
        this.flags.assisted = true;
        this.choice = 'assisted';
        break;
      case 'independent':
        this.choice = 'independent';
        break;
      case 'complete':
        if (Object.prototype.hasOwnProperty.call(JOB_FLAGS, jobId)) {
          this.flags[JOB_FLAGS[jobId]] = true;
        }
        break;
    }
  }

  dialogue(context = {}) {
    const {jobId = null, mainLit = false, damperRepaired = false} = context || {};
    let icon;
    let text;
    let choices;

    if (jobId === 'backyard') {
      icon = mainLit ? '◎' : 'ϟ';
      text = this.flags.backyardComplete
        ? 'The backyard contract is complete. The observation port is still yours to inspect.'
        : mainLit
          ? 'The main flame is attached. Watch it through the port and hold it steady.'
          : 'At the backyard burner, establish the pilot before watching the main flame.';
    } else if (jobId === 'warehouse') {
      icon = damperRepaired ? (mainLit ? '◎' : 'ϟ') : '≋';
      text = this.flags.warehouseComplete
        ? 'The warehouse restart is complete; the restricted draft still deserves a look.'
        : !damperRepaired
          ? 'The warehouse damper is sticky. Inspect the draft path before trying to hold the flame.'
          : mainLit
            ? 'The damper is repaired and the flame is lit. Verify the draft and hold steady.'
            : 'The damper is repaired. Return to the burner and check the flame as it lights.';
    } else if (jobId === 'heat-hold') {
      icon = mainLit ? '◉' : 'ϟ';
      text = this.flags.heatHoldComplete
        ? 'The heat-hold contract is complete. The heater remains available to inspect.'
        : mainLit
          ? 'Watch the heater: hold the flame steady without soot or excessive heat.'
          : 'The heater is waiting. Light the burner, then verify the flame and heat.';
    } else {
      icon = this.flags.metOperator ? '◎' : '♟';
      text = this.flags.warehouseComplete
        ? 'The warehouse is running. The heater contract waits at the board.'
        : this.flags.backyardComplete
          ? 'The backyard is running. The warehouse draft needs attention next.'
          : 'The workshop operator points from the contract board to the observation port.';
    }

    if (this.choice === 'assisted') {
      text += ' The operator can point out what to inspect; you still control the equipment.';
      choices = ['diagnose', 'independent', 'leave'];
    } else if (this.choice === 'independent') {
      text += this.flags.learnedDraft
        ? ' Use your draft inspection and verify the flame yourself.'
        : ' Inspect the draft yourself, or ask for guidance if needed.';
      choices = ['diagnose', 'assist', 'leave'];
    } else {
      choices = this.flags.learnedDraft
        ? ['independent', 'assist', 'leave']
        : ['diagnose', 'assist', 'independent'];
    }

    return {icon, text, options: choices.map(id => ({...OPTIONS[id]}))};
  }
}
