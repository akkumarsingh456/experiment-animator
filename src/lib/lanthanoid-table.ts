/** NCERT Chemistry I, The d- and f-Block Elements, table 4.9 (PDF p.22).
 * https://ncert.nic.in/textbook/pdf/lech104.pdf#page=22
 * Configurations show electrons outside [Xe]. null means the table gives no value.
 */
const rows = [
  ["Lanthanum","La","5d1 6s2","5d1","4f0",null,187,106],
  ["Cerium","Ce","4f1 5d1 6s2","4f2","4f1","4f0",183,103],
  ["Praseodymium","Pr","4f3 6s2","4f3","4f2","4f1",182,101],
  ["Neodymium","Nd","4f4 6s2","4f4","4f3","4f2",181,99],
  ["Promethium","Pm","4f5 6s2","4f5","4f4",null,181,98],
  ["Samarium","Sm","4f6 6s2","4f6","4f5",null,180,96],
  ["Europium","Eu","4f7 6s2","4f7","4f6",null,199,95],
  ["Gadolinium","Gd","4f7 5d1 6s2","4f7 5d1","4f7",null,180,94],
  ["Terbium","Tb","4f9 6s2","4f9","4f8","4f7",178,92],
  ["Dysprosium","Dy","4f10 6s2","4f10","4f9","4f8",177,91],
  ["Holmium","Ho","4f11 6s2","4f11","4f10",null,176,89],
  ["Erbium","Er","4f12 6s2","4f12","4f11",null,175,88],
  ["Thulium","Tm","4f13 6s2","4f13","4f12",null,174,87],
  ["Ytterbium","Yb","4f14 6s2","4f14","4f13",null,173,86],
  ["Lutetium","Lu","4f14 5d1 6s2","4f14 5d1","4f14",null,null,null],
] as const;

export function lanthanoidSourceRow(line: string) {
  // Require a single named source row with its symbol and orbital data.
  // Arbitrary lanthanoid prose and mismatching numbers retain their original display.
  const matches = rows.filter(row => new RegExp(`\\b${row[0]}\\s+${row[1]}\\b`).test(line));
  if (matches.length !== 1 || !/\b4\s*f\s*\d+|\b5\s*d\s*\d+/.test(line)) return null;
  const row = matches[0], index = rows.indexOf(row);
  if (row[6] !== null && !new RegExp(`\\b${row[6]}\\b`).test(line)) return null;
  return {name:row[0],symbol:row[1],atomicNumber:57+index,
    configurations:[row[2],row[3],row[4],row[5]],atomicRadius:row[6],ionicRadius:row[7]};
}

export function orbitalLatex(configuration: string): string {
  return configuration.replace(/([1-7])([spdf])(\d{1,2})/g,"$1$2^{$3}").replace(/ /g,"\\,");
}
