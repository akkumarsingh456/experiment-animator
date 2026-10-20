import type { ManualVisual } from './manual-visuals';

export type SharedVisualScope={klass:string;subject:string;chapter:string;topic:string;slideId:string};
/** Exact metadata identity; no fuzzy topic or cross-chapter fallback. */
export function sharedVisualKey(scope:SharedVisualScope){
  const normalize=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  return JSON.stringify([1,normalize(scope.klass).replace(/^class\s+/,''),normalize(scope.subject),normalize(scope.chapter),normalize(scope.topic),normalize(scope.slideId)]);
}
export type SharedVisualRecord={scope:SharedVisualScope;visual:ManualVisual;savedAt:string};
