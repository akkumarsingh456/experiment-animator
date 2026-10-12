import { formulaIdentity, matchingSourceRules, sourceFormulaLines } from '@/lib/source-formula-supplements';

// These steps express standard definitions and algebra. Empirical laws are
// identified as laws rather than being given an invented mathematical proof.
const steps: Record<string, string[]> = {
  'Electric field': [String.raw`For a positive test charge $q_0$, force is $\vec F=q_0\vec E$.`, String.raw`Divide by the test charge: $\vec E=\vec F/q_0$.`],
  'Electric field of a point charge': [String.raw`Coulomb's law gives $\vec F=kqq_0\hat r/r^2$.`, String.raw`Use $\vec E=\vec F/q_0$ to obtain $\vec E=kq\hat r/r^2$.`],
  'Electric flux': [String.raw`For a uniform field across a flat surface, $\Phi_E=\int\vec E\cdot d\vec A$.`, String.raw`The angle between the field and outward area normal is $\theta$, so $\Phi_E=EA\cos\theta$.`],
  'Potential of a point charge': [String.raw`Set $V(\infty)=0$ and use $V(r)=-\int_{\infty}^{r}\vec E\cdot d\vec r$.`, String.raw`With radial field $E=kq/r^2$, integration gives $V(r)=kq/r$.`],
  'Parallel-plate capacitance': [String.raw`Neglect fringing: $E=\sigma/\varepsilon_0=Q/(\varepsilon_0 A)$.`, String.raw`For separation $d$, $V=Ed=Qd/(\varepsilon_0 A)$.`, String.raw`Hence $C=Q/V=\varepsilon_0 A/d$.`],
  'Current and drift velocity': [String.raw`In time $\Delta t$, carriers move a mean distance $v_d\Delta t$.`, String.raw`The charge crossing area $A$ is $\Delta Q=neAv_d\Delta t$.`, String.raw`Therefore $I=\Delta Q/\Delta t=neAv_d$.`],
  'Resistance and resistivity': [String.raw`For a uniform conductor, $J=\sigma E$, $J=I/A$ and $E=V/l$.`, String.raw`Thus $I/A=\sigma V/l$ and $R=V/I=l/(\sigma A)=\rho l/A$.`],
  'Electrical power': [String.raw`Charge $Q$ crossing potential difference $V$ transfers energy $W=QV$.`, String.raw`Then $P=dW/dt=V\,dQ/dt=VI$.`, String.raw`Use $V=IR$ to obtain $P=I^2R=V^2/R$.`],
  'Kinetic energy': [String.raw`For constant mass, $W=\int F\,dx=\int m v\,dv$.`, String.raw`Integrating from rest to speed $v$ gives $K=\tfrac12mv^2$.`],
  'Uniformly accelerated motion': [String.raw`For constant acceleration, $a=dv/dt$, so $v=u+at$.`, String.raw`Integrate $v=ds/dt$ to get $s=ut+\tfrac12at^2$.`, String.raw`Eliminate $t$ to obtain $v^2=u^2+2as$.`],
  'Escape speed': [String.raw`For minimum escape speed, final energy at infinity is zero.`, String.raw`Energy conservation gives $\tfrac12mv_e^2-GMm/R=0$.`, String.raw`Hence $v_e=\sqrt{2GM/R}$, neglecting atmosphere and rotation.`],
  'Small-amplitude pendulum period': [String.raw`For small angles, $\sin\theta\approx\theta$ and $d^2\theta/dt^2=-(g/l)\theta$.`, String.raw`Compare with SHM to obtain $\omega=\sqrt{g/l}$ and $T=2\pi/\omega=2\pi\sqrt{l/g}$.`],
  'RMS values for a sinusoidal current': [String.raw`For $I=I_0\sin\omega t$, $I_{\mathrm{rms}}=\sqrt{\langle I^2\rangle}$.`, String.raw`Over a complete cycle, $\langle\sin^2\omega t\rangle=1/2$, so $I_{\mathrm{rms}}=I_0/\sqrt2$.`],
  'Cell potential': [String.raw`Write both electrode potentials as reduction potentials.`, String.raw`The cathode undergoes reduction and the anode reaction is reversed: $E_{\mathrm{cell}}=E_{\mathrm{cathode}}-E_{\mathrm{anode}}$.`],
  'Nernst equation': [String.raw`For a reaction at temperature $T$, $\Delta_rG=\Delta_rG^\circ+RT\ln Q$.`, String.raw`Use $\Delta_rG=-nFE_{\mathrm{cell}}$ and $\Delta_rG^\circ=-nFE_{\mathrm{cell}}^\circ$.`, String.raw`Dividing by $-nF$ gives $E_{\mathrm{cell}}=E_{\mathrm{cell}}^\circ-(RT/nF)\ln Q$.`, String.raw`At $298\,\mathrm K$, $E_{\mathrm{cell}}=E_{\mathrm{cell}}^\circ-(0.05916\,\mathrm V/n)\log_{10}Q$.`],
  'Cell potential and Gibbs energy': [String.raw`One mole of the balanced reaction transfers $n$ moles of electrons, so charge transferred is $nF$.`, String.raw`The maximum electrical work delivered is $nFE_{\mathrm{cell}}$.`, String.raw`At constant temperature and pressure, $\Delta_rG=-w_{\max}=-nFE_{\mathrm{cell}}$.`],
  'Cell potential and equilibrium': [String.raw`At equilibrium $E_{\mathrm{cell}}=0$ and $Q=K$.`, String.raw`Substitute into the Nernst equation: $0=E_{\mathrm{cell}}^\circ-(RT/nF)\ln K$.`, String.raw`Rearrange: $\ln K=nFE_{\mathrm{cell}}^\circ/(RT)$.`],
  'Conductance and cell constant': [String.raw`Resistance of the uniform conducting sample is $R=\rho l/A$.`, String.raw`Use $G=1/R$ and $\kappa=1/\rho$.`, String.raw`Thus $\kappa=l/(RA)=G(l/A)$; the cell constant is $l/A$.`],
  'Molar conductivity': [String.raw`With SI concentration $c$ in $\mathrm{mol\,m^{-3}}$, the volume containing one mole is $1/c$.`, String.raw`Molar conductivity is $\Lambda_m=\kappa/c$ in $\mathrm{S\,m^2\,mol^{-1}}$.`, String.raw`If $\kappa$ is in $\mathrm{S\,cm^{-1}}$ and $C$ in $\mathrm{mol\,L^{-1}}$, $\Lambda_m=1000\kappa/C$ in $\mathrm{S\,cm^2\,mol^{-1}}$.`],
  'Degree of dissociation from conductivity': [String.raw`For a weak electrolyte, conductivity measures the fraction ionised.`, String.raw`At infinite dilution the electrolyte is fully dissociated, with molar conductivity $\Lambda_m^\circ$.`, String.raw`Thus $\Lambda_m=\alpha\Lambda_m^\circ$ and $\alpha=\Lambda_m/\Lambda_m^\circ$, assuming ionic mobilities are comparable.`],
  "Faraday's law of electrolysis": [String.raw`Charge passed in time $t$ at constant current $I$ is $Q=It$.`, String.raw`One mole of electrons carries charge $F$; a product requiring $z$ electrons per particle forms $Q/(zF)$ moles.`, String.raw`For molar mass $M$, the mass is $m=M Q/(zF)=MIt/(zF)$, at 100% current efficiency.`],
  'First-order reaction': [String.raw`For a first-order reaction, $-d[A]/dt=k[A]$.`, String.raw`Separate variables and integrate from $[A]_0$ to $[A]_t$: $\ln([A]_0/[A]_t)=kt$.`, String.raw`At half-life $[A]_t=[A]_0/2$, so $t_{1/2}=\ln2/k$.`],
  'Arrhenius equation': [String.raw`Take logarithms of $k=Ae^{-E_a/(RT)}$: $\ln k=\ln A-E_a/(RT)$.`, String.raw`For constant $E_a$ and $A$, subtract the expressions at two temperatures: $\ln(k_2/k_1)=(E_a/R)(1/T_1-1/T_2)$.`],
  'Osmotic pressure': [String.raw`For an ideal dilute solution, the osmotic-pressure relation is $\Pi V=i nRT$.`, String.raw`Divide by solution volume and use $c=n/V$: $\Pi=i cRT$.`],
  'de Broglie wavelength': [String.raw`The de Broglie relation is $\lambda=h/p$.`, String.raw`For a non-relativistic particle $p=mv$, so $\lambda=h/(mv)$.`],
};

export function sourceFormulaBlocks(title: string, subject: string, excerpts: string[], existing: string[] = []): string[] {
  const output = sourceFormulaLines(title, subject, excerpts, existing);
  const original = existing.join('\n').toLowerCase();
  const knownDerivations = new Set(existing.filter(line => /^\*\*derivation of/i.test(line)).map(formulaIdentity));
  for (const entry of matchingSourceRules(title, subject, excerpts)) {
    if (!steps[entry.name] || original.includes(`derivation of ${entry.name.toLowerCase()}`) || knownDerivations.has(formulaIdentity(entry.formula))) continue;
    output.push(`**Derivation of ${entry.name}:** ${entry.formula}`);
    steps[entry.name].forEach((line, index) => output.push(`**Derivation step ${index + 1}:** ${line}`));
  }
  return output;
}
