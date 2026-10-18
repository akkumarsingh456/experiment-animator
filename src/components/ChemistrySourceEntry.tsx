import MathText from "@/components/MathText";
import { chemistryTypography } from "@/lib/chemistry-note-layout";
import { lanthanoidSourceRow, orbitalLatex } from "@/lib/lanthanoid-table";

/** The stored extraction stays untouched; known table rows get verified column labels. */
export function ChemistrySourceEntry({text}:{text:string}) {
  if (text.startsWith("The PDF merged table columns.")) return <div className="source-table-entry lanthanoid-entry"><p>Recognised lanthanoid rows use the verified headings in NCERT table 4.9. Atomic radius refers to the neutral atom; ionic radius here refers to the 3+ ion. Radii are measured in picometres: 1 pm = 10⁻¹² m. Configurations show electrons outside the [Xe] core; electron counts and charges are superscripts. A dash means the table does not list that value. Unmatched extracted entries still require source review.</p></div>;
  const row = lanthanoidSourceRow(text);
  if (!row) return <div className="source-table-entry"><MathText subject="Chemistry" text={chemistryTypography(text)} /></div>;
  return <div className="source-table-entry lanthanoid-entry">
    <div className="lanthanoid-entry-title"><strong>{row.name} ({row.symbol})</strong><span>Atomic number Z = {row.atomicNumber}</span></div>
    <div className="lanthanoid-radii"><span><b>Atomic radius:</b> {row.atomicRadius === null ? "Not given" : `${row.atomicRadius} pm`}</span><span><b>Ionic radius (<MathText subject="Chemistry" text={`$\\mathrm{${row.symbol}}^{3+}$`} />):</b> {row.ionicRadius === null ? "Not given" : `${row.ionicRadius} pm`}</span></div>
    <p className="lanthanoid-configurations"><b>Configurations outside [Xe]:</b> {row.configurations.map((config,index)=><span key={index}><MathText subject="Chemistry" text={`$\\mathrm{${row.symbol}}${index ? `^{${index+1}+}` : ""}: ${config === null ? "\\text{—}" : orbitalLatex(config)}$`} /></span>)}</p>
    <a className="lanthanoid-entry-source" href="https://ncert.nic.in/textbook/pdf/lech104.pdf#page=22" target="_blank" rel="noreferrer">NCERT table 4.9 · source and column headings</a>
  </div>;
}
