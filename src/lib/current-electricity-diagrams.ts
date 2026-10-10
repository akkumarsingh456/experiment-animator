/** Original, deterministic textbook illustrations: no external image service. */
const ink = "#183b45", teal = "#79b5b5", orange = "#dd795b";
const text = (x: number, y: number, value: string, size = 23) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" fill="${ink}">${value}</text>`;
const arrow = (x1: number, y1: number, x2: number, y2: number, color = orange) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="5" fill="none" marker-end="url(#tip)"/>`;
const wire = (d: string) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
const resistor = (x: number, y: number, angle: number, label: string) => `<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-40" y="-12" width="80" height="24" rx="3" fill="#f5d7b6" stroke="${ink}" stroke-width="3"/></g>${text(x + (angle > 0 ? -38 : 38), y - 26, label)}`;

export function currentElectricityDiagram(title: string): { drawing: string; caption: string } | null {
  const topic = title.toLowerCase();
  if (/symbols|quantities|units/.test(topic)) {
    return { caption: "Current is the rate of charge flow: I = ΔQ/Δt for the average current over a time interval. Charge is measured in coulombs, time in seconds, current in amperes.", drawing: [
      `<rect x="70" y="160" width="250" height="145" rx="12" fill="#edf6fb" stroke="${ink}" stroke-width="2"/>`,
      text(195, 212, "Charge transferred ΔQ", 24), text(195, 267, "coulomb (C)", 22),
      `<rect x="440" y="160" width="250" height="145" rx="12" fill="#eef8f4" stroke="${ink}" stroke-width="2"/>`,
      text(565, 212, "Time interval Δt", 24), text(565, 267, "second (s)", 22),
      text(380, 255, "÷", 48), text(380, 390, "Average current I = ΔQ / Δt", 30), text(380, 450, "1 ampere = 1 coulomb per second", 23),
    ].join("") };
  }
  if (/wheatstone|bridge/.test(topic)) {
    return { caption: "Balanced Wheatstone bridge: P/Q = R/S; galvanometer current is zero.", drawing: [
      wire("M360 95L160 275L360 455L560 275Z M160 275H560 M360 95H680V455H360"),
      resistor(260, 185, -42, "P"), resistor(260, 365, 42, "Q"), resistor(460, 185, 42, "R"), resistor(460, 365, -42, "S"),
      `<circle cx="360" cy="275" r="33" fill="#e7f3f4" stroke="${ink}" stroke-width="3"/>`, text(360, 284, "G"),
      `<rect x="662" y="240" width="36" height="75" fill="#fff9ed"/><path d="M657 256H703 M668 286H692" stroke="${ink}" stroke-width="4"/>`,
      text(360, 75, "A"), text(125, 283, "B"), text(360, 490, "C"), text(590, 283, "D"), text(642, 337, "cell", 19),
    ].join("") };
  }
  if (/kirchhoff|junction|loop rule/.test(topic)) {
    return { caption: "Junction rule: total current entering equals total current leaving.", drawing: [
      wire("M120 270H635 M380 90V450"), `<circle cx="380" cy="270" r="12" fill="${ink}"/>`,
      arrow(165, 270, 290, 270), arrow(380, 120, 380, 210), arrow(470, 270, 600, 270), arrow(380, 340, 380, 425),
      text(200, 235, "I₁"), text(420, 170, "I₂"), text(540, 235, "I₃"), text(425, 395, "I₄"),
      text(380, 505, "I₁ + I₂ = I₃ + I₄", 28),
    ].join("") };
  }
  if (/ohm|temperature|resistivity.*temperature/.test(topic)) {
    const temperature = /temperature/.test(topic);
    const semiconductor = /semiconductor/.test(topic);
    return { caption: temperature ? "Qualitative temperature trend; the straight-line approximation applies over a limited range." : "Ohmic conductor at constant temperature: I is proportional to V; slope = 1/R.", drawing: [
      arrow(130, 415, 650, 415, ink), arrow(130, 415, 130, 90, ink),
      `<path d="${semiconductor ? "M160 125Q240 340 620 365" : "M135 410L600 125"}" fill="none" stroke="${orange}" stroke-width="7" stroke-linecap="round"/>`,
      text(655, 455, temperature ? "T" : "V (volt)"), text(85, 80, temperature ? "ρ" : "I (ampere)"),
      text(380, 500, temperature ? (semiconductor ? "Semiconductor: ρ decreases" : "Metal: ρ increases") : "Constant temperature", 24),
    ].join("") };
  }
  if (/series|parallel|combination.*resist/.test(topic)) {
    const parallel = /parallel/.test(topic);
    return { caption: parallel ? "Parallel resistors share the same potential difference; branch currents add." : "Series resistors carry the same current; potential drops add.", drawing: parallel ? [
      wire("M120 270H205V160H555V380H205V270 M555 270H650 M205 380H555"),
      resistor(380, 160, 0, "R₁"), resistor(380, 380, 0, "R₂"),
      arrow(125, 270, 185, 270), arrow(580, 270, 640, 270), text(380, 495, "Same voltage across each branch"),
    ].join("") : [wire("M100 270H660"), resistor(265, 270, 0, "R₁"), resistor(505, 270, 0, "R₂"), arrow(105, 215, 175, 215), text(130, 190, "I"), text(380, 425, "Same current through both resistors")].join("") };
  }
  if (/current|drift|mobility|resistan|resistivity|conduct|electron|electric/.test(topic)) {
    const electrons: string[] = [];
    for (const [x, y] of [[225, 215], [360, 215], [495, 215], [285, 275], [420, 275], [555, 275]]) {
      electrons.push(`<circle cx="${x}" cy="${y}" r="12" fill="#f9d783" stroke="${ink}" stroke-width="2"/>`, text(x, y + 6, "−", 20), arrow(x - 22, y, x - 78, y, ink));
    }
    return { caption: "Electron drift is opposite to conventional current. A marks the wire's cross-sectional area.", drawing: [
      `<path d="M160 240H95Q70 240 70 290V365Q70 415 120 415H620Q680 415 680 365V290Q680 240 640 240H610" fill="none" stroke="${ink}" stroke-width="13"/><path d="M160 240H95Q70 240 70 290V365Q70 415 120 415H620Q680 415 680 365V290Q680 240 640 240H610" fill="none" stroke="${teal}" stroke-width="7"/>`,
      `<path d="M190 180H585V305H190C150 305 150 180 190 180Z" fill="${teal}" stroke="${ink}" stroke-width="3"/><ellipse cx="585" cy="242" rx="28" ry="62" fill="#bbc58b" stroke="${ink}" stroke-width="3"/>`,
      ...electrons, text(585, 250, "A", 30), arrow(355, 125, 535, 125), text(445, 100, "Conventional current I"),
      `<rect x="305" y="390" width="140" height="50" rx="7" fill="#9fa782" stroke="${ink}" stroke-width="3"/><path d="M375 391H438Q445 391 445 398V432Q445 440 438 440H375Z" fill="${orange}"/>`, text(340, 423, "+", 27), text(410, 423, "−", 27),
      text(375, 490, /drift|mobility/.test(topic) ? "Electron drift velocity v_d ←" : "Charge flows through area A", 24),
    ].join("") };
  }
  return null;
}

export function wrapTextbookDrawing(drawing: string, identity: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1520" height="1080" viewBox="0 0 760 540" data-lesson-id="${identity}"><defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#e9eff3" stroke-width=".6"/></pattern><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs><rect width="760" height="540" rx="12" fill="#ffffff"/><rect x="25" y="25" width="710" height="490" rx="8" fill="url(#grid)"/>${drawing}</svg>`;
}
