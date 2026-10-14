import type { Activity } from './generate.functions';
import { isContentsListing } from './note-source-noise';

export const NCERT_LABS = 'https://ncert.nic.in/science-laboratory-manual.php';
export type ExperimentActivity = Activity & {
  source_url?: string; source_excerpt?: string; procedure_source?: 'uploaded' | 'manual';
  precautions?: string[]; visual_kind?: 'circuit' | 'leaf';
};
const steps = (items: string[]) => items.map((description, index) => ({ step: index + 1, title: ['Prepare', 'Set up', 'Perform', 'Measure', 'Compare', 'Explain'][index] || `Step ${index + 1}`, description }));

/** Short, reviewed NCERT-manual supplements, explicitly separate from uploaded text. */
export function preparedExperiment(topic: string): ExperimentActivity | undefined {
  if (/alcohol|ethanol|alcoholic.*group/i.test(topic) && !/esterification/i.test(topic)) return {
    name: 'Alcoholic –OH group: ceric ammonium nitrate test', objective: 'Observe the colour response of the selected alcohol sample.',
    apparatus: ['Test tube', 'Holder', 'Dropper', 'Prepared sample solution', 'Ceric ammonium nitrate solution'],
    steps: steps(['The teacher selects a suitable solvent and prepares the sample solution.', 'Place 1 mL of the prepared sample solution in a test tube.', 'Add a few drops of ceric ammonium nitrate solution.', 'Observe the immediate colour response; compare with the starting solution.', 'Record the initial result promptly. Avoid excess reagent because the red colour can disappear.']),
    observation: 'A positive test gives a red colour. The colour may disappear on standing or with excess reagent.',
    conclusion: 'The immediate red response supports an alcoholic –OH group; interpret it with the complete identification procedure.',
    precautions: ['Teacher-supervised chemical test. Wear eye protection; do not taste or directly smell the reagents.'],
    source_url: 'https://ncert.gov.in/pdf/publication/sciencelaboratorymanuals/classXII/chemistry/lelm108.pdf#page=4', procedure_source: 'manual',
  };
  if (/ohm|current electricity|^electricity$/i.test(topic.replace(/^chapter\s*\d+\s*[:.\-]?\s*/i, ''))) return {
    name: 'Verify Ohm’s law', objective: 'Compare voltage and current while the resistor stays at the same temperature.',
    apparatus: ['Cells', 'Resistor', 'Ammeter', 'Voltmeter', 'Key', 'Connecting wires'], visual_kind: 'circuit',
    steps: steps(['Check meter ranges and least counts; clean wire ends.', 'With the key open, put the ammeter and resistor in series with the cells. Connect the voltmeter across the resistor.', 'Ask the teacher to check polarity and connections; close the key briefly.', 'Read voltage and current, then open the key. Repeat with different cell combinations.', 'Tabulate V and I; calculate V/I for each reading. Plot V vertically against I horizontally.', 'Compare the ratios and graph slope. Keep the resistor temperature constant.']),
    observation: 'At constant temperature, voltage increases proportionally with current; V/I is approximately unchanged.',
    conclusion: 'A straight V–I graph through the origin supports V = IR. Its slope gives resistance.',
    precautions: ['Use low-voltage cells. Open the key between readings to limit heating.'],
    source_url: 'https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classX/science/jelm105.pdf#page=1', procedure_source: 'manual',
  };
  if (/photosynthesis|light.*starch|starch.*leaf/i.test(topic)) return {
    name: 'Light and starch formation in a leaf', objective: 'Compare illuminated and covered parts of the same leaf.',
    apparatus: ['Potted plant', 'Opaque paper', 'Water bath', 'Alcohol', 'Iodine solution', 'Petri dish'], visual_kind: 'leaf',
    steps: steps(['Use a de-starched plant. Cover part of a leaf on both sides with opaque paper.', 'Leave the plant in bright sunlight; retain covered and exposed regions for comparison.', 'The teacher prepares the leaf and removes chlorophyll using alcohol in a hot-water bath.', 'Rinse the leaf; treat it with iodine solution in a dish.', 'Compare both regions after treatment. Label the covered region as the control.', 'Record the observed colour pattern and relate it to light exposure.']),
    observation: 'The exposed region becomes blue-black with iodine; the covered region does not show this starch-positive colour.',
    conclusion: 'The comparison supports the requirement of light for starch formation in photosynthesis.',
    precautions: ['Teacher demonstration: alcohol is flammable. Use a water bath, never heat alcohol directly over a flame.'],
    source_url: 'https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classX/science/jelm103.pdf#page=4', procedure_source: 'manual',
  };
}

const action = /^(?:(?:now|then|next|carefully|gently|first|finally)\s*[,;:]?\s*)?(?:take|connect|add|pour|place|put|keep|insert|dip|heat|warm|mix|stir|wash|rinse|remove|cut|peel|mount|focus|adjust|measure|record|repeat|hold|attach|observe|note|fill|prepare|collect|draw|set|switch|close|open|bring|rub|suspend|tie|weigh|cover|leave|compare)\b/i;
const clean = (line: string) => line.replace(/^\s*(?:[•●▪–—-]|\(?\d{1,2}[.)])\s*/g, '').replace(/\s+/g, ' ').trim();
const sourceLines = (text: string) => text.replace(/\n(?!\s*(?:[•●▪]|\d{1,2}[.)]\s))/g, ' ')
  .split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(clean).filter(line => line.length > 18 && !isContentsListing(line));

