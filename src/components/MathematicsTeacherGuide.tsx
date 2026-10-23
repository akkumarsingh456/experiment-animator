import {MathematicsProse} from './MathematicsProse';
import type {GuidedGroup} from '@/lib/guided-notes';

/** Subject-specific teaching prompts; never fabricate a proof or fill missing algebra. */
export function MathematicsTeacherGuide({title,groups}:{title:string;groups:GuidedGroup[]}){
 const route=/probability|statistic|mean|median|variance|data/i.test(title)?{
  focus:'Identify the data, sample space or event named in the source. Explain what is being measured before selecting a method.',
  check:'Check the source assumptions, totals and interpretation. Distinguish the quantity being calculated from the conclusion drawn from it.',
  prompt:'Which information in this question determines the method, and what does the result mean in its context?',
 }:/matrix|matrices|determinant|vector/i.test(title)?{
  focus:'Read the dimensions, order and notation from the source before operating. Keep every matrix row, column or vector component in its original position.',
  check:'Check operation compatibility and order. Verify the result against the original relation when the source permits it.',
  prompt:'Is this operation defined for these objects, and does changing the order change the calculation?',
 }:/derivative|differenti|integr|continu|limit|rate of change|tangent/i.test(title)?{
  focus:'Identify the dependent and independent variables, the source domain and the quantity requested. Explain why the stated rule applies before using it.',
  check:'Retain the stated interval, endpoints and conditions. Verify by the corresponding source method; explain the meaning of the result, not only its symbolic form.',
  prompt:'Which variable is changing, which rule applies here, and which condition justifies that choice?',
 }:/geometry|triangle|circle|quadrilateral|conic|coordinate|construction/i.test(title)?{
  focus:'List the given relationships and the result to prove or calculate. Translate the source figure into statements; do not assume a property from its appearance.',
  check:'Match every proof step to a given fact, definition or applicable theorem. Check that the final statement answers the original question.',
  prompt:'Which given fact justifies this step, and have all the theorem’s hypotheses been established?',
 }:{
  focus:'Separate the given information, unknowns, definitions and restrictions. Explain the source method before carrying out its operations.',
  check:'Check whether each transformation preserves the permitted values and solution set. Verify candidate answers in the original statement where applicable.',
  prompt:'Why is this step valid, and which original conditions must still hold after it?',
 };
 const prerequisites=groups.filter(group=>/Before you begin|Key terms and definitions|Conditions and assumptions|Limitations and exceptions/.test(group.heading));
 return <section className="guided-group mathematics-teacher-guide" aria-label={`Mathematics teaching approach for ${title}`}>
  <h3>Mathematics teaching approach</h3>
  <p><strong>Before solving:</strong> {route.focus}</p>
  {prerequisites.map((group,index)=><section key={index}><h4>{group.heading} · from these notes</h4>{group.lines.map((line,i)=><div className="mathematics-guide-line" key={i}><MathematicsProse text={line}/></div>)}</section>)}
  {!prerequisites.length&&<p className="guided-small">No separate prerequisites or restrictions are recorded. Check the original source before stating a domain, theorem condition or exception.</p>}
  <h4>Board-work sequence</h4>
  <ol>
   <li><strong>Given and required:</strong> write the source data and the exact result to find or prove.</li>
   <li><strong>Method and reason:</strong> name the definition, identity, theorem or rule used in the source and establish its conditions.</li>
   <li><strong>Working:</strong> keep one logical transformation per step. Explain the reason alongside it; retain signs, brackets, powers and fractions.</li>
   <li><strong>Conclusion:</strong> state the source result with its domain or context. For a proof, identify the statement established.</li>
   <li><strong>Verification:</strong> {route.check}</li>
  </ol>
  <p><strong>Ask during the solution:</strong> {route.prompt}</p>
  <h4>Prevent avoidable errors</h4>
  <p>Before cancelling, dividing, squaring, taking roots or applying a theorem, ask students to state why that operation is allowed here. Preserve restrictions and check any candidate solution against the original question. These are teacher checking prompts, not claims that this topic contains every listed operation.</p>
  <h4>Teach → practise → explain</h4>
  <ol><li><strong>Teacher models:</strong> explain a complete source example aloud, including the reason for each step.</li><li><strong>Class completes:</strong> cover one existing step and ask students to reconstruct and justify it, then compare with the source.</li><li><strong>Independent practice:</strong> use an available source question. Assess method choice, valid working and interpretation separately.</li></ol>
  <p><strong>Exit question:</strong> explain one step that needed a condition, state that condition, and show where it was checked.</p>
  <p className="guided-small">Teaching guidance only. Worked answers and proofs must come from the complete source passages below; missing steps and unreadable notation are not reconstructed.</p>
 </section>;
}
