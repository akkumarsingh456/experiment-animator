import {MathText} from '@/components/MathText';
import {formulaVisualCards} from '@/lib/formula-visual-cards';
import type {Slide} from '@/lib/generate.functions';

export function FormulaVisualCards({slide, limit=2,subject}:{slide:Slide; limit?:number;subject?:string}) {
  const cards = formulaVisualCards(slide, limit);
  if (!cards.length) return null;
  return <div className="formula-visual-cards" aria-label="Equations from these notes">
    {cards.map((card,index)=><figure className="formula-visual-card" key={index}>
      <figcaption><span className="visual-topic-number">{index + 2}.</span> {card.label}</figcaption>
      <MathText subject={subject} text={`$$${card.expression}$$`} />
      {card.unit && <small><MathText subject={subject} text={card.unit} /></small>}
    </figure>)}
  </div>;
}
