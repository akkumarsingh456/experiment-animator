import {it,expect} from 'vitest';
import {joinSourceExplanations,contextualizeSourceDefinitions,sourceReactivitySeries} from '@/lib/source-explanation-context';
import {secondaryScienceSectionEvidence,substantiveStudyLine} from '@/lib/secondary-study-evidence';
import {buildLocalSections} from '@/lib/ncert-teacher-notes';
import {adequateTopicEvidence} from '@/lib/topic-source-recovery';
import {prosePoints} from '@/lib/note-points';
import {toNoteBlocks} from '@/lib/notes-paging';
import {recoverSparseTopicNotes,topicSourceComplete} from '@/lib/sparse-topic-recovery.server';
import type {Slide} from '@/lib/generate.functions';
const description='Metals, in their pure state, have a shining surface.';
const name='This property is called metallic lustre.';
it('keeps a source description and its dependent name together before classification',()=>{
 expect(joinSourceExplanations([description,name])).toEqual([description+' '+name]);
 const sections=buildLocalSections({title:'Properties',bullets:[],notes:[],grounding:description+' '+name,key_terms:[]});
 expect(sections.flatMap(section=>section.lines)).toContain('**Definition:** '+description+' '+name);
 expect(prosePoints('**Definition:** '+description+' '+name)).toHaveLength(1);
 expect(toNoteBlocks(sections)).toHaveLength(1);
});
it('restores saved definition context only when its exact adjacent source explanation exists',()=>{
 const sections=[{heading:'Definitions',lines:['**Definition:** '+name]}];
 expect(contextualizeSourceDefinitions(sections,description+' '+name)?.[0].lines[0]).toBe('**Definition:** '+description+' '+name);
 expect(contextualizeSourceDefinitions(sections,'An unrelated explanation.')).toEqual(sections);
 expect(sections[0].lines[0]).toBe('**Definition:** '+name);
});
it('does not truncate source explanations at a table or figure identifier',()=>{
 const text='3.1 PHYSICAL PROPERTIES\n'+description+' '+name+'\nTable 3.1 Element Properties\nThe explanation after this table remains within the physical properties section.\nFigure 3.2 Sample Illustration\nThis further explanation belongs to the same source section and must remain available.\n3.2 ANOTHER TOPIC\nUnrelated material is outside this section.';
 const result=secondaryScienceSectionEvidence('Physical properties',text).join(' ');
 expect(result).toContain('explanation after this table');expect(result).toContain('further explanation');
 expect(result).not.toContain('Unrelated material');
});
const rows=[['K','Potassium'],['Na','Sodium'],['Ca','Calcium'],['Mg','Magnesium'],['Al','Aluminium'],['Zn','Zinc'],['Fe','Iron'],['Pb','Lead'],['H','Hydrogen'],['Cu','Copper'],['Hg','Mercury'],['Ag','Silver'],['Au','Gold']];
const table='Table 3.2 Activity series : Relative reactivities of metals\n'+rows.map(([symbol,name],i)=>`| $${symbol}$ | ${name} | ${i===0?'Most reactive':i===12?'Least reactive':''} |`).join('\n')+'\n3.3 ANOTHER TOPIC';
it('retains the verified named order only from a complete source table',()=>{
 expect(sourceReactivitySeries('Reactivity series',table)[0]).toContain('K > Na > Ca > Mg > Al > Zn > Fe > Pb > [H] > Cu > Hg > Ag > Au');
 expect(sourceReactivitySeries('Unrelated topic',table)).toEqual([]);
 expect(sourceReactivitySeries('Reactivity series',table.replace('| $Zn$ | Zinc |','| missing |'))).toEqual([]);
 expect(sourceReactivitySeries('Reactivity series',table.replace('Most reactive','Direction missing'))).toEqual([]);
});
it.each(['After performing displacement experiments the following series has been developed.','We will learn about chemical properties in the following sections.','Arrange the metals in decreasing order of their reactivity with water.','Fix a pin to the free end of the wire using wax.'])('does not count procedural text as topic explanation: %s',line=>expect(substantiveStudyLine(line)).toBe(false));
it('does not accept a named series consisting only of its definition and references',()=>{
 expect(adequateTopicEvidence('Reactivity series',['The reactivity series is a list of metals arranged in the order of their decreasing activities.','After performing displacement experiments, the following series known as the activity series has been developed.','You have learnt to write the reactivity series of metals.'])).toBe(false);
});
it('repairs saved orphan definitions without appending the broken version again',async()=>{
 const grounding='3.1 PHYSICAL PROPERTIES\n'+description+' '+name+' Metals are generally hard, although the hardness varies between different metals. Some metals can be beaten into thin sheets. This property is called malleability. The ability to draw metals into thin wires is called ductility.\n3.2 ANOTHER TOPIC';
 const slide={title:'Physical and chemical properties',kind:'content',visual:'book',bullets:[],notes:[],key_terms:[],sections:[{heading:'Teacher Notes',kind:'bullets',lines:['**Definition:** '+name]}]} as Slide;
 expect(topicSourceComplete(slide)).toBe(false);
 const result=await recoverSparseTopicNotes([slide],{klass:'10',subject:'Science',chapter:'Chapter 3: Metals and Non-metals (Chemistry)',sources:[grounding]});
 expect(topicSourceComplete(result.slides[0])).toBe(true);
 expect(result.slides[0].sections?.flatMap(section=>section.lines)).not.toContain('**Definition:** '+name);
 expect(result.slides[0].sections?.flatMap(section=>section.lines).join(' ')).toContain(description+' '+name);
});
