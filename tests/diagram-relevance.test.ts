import {describe,expect,it} from 'vitest';
import {checkDiagramTopicMatch} from '@/lib/diagram-relevance';

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
});
