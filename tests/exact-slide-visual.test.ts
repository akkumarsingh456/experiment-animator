import {it,expect} from 'vitest';
import {exactSlideVisualId} from '@/lib/exact-slide-visual';
import {sharedVisualKey} from '@/lib/shared-topic-visual';
it('isolates continuation pages and restores the same page identity on return',()=>{
 const first={sections:[{heading:'Important points',kind:'bullets',lines:['Ohm law explanation.']}]};
 const next={sections:[{heading:'MLT Dimensional Formula',kind:'bullets',lines:['Power dimensions.']}]};
 expect(exactSlideVisualId(first)).not.toBe(exactSlideVisualId(next));
 expect(exactSlideVisualId(first)).toBe(exactSlideVisualId(JSON.parse(JSON.stringify(first))));
 const scope={klass:'12',subject:'Physics',chapter:'Current Electricity',topic:'Ohm law',slideId:exactSlideVisualId(first)};
 expect(sharedVisualKey(scope)).not.toBe(sharedVisualKey({...scope,chapter:'Magnetism'}));
 expect(sharedVisualKey(scope)).not.toBe(sharedVisualKey({...scope,klass:'11'}));
 expect(sharedVisualKey(scope)).not.toBe(sharedVisualKey({...scope,slideId:exactSlideVisualId(next)}));
});