/** Only action-led passages from one bounded activity become procedure steps. */
export function extractExperimentActivities(topic: string, context: string): ExperimentActivity[] {
  let headings = [...context.matchAll(/\b(?:activity|experiment)\s+\d+(?:\.\d+)?\b/gi)];
  if (!headings.length) headings = [...context.matchAll(/(?:^|\n)\s*(?:PROCEDURE|Procedure|METHOD|Method)\s*[:\n]/g)];
  const blocks = headings.map((heading, index) => ({
    title: heading[0], text: context.slice(heading.index! + heading[0].length, Math.min(headings[index + 1]?.index ?? context.length, heading.index! + 6500)),
  })).flatMap(block => {
    // Organic manuals place several independent tests under one experiment.
    // Never concatenate their reagents into one procedure.
    const tests = [...block.text.matchAll(/(?:^|\n)\s*[A-Z][.)]\s+[^\n]{1,100}\btest\s*(?=\n|$)/gi)];
    return tests.length ? tests.map((test,index)=>({title:`${block.title} · ${test[0].trim()}`,
      text:block.text.slice(test.index!+test[0].length,tests[index+1]?.index??block.text.length)})) : [block];
  });
  const found: ExperimentActivity[] = [];
  for (const block of blocks) {
    const text = block.text.split(/\b(?:EXERCISES|SUMMARY|QUESTIONS AND ANSWERS)\b/)[0];
    const lines = sourceLines(text);
    const procedure = lines.filter(line => action.test(line) && !line.includes('?') && !/\b(?:calculate|determine)\b.*\d.*[=?]/i.test(line));
    if (procedure.length < 2) continue;
    const observation = lines.find(line => !line.includes('?') && /\b(?:turns?|becomes?|changes? (?:to|from)|precipitate|is observed|we observe|you will observe|you will find|smell|odou?r|evolves?|effervescence)\b/i.test(line));
    const conclusion = lines.find(line => !line.includes('?') && /\b(?:therefore|conclude|thus|this shows|this indicates|we infer)\b/i.test(line));
    const apparatus = [...new Set((procedure.join(' ').match(/\b(?:test tubes?|beakers?|droppers?|iodine|litmus|phenolphthalein|methyl orange|sodium hydroxide|hydrochloric acid|copper sulphate|copper sulfate|ethanol|ethanoic acid|alcohol|microscope|slides?|cover slips?|leaves|leaf|onion|potato|water|cells?|batter(?:y|ies)|resistors?|ammeters?|voltmeters?|wires?|keys?|lenses?|mirrors?|prisms?|magnets?|coils?|rulers?|balances?|thermometers?|stopwatch|spring|pendulum|flask|funnel|filter paper)\b/gi) || []).map(item => item.toLowerCase()))];
    found.push({ name: block.title, objective: `Follow the matched ${topic} activity and compare the recorded evidence.`, apparatus,
      steps: steps(procedure), observation: observation || 'Record what changes and what stays the same; this passage does not state a final observation.',
      conclusion: conclusion || 'Use the recorded observations to explain the outcome; a final conclusion was not stated in this passage.',
      source_excerpt: text.slice(0, 6500), procedure_source: 'uploaded',
      precautions: /acid|alkali|heat|burn|gas|alcohol|chemical|smell|odou?r/i.test(text) ? ['Teacher-supervised demonstration. Do not taste chemicals or directly smell gases.'] : [],
    });
    if (found.length === 6) break;
  }
  return found.length ? found : preparedExperiment(topic) ? [preparedExperiment(topic)!] : [];
}

/** Old saved "working guides" used exercise fragments; do not play them as experiments. */
export function displayExperiments(activities: Activity[], topic: string): ExperimentActivity[] {
  const valid = activities.filter(activity => (activity as ExperimentActivity).procedure_source ||
    (!/working guide/i.test(activity.name) && activity.steps.filter(step => action.test(clean(step.description)) && !step.description.includes('?')).length >= 2));
  return valid.length ? valid : preparedExperiment(topic) ? [preparedExperiment(topic)!] : [];
}

export function experimentVideoLinks(text: string) {
  const links: Array<{ title: string; id: string; provider: string }> = [];
  if (/ohm|current electricity/i.test(text)) links.push({ title: 'Ohm’s law experiment', id: 'OU-VWe8kErM', provider: 'MeitY OLabs' });
  if (/ester|ethanoic|carboxylic/i.test(text)) links.push({ title: 'Esterification demonstration (Hindi)', id: 'UmpAizpRGls', provider: 'NCERT-listed video' });
  if (/acid|base|indicator|\bpH\b/i.test(text)) links.push({ title: 'Measuring pH (Hindi)', id: 'fOEuVxZFg_Y', provider: 'NCERT-listed video' });
  if (/onion|cell|microscop/i.test(text)) links.push({ title: 'Temporary onion-peel mount', id: 'MUSoB8y1uuM', provider: 'NCERT-listed video' });
  if (/osmosis/i.test(text)) links.push({ title: 'Osmosis demonstration (Hindi)', id: 'cjz-HiS7sJ0', provider: 'NCERT-listed video' });
  if (/photosynth|starch.*leaf|light.*leaf/i.test(text)) links.push({ title: 'Light and photosynthesis (Hindi)', id: 'w-P7dnpx7YY', provider: 'NCERT-listed video' });
  return links;
}
