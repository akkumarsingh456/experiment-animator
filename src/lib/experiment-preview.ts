import type { ExperimentActivity } from './experiment-activities';
import { drawExperiment } from './experiment-drawing';

/** A focused apparatus preview, without the film's duplicate title and subtitles. */
export function drawExperimentPreview(canvas: HTMLCanvasElement, activity: ExperimentActivity, step: number) {
  const source=document.createElement('canvas');
  drawExperiment(source,activity,step,2.5,2);
  canvas.width=1200;canvas.height=664;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,56,260,1610,890,0,0,1200,664);
}
