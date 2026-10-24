import snapshots from './topic-popup-source-snapshots.json';
import type {AttentionScope} from './attention-topic-scope';
import type {ReadAttentionSource,AttentionSource} from './attention-source-read.server';

/** Popup recovery only. These checked passages never enter ordinary generation.
 * Keep the original source wording, citation and fixed catalogue scope.
 * This prose snapshot does not reconstruct the damaged deficiency table. */
export function reviewedPopupSource(scope:AttentionScope):ReadAttentionSource|undefined{
 const row=snapshots.find(row=>row.klass===scope.klass&&row.subject===scope.subject&&row.chapter===scope.chapter&&row.topics.includes(scope.topic));
 return row?{text:row.text,url:row.url,title:`${scope.chapter} - ${row.section}`,sourceClass:scope.klass,provider:'Reviewed NCERT source passage'}:undefined;
}
/** Explicit checked chapter links avoid dependence on changing index pages. */
export function popupChapterSources(scope:AttentionScope):AttentionSource[]{
 const rows=snapshots.filter(row=>row.klass===scope.klass&&row.subject===scope.subject&&row.chapter===scope.chapter);
 return [...new Map(rows.map(row=>[row.url,{url:row.url,title:scope.chapter,sourceClass:scope.klass,provider:'IIT Kanpur SATHEE NCERT mirror'}])).values()];
}
