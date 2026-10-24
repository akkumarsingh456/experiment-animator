import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({saved:vi.fn(),online:vi.fn(),direct:vi.fn()}));
vi.mock('@tanstack/react-start/server',()=>({getRequest:()=>({url:'https://eduplan.example/lesson'})}));
vi.mock('@/lib/saved-chapter-sources.server',()=>({readSavedChapterSources:mocks.saved}));
vi.mock('@/lib/attention-source-read.server',()=>({readAttentionSources:mocks.online,readAttentionSource:mocks.direct}));
import {readTopicNotesSources} from '@/lib/topic-notes-sources.server';
const scope={klass:'12',subject:'Chemistry',chapter:'Chapter 6: Haloalkanes and Haloarenes',topic:'Nature of C-X bond'};
const text='6.3 Nature of C-X Bond\nA carbon-halogen bond is polar because the bonded atoms attract electrons unequally. The carbon end carries a partial positive charge while the halogen end carries a partial negative charge. The size of the halogen atom increases down the group. Bond length therefore increases from the carbon-fluorine bond to the carbon-iodine bond.\n6.4 Methods of Preparation\nAn unrelated preparation section must not enter these bond notes.';
beforeEach(()=>{vi.resetAllMocks();mocks.saved.mockResolvedValue({sources:[{book:'Chemistry.pdf',location:'Chapter extract 1',text}],partial:false});mocks.online.mockResolvedValue([]);});
it('uses matching saved textbook evidence without needing an external request',async()=>{const result=await readTopicNotesSources(scope);expect(result).toHaveLength(1);expect(result[0].provider).toBe('Saved textbook source');expect(result[0].text).toContain('partial positive charge');expect(result[0].url).toBe('https://eduplan.example/history');expect(mocks.online).not.toHaveBeenCalled();expect(mocks.saved).toHaveBeenCalledWith(scope);});
it('still tries online reading if the library is unavailable',async()=>{mocks.saved.mockRejectedValue(new Error('Database unavailable'));const external={url:'https://ncert.nic.in/example.pdf',title:scope.chapter,text,sourceClass:'12',provider:'NCERT'};mocks.online.mockResolvedValue([external]);expect(await readTopicNotesSources(scope)).toEqual([external]);});
it('returns an empty result honestly when all sources fail',async()=>{mocks.saved.mockRejectedValue(new Error('Library unavailable'));mocks.online.mockRejectedValue(new Error('Network unavailable'));expect(await readTopicNotesSources(scope)).toEqual([]);});
it('does not read any source for a topic outside the catalogue',async()=>{expect(await readTopicNotesSources({...scope,topic:'An invented topic'})).toEqual([]);expect(mocks.saved).not.toHaveBeenCalled();expect(mocks.online).not.toHaveBeenCalled();});

it('loads the reported Vitamins topic without any library or network dependency',async()=>{
 mocks.saved.mockRejectedValue(new Error('Library down'));mocks.online.mockRejectedValue(new Error('Network down'));
 const result=await readTopicNotesSources({klass:'12',subject:'Chemistry',chapter:'Chapter 10: Biomolecules',topic:'Vitamins'});
 expect(result).toHaveLength(1);expect(result[0].provider).toBe('Reviewed NCERT source passage');
 expect(result[0].text).toContain('Fat soluble vitamins');expect(result[0].text).toContain('Water soluble vitamins');
 expect(mocks.saved).not.toHaveBeenCalled();expect(mocks.online).not.toHaveBeenCalled();
});
it('never reuses the Vitamins passage for a different class or chapter',async()=>{
 mocks.saved.mockResolvedValue({sources:[],partial:false});
 expect(await readTopicNotesSources({klass:'11',subject:'Chemistry',chapter:'Chapter 10: Biomolecules',topic:'Vitamins'})).toEqual([]);
 expect(await readTopicNotesSources({...scope,topic:'Vitamins'})).toEqual([]);
});

it('tries the explicit Biomolecules chapter link for another topic before index discovery',async()=>{
 mocks.saved.mockResolvedValue({sources:[],partial:false});
 const topic={klass:'12',subject:'Chemistry',chapter:'Chapter 10: Biomolecules',topic:'Carbohydrates'};
 const text='14.1 Carbohydrates\nCarbohydrates are primarily produced by plants and form a very large group of naturally occurring organic compounds. Most of them have a general formula and were considered as hydrates of carbon from which the name carbohydrate was derived. Carbohydrates are classified on the basis of their behaviour on hydrolysis into three groups.\n14.2 Proteins\nThis next section must not be imported.';
 mocks.direct.mockImplementation(async binding=>({...binding,text}));
 const result=await readTopicNotesSources(topic);
 expect(mocks.direct).toHaveBeenCalledWith(expect.objectContaining({url:expect.stringContaining('chem-12-unit-14-biomolecules')}));
 expect(result[0].text).toContain('Carbohydrates');expect(mocks.online).not.toHaveBeenCalled();
});
