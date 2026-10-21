import { layoutChemistrySlide, SOURCE_TABLE_HEADING } from "@/lib/chemistry-note-layout";
import type { Slide } from "@/lib/generate.functions";
import { cleanSourceNoteLine, validStudyTerm, hasSourcePrintIntrusion, hasBrokenSourceMath } from './source-note-quality';
import { matchesTopicScope } from './notes-quality-policy';
import { verifiedSourceNotation } from './verified-source-notation';
import { sourceExtractionIssue } from './source-extraction-review';
import {contextualizeSourceDefinitions} from './source-explanation-context';

/** Repair only the identifiable NCERT microscopic-resistivity extraction.
 * Other damaged relations are left to the source-grounded generation repair.
 */
export function repairSourceMathLine(line: string): string {
  const verified=verifiedSourceNotation(line);
  if(verified!==line)return verified;
  if (/\$/.test(line)) return line;
  if (
    /using\s+E\s*=\s*V\s*\/\s*l/i.test(line) &&
    /I\s*=\s*ne/i.test(line) &&
    /Ohm[’']?s law/i.test(line) &&
    /ρ|resistivity/i.test(line)
  ) {
    return "Using $E=\\frac{V}{l}$, $I=neAv_d$, and $v_d=\\frac{eE\\tau}{m}$ gives $I=\\frac{ne^2A\\tau}{ml}V$. Comparing with $V=IR$ gives $R=\\frac{ml}{ne^2A\\tau}$ and $\\rho=\\frac{RA}{l}=\\frac{m}{ne^2\\tau}$. Here $n$ is the number density of electrons, $e$ the magnitude of their charge, $m$ their mass, and $\\tau$ the mean relaxation time. This microscopic model applies to an ohmic conductor with constant material conditions.";
  }
  return line;
}

export function repairSourceMathSlide(slide: Slide): Slide {
  slide={...slide,sections:contextualizeSourceDefinitions(slide.sections,slide.grounding||slide.chapter_text||'')};
  slide = layoutChemistrySlide(slide);
  const notices=["These original entries contain damaged extraction or exercise options whose answer has not been established.","They are retained for comparison with the textbook, not presented as verified formulas or facts."];
  slide={...slide,sections:slide.sections?.map(section=>section.heading!=="Source review — original extraction"?section:{...section,lines:section.lines.map(line=>notices.some(notice=>line.includes(notice))?notices.reduce((value,notice)=>value.replace(notice,""),line).trim():line).filter(Boolean)}).filter(section=>section.lines.length)};

  const reviewHeading = "Source review — original extraction";
  const originals: string[] = [];
  const inputSections = slide.sections?.map(section => {
    if (section.heading === reviewHeading || section.heading === SOURCE_TABLE_HEADING || section.heading === "MLT Dimensional Formula" || section.heading === "Problem-solving formula reference") return section;
    // An exercise option is not an asserted textbook fact. Preserve its siblings
    // together so a false option cannot survive as an independent key point.
    const optionList = /^(key points|important points|teacher notes)$/i.test(section.heading) && section.lines.length >= 3
      && section.lines.some(line => /^\s*(?:\*\*[^*]+:\*\*\s*)?\(?[a-d]\)\s+/i.test(line));
    const kept = section.lines.filter(line => {
      if (optionList || sourceExtractionIssue(line) || ((hasSourcePrintIntrusion(line) || hasBrokenSourceMath(line)) && repairSourceMathLine(line) === line)) { originals.push(line); return false; }
      return true;
    });
    return {...section, lines: kept};
  }).filter(section => section.lines.length);
  if (originals.length) {
    const review = {heading: reviewHeading, kind: "text" as const, lines: [
      ...originals]};
    slide = {...slide, sections: [...(inputSections || []), review], notes_quality: {ready:false,lines:0,derivations:0,activity:false,issues:[...(slide.notes_quality?.issues || []), "Source extraction or exercise options require textbook review."]}};
  }
  const repairLines = (lines: string[]) =>
    lines.filter(line=>matchesTopicScope(slide.title,line)).flatMap((line) => {
      const fixed = repairSourceMathLine(line);
      if (fixed === line) { const clean=cleanSourceNoteLine(line);return clean?[clean]:[]; }
      return [
        "**Explanation:** The microscopic model reproduces Ohm’s law for a conductor with constant material conditions; Ohm’s law is not valid for every material or field strength.",
        "**Derivation of microscopic resistivity:** $\\rho=\\frac{m}{ne^2\\tau}$",
        "**Derivation step 1:** For a uniform conductor, $E=\\frac{V}{l}$ and $v_d=\\frac{eE\\tau}{m}$, where $v_d$ is the magnitude of drift velocity.",
        "**Derivation step 2:** Substitute in $I=neAv_d$: $I=\\frac{ne^2A\\tau}{ml}V$.",
        "**Derivation step 3:** Compare with $V=IR$: $R=\\frac{V}{I}=\\frac{ml}{ne^2A\\tau}$.",
        "**Derivation step 4:** Use $R=\\frac{\\rho l}{A}$ to obtain $\\rho=\\frac{RA}{l}=\\frac{m}{ne^2\\tau}$.",
        "**Variables:** $n$: number density of electrons; $e$: magnitude of electron charge; $m$: electron mass; $\\tau$: mean relaxation time; $A$: cross-sectional area; $l$: length of conductor.",
        "**SI unit:** Resistivity $\\rho$: $\\Omega\\,\\mathrm{m}$; resistance $R$: $\\Omega$; relaxation time $\\tau$: $\\mathrm{s}$.",
      ];
    });
  const repaired:Slide = {
    ...slide,
    title: slide.title.replace(/(['’])S\b/g, "$1s"),
    bullets: slide.bullets.filter(line=>matchesTopicScope(slide.title,line)).map(repairSourceMathLine).map(cleanSourceNoteLine).filter(Boolean),
    notes: repairLines(slide.notes),
    key_terms: (slide.key_terms||[]).filter(term=>validStudyTerm(term.term,term.meaning)),
    sections: slide.sections?.map((section) => ({
      ...section,
      lines: section.heading === reviewHeading ? section.lines.map(verifiedSourceNotation) : (section.heading === SOURCE_TABLE_HEADING || section.heading === "MLT Dimensional Formula" || section.heading === "Problem-solving formula reference") ? section.lines : repairLines(section.lines),
    })).filter(section=>section.lines.length),
  };
  const count=(item:Slide)=>(item.sections||[]).filter(section=>section.kind!=='diagram').reduce((n,section)=>n+section.lines.length,0)+item.notes.length+item.bullets.length;
  if(count(repaired)<count(slide)){
    const lines=(repaired.sections||[]).flatMap(section=>section.lines);
    repaired.notes_quality={
      ready:false,lines:lines.length,
      derivations:lines.filter(line=>/^\*\*derivation of/i.test(line)).length,
      activity:lines.some(line=>/^\*\*(?:activity|discussion)/i.test(line)),
      issues:[...new Set([...(slide.notes_quality?.issues||[]),'Unreadable or mismatched source fragments were omitted. Regenerate this topic from clearer matching textbook pages to restore missing detail.'])],
    };
  }
  return repaired;
}
