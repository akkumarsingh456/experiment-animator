import {describe,expect,it} from 'vitest';
import {checkDiagramTopicMatch} from '@/lib/diagram-relevance';
import {googleDiagramUrl,topicDiagramQuery,topicDiagramScope} from '@/lib/manual-image-import';
import {NCERT_SYLLABUS} from '@/lib/ncert-syllabus';
import {commonsSearchParams,fetchCommons} from '@/lib/diagram-search.functions';
import {vi} from 'vitest';

describe('Google/import diagram topic relevance verification',()=>{
  it('accepts exact topic titles and reports their matched terms',()=>{
    expect(checkDiagramTopicMatch('Vapour pressure','Vapour pressure graph')).toMatchObject({relevant:true,matched:2,total:2,score:1});
  });

  it('recognizes common topic wording such as speed and velocity',()=>{
    expect(checkDiagramTopicMatch('Speed of waves','Wave velocity diagram').relevant).toBe(true);
  });

  it('preserves short but meaningful chemistry symbols in C-X bond topics',()=>{
    expect(checkDiagramTopicMatch('Nature of C-X bond','Carbon-halogen bonding')).toMatchObject({relevant:true,matched:3,total:3});
    expect(checkDiagramTopicMatch('Nature of C-X bond','Hydrogen bonding')).toMatchObject({relevant:false,matched:1,total:3});
  });

  it('filters images with only one of multiple key topic terms',()=>{
    expect(checkDiagramTopicMatch('Speed of waves','Ocean wave at sunset').relevant).toBe(false);
    expect(checkDiagramTopicMatch('Speed of waves','Speed of sound graph').relevant).toBe(false);
  });

  it('rejects generic or empty topic text instead of showing unrelated results',()=>{
    expect(checkDiagramTopicMatch('the labelled diagram','Human heart')).toMatchObject({relevant:false,total:0});
  });

  it('still handles single-term topics conservatively',()=>{
    expect(checkDiagramTopicMatch('Vitamins','Vitamin structure')).toMatchObject({relevant:true,matched:1,total:1});
    expect(checkDiagramTopicMatch('Vitamins','Human anatomy')).toMatchObject({relevant:false,matched:0,total:1});
  });

  it('keeps class, subject, chapter and topic in the image-search scope throughout Classes 9–12',()=>{
    let checked=0;
    for(const grade of ['9','10','11','12']){
      for(const [subject,chapters] of Object.entries(NCERT_SYLLABUS[grade]||{})){
        for(const chapter of chapters){
          for(const topic of chapter.subtopics.length?chapter.subtopics:[chapter.chapter]){
            const scope=topicDiagramScope(grade,subject,chapter.chapter,topic);
            expect(topicDiagramQuery(grade,subject,chapter.chapter,topic).trim().length).toBeGreaterThanOrEqual(2);
            expect(scope).toContain(`Class ${grade}`);
            expect(scope).toContain(subject);
            expect(scope).toContain(chapter.chapter.replace(/^Chapter\s*\d+\s*[:.\-]?\s*/i,''));
            expect(scope.length).toBeGreaterThan(12);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('builds compact topic-only Commons requests for every catalogue topic',()=>{
    let checked=0;
    for(const grade of ['9','10','11','12']){
      for(const [subject,chapters] of Object.entries(NCERT_SYLLABUS[grade]||{})){
        for(const chapter of chapters){
          for(const topic of chapter.subtopics.length?chapter.subtopics:[chapter.chapter]){
            const params=commonsSearchParams(topic);
            expect(params.get('gsrsearch')).toContain(topic);
            expect(params.get('gsrlimit')).toBe('20');
            expect(params.get('iiurlwidth')).toBe('960');
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(commonsSearchParams('Nutrition').get('gsrsearch')).toBe('Nutrition filetype:drawing -photograph -logo -advertisement');
  });

  it('keeps the selected class, subject and chapter in the Google Images search link',()=>{
    const scope=topicDiagramScope('10','Biology','Chapter 6: Life Processes','Nutrition');
    const url=new URL(googleDiagramUrl(`Nutrition ${scope}`));
    expect(url.searchParams.get('q')).toContain('Class 10');
    expect(url.searchParams.get('q')).toContain('Biology');
    expect(url.searchParams.get('q')).toContain('Life Processes');
    expect(url.searchParams.get('q')).toContain('Nutrition');
    expect(url.searchParams.get('safe')).toBe('active');
    expect(url.searchParams.get('tbs')).toBe('itp:lineart');
  });

  it('retries temporary Commons failures and returns the successful response',async()=>{
    const fetch=vi.fn()
      .mockResolvedValueOnce(new Response('temporarily unavailable',{status:503,statusText:'Service Unavailable'}))
      .mockResolvedValueOnce(new Response('{"query":{"pages":{}}}',{status:200,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetch);
    try{
      const response=await fetchCommons(new URLSearchParams({action:'query'}));
      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    }finally{vi.unstubAllGlobals();}
  });

  it('does not retry invalid Wikimedia requests',async()=>{
    const fetch=vi.fn().mockResolvedValue(new Response('invalid request',{status:400,statusText:'Bad Request'}));
    vi.stubGlobal('fetch',fetch);
    try{
      await expect(fetchCommons(new URLSearchParams({action:'query'}))).rejects.toThrow('400 Bad Request');
      expect(fetch).toHaveBeenCalledTimes(1);
    }finally{vi.unstubAllGlobals();}
  });
});
