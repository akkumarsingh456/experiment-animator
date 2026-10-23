import { MathText } from "@/components/MathText";
import { damagedMatrixExcerpt } from "@/lib/mathematics-presentation";
import {sourceExtractionIssue} from '@/lib/source-extraction-review';
import {SourceReviewEntry} from './SourceReviewEntry';

/** Preserve source wording, but never auto-format a collapsed matrix as a number. */
export function MathematicsProse({ text }: { text: string }) {
  if(sourceExtractionIssue(text))return <SourceReviewEntry text={text} subject="Mathematics"/>;
  if (!damagedMatrixExcerpt(text)) return <MathText text={text} />;
  return <details className="mathematics-source-review"><summary>Matrix example needs a clearer source page</summary><p>The extracted matrix lost its row and column positions. Upload the original example page to display it accurately.</p><details><summary>Original source excerpt</summary><p>{text}</p></details></details>;
}
