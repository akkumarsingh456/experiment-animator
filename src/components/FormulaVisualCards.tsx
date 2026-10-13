import {MathText} from '@/components/MathText';
import {formulaVisualCards} from '@/lib/formula-visual-cards';
import type {Slide} from '@/lib/generate.functions';

export function FormulaVisualCards({slide, limit=2}:{slide:Slide; limit?:number}) {
  const cards = formulaVisualCards(slide, limit);
  if (!cards.length) return null;
  return <div className="formula-visual-cards" aria-label="Equations from these notes">
    {cards.map((card,index)=><figure className="formula-visual-card" key={index}>
      <figcaption>{card.label}</figcaption>
      <MathText text={`$$${card.expression}$$`} />
      {card.unit && <small><MathText text={card.unit} /></small>}
    </figure>)}
  </div>;
}
