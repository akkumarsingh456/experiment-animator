import { MathText } from "@/components/MathText";
import { sourceConceptFacts, type ConceptMapInput } from "@/lib/source-concept-map";
import { damagedMatrixExcerpt } from "@/lib/mathematics-presentation";
import { geometryDiagram } from "@/lib/geometry-diagrams";
import { svgDataUrl } from "@/lib/source-concept-map";
import { guidedFormulaRow } from "@/lib/guided-notes";
import {readableSourceRelation} from '@/lib/source-note-quality';

/** Native typeset visuals for Mathematics: matrices retain rows and columns. */
export function MathematicsTopicVisual({ input }: { input: ConceptMapInput }) {
  const geometry = geometryDiagram(input.title, "Mathematics");
  if (geometry) return <img src={svgDataUrl(geometry.svg)} alt={geometry.caption} className="w-full h-full object-contain" />;
  const facts = sourceConceptFacts(input).filter(line => !damagedMatrixExcerpt(line)).slice(0, 2);
  const relation = input.sections?.filter(section=>!/^Source (?:review|table)/i.test(section.heading)).flatMap(section => section.lines).find(line => /^\*\*(?:formula|equation|relation):/i.test(line) && /\$/.test(line)&&readableSourceRelation(line));
  const matrix = /determinant|matrices|matrix/i.test(input.title);
  return <div className="mathematics-topic-visual">
    <h3>{input.title}</h3>
    {matrix && <div className="mathematics-matrix-structure"><span>Schematic · rows and columns</span><MathText text={/determinant/i.test(input.title) ? "$\\begin{vmatrix}a_{11}&a_{12}&a_{13}\\\\a_{21}&a_{22}&a_{23}\\\\a_{31}&a_{32}&a_{33}\\end{vmatrix}$" : "$\\begin{bmatrix}a_{11}&a_{12}&a_{13}\\\\a_{21}&a_{22}&a_{23}\\\\a_{31}&a_{32}&a_{33}\\end{bmatrix}$"} /><small>Rows: horizontal · Columns: vertical</small></div>}
    {!matrix && relation && <div className="mathematics-visual-relation"><MathText text={guidedFormulaRow(relation.replace(/^\*\*[^*]+:\*\*\s*/, "")).expression} /></div>}
    {!matrix&&!relation&&!facts.length&&<p className="mathematics-source-review">The extracted notation needs a clearer source page. Review the original textbook equation or import its image below.</p>}
    <ul>{facts.map((fact, index) => <li key={index}><MathText text={fact} /></li>)}</ul>
  </div>;
}
