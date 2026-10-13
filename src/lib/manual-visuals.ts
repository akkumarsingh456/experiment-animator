export type ManualVisual={url:string;width:number;x:number;y:number;shape:'rectangle'|'rounded'|'circle';showAuto:boolean};
export const manualVisualCache=new Map<string,ManualVisual>();
let loading:Promise<void>|undefined;
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('eduplan-manual-images',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export function loadManualVisuals():Promise<void>{
 if(typeof indexedDB==='undefined')return Promise.resolve();
 return loading ||= (async()=>{const db=await database();await new Promise<void>((resolve,reject)=>{const request=db.transaction('images').objectStore('images').openCursor();request.onsuccess=()=>{const cursor=request.result;if(cursor){manualVisualCache.set(String(cursor.key),cursor.value);cursor.continue();}else resolve();};request.onerror=()=>reject(request.error);});db.close();})();
}
export async function saveManualVisual(key:string,visual:ManualVisual|null):Promise<void>{
 const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('images','readwrite');if(visual)tx.objectStore('images').put(visual,key);else tx.objectStore('images').delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();if(visual)manualVisualCache.set(key,visual);else manualVisualCache.delete(key);window.dispatchEvent(new Event('manual-visual-saved'));
}
