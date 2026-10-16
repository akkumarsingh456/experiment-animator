/** Presentation only: retain every body and equation, show a repeated label once. */
const labels: Record<string, {title: string; parents?: string[]}> = {
  definition: {title:"Definitions",parents:["definitions","key terms and definitions"]},
  explanation: {title:"Explanation",parents:["explanation","understanding the concept"]},
  activity: {title:"Activity"},
  "activity source": {title:"Source"},
  "activity materials": {title:"Materials"},
  "activity steps": {title:"Steps"},
  "activity outcome": {title:"Outcome"},
  "activity observations": {title:"Observations"},
  "activity result": {title:"Result"},
  discussion: {title:"Discussion",parents:["classroom discussion","discussion"]},
  "learning objective": {title:"Learning objective",parents:["learning objectives"]},
  prerequisite: {title:"Before you begin",parents:["before you begin"]},
  "exit ticket": {title:"Exit ticket",parents:["exit ticket"]},
  "support practice": {title:"Support practice",parents:["support practice"]},
  "core practice": {title:"Core practice",parents:["core practice"]},
  "challenge practice": {title:"Challenge practice",parents:["challenge practice"]},
  "answers and explanations": {title:"Answers and explanations",parents:["answers and explanations"]},
  "key point": {title:"Key points",parents:["key points","important points"]},
  "important point": {title:"Important points",parents:["important points","key points"]},
  use: {title:"Applications",parents:["applications"]},
  example: {title:"Examples",parents:["examples","worked examples and activities"]},
  formula: {title:"Formulas",parents:["formulas","formulas and relations"]},
  equation: {title:"Equations",parents:["equations","formulas and relations"]},
  relation: {title:"Relations",parents:["relations","formulas and relations"]},
  "si unit": {title:"SI units",parents:["si units","symbols, units and si units"]},
  unit: {title:"Units",parents:["units","symbols, units and si units"]},
  variables: {title:"Symbols",parents:["symbols","symbols, units and si units"]},
  condition: {title:"Conditions",parents:["conditions","conditions and assumptions"]},
  limitation: {title:"Limitations",parents:["limitations","limitations and exceptions"]},
  "memory trick": {title:"Remember",parents:["remember"]},
  "ncert point": {title:"Textbook points",parents:["textbook points"]},
};

function parse(line: string) {
  const match = line.match(/^\s*(?:\*\*([^*\n]+):\*\*|([A-Za-z][A-Za-z ]{1,45}):)\s*([\s\S]+)$/);
  const key = (match?.[1] || match?.[2] || "").trim().toLowerCase();
  return match && labels[key] ? {key,text:match[3],...labels[key]} : null;
}

export function presentNoteLabels(lines: string[], parentHeading: string, previousLine?: string) {
  let previous = previousLine ? parse(previousLine)?.key : undefined;
  return lines.map(line => {
    const label = parse(line);
    if (!label) { previous = undefined; return {text:line,heading:undefined as string|undefined}; }
    const heading = label.key === previous || label.parents?.includes(parentHeading.toLowerCase()) ? undefined : label.title;
    previous = label.key;
    return {text:label.text,heading};
  });
}
