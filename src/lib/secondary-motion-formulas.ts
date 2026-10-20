/** Source-attested school-level relations. Never decode a lost graph fraction.
 * NCERT legacy Class 9 Motion, sections 7.3–7.5 (8.3–8.5 in older editions).
 * This supplement uses displacement along a chosen positive direction.
 */
export function secondaryMotionFormulas(title:string,evidence:string,klass:string,subject:string,chapter:string):string[]{
 if(!/^(?:Class\s*)?9$/.test(klass)||subject!=='Science'||!/^Chapter\s+\d+:\s*Motion\s*\(Physics\)$/i.test(chapter))return [];
 if(/rate of change of velocity|^acceleration$/i.test(title)&&/acceleration|change.*velocity/i.test(evidence))return [
  '**Formula:** Average acceleration: $a=\\frac{v-u}{t}$ for a nonzero elapsed time $t$.',
  '**Variables:** $u$: initial velocity; $v$: final velocity; $t$: elapsed time. SI unit of acceleration: $\\mathrm{m\\,s^{-2}}$.',
  '**Important point:** Acceleration describes a change in velocity, including a change of direction. Uniform acceleration means equal changes of velocity in equal time intervals.',
 ];
 if(/equations of (?:kinematic )?motion/i.test(title)&&/uniform(?:ly)? accelerat|constant acceleration/i.test(evidence))return [
  '**Condition:** These equations apply to straight-line motion with constant acceleration. Choose one positive direction; $s$ is signed displacement.',
  '**Formula:** Velocity–time relation: $v=u+at$.',
  '**Formula:** Displacement–time relation: $s=ut+\\frac{1}{2}at^2$.',
  '**Formula:** Velocity–displacement relation: $v^2=u^2+2as$.',
  '**Variables:** $u,v$: initial and final velocity ($\\mathrm{m\\,s^{-1}}$); $a$: constant acceleration ($\\mathrm{m\\,s^{-2}}$); $t$: time ($\\mathrm{s}$); $s$: displacement ($\\mathrm{m}$).',
  '**Derivation of velocity–time relation:** $v=u+at$',
  '**Derivation step 1:** For constant acceleration, $a=\\frac{v-u}{t}$, so $at=v-u$.',
  '**Derivation step 2:** Rearranging gives $v=u+at$.',
  '**Derivation of displacement–time relation:** $s=ut+\\frac{1}{2}at^2$',
  '**Derivation step 1:** The signed area under the straight velocity–time line is $s=ut+\\frac{1}{2}(v-u)t$.',
  '**Derivation step 2:** Substituting $v-u=at$ gives $s=ut+\\frac{1}{2}at^2$.',
  '**Derivation of velocity–displacement relation:** $v^2=u^2+2as$',
  '**Derivation step 1:** For constant acceleration, $s=\\frac{u+v}{2}t$ and $v-u=at$.',
  '**Derivation step 2:** Multiply: $2as=(u+v)at=(u+v)(v-u)=v^2-u^2$. Hence $v^2=u^2+2as$.',
 ];
 return [];
}
