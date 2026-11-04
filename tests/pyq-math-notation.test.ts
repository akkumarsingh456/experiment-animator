import {describe, expect, it} from 'vitest';
import {pyqNotation} from '../src/lib/pyq-math-notation';
import {presentPyq} from '../src/lib/pyq-presentation';

describe('pyqNotation', () => {
  it('typesets scientific notation with carets and unicode exponents', () => {
    expect(pyqNotation('The mass of a proton is 1.67 × 10^-27 kg.')).toContain('$1.67\\times10^{-27}$');
    expect(pyqNotation('Avogadro number is 6.022 × 10²³.')).toContain('$6.022\\times10^{23}$');
    expect(pyqNotation('Charge on an electron is 1.6 × 10⁻¹⁹ C.')).toContain('$1.6\\times10^{-19}$');
  });

  it('typesets bare powers of ten and unit powers', () => {
    expect(pyqNotation('Energy gap is of the order 10^-19 J.')).toContain('$10^{-19}$');
    expect(pyqNotation('A body accelerates at 9.8 m s-2.')).toContain('$\\mathrm{s}^{-2}$');
    expect(pyqNotation('Enthalpy change is 40 kJ mol^-1.')).toContain('$\\mathrm{mol}^{-1}$');
  });

  it('typesets chemical species with mhchem', () => {
    expect(pyqNotation('Electrolysis of H2O gives H2 and O2.')).toContain('\\ce{H2O}');
    expect(pyqNotation('Washing soda is Na2CO3.')).toContain('\\ce{Na2CO3}');
  });

  it('never touches existing LaTeX math or plain prose', () => {
    expect(pyqNotation('Given $x^2 + y^2 = 25$, find x.')).toBe('Given $x^2 + y^2 = 25$, find x.');
    expect(pyqNotation('Define wavelength and frequency.')).toBe('Define wavelength and frequency.');
  });
});

describe('presentPyq extraction debris', () => {
  it('hides lines of unreadable box glyphs', () => {
    const view = presentPyq('Q15. Which hormone promotes cell division?\n\uE000\uE001\uE001\u25A1\u25A1\n(B) Which of the plant hormones are responsible?', 'Science');
    expect(view.text).not.toMatch(/[\uE000\u25A1]/u);
    expect(view.text).toContain('(B) Which of the plant hormones');
    expect(view.warnings.join(' ')).toContain('unreadable characters were hidden');
  });

  it('drops stray brace debris lines but keeps bracketed subparts', () => {
    const view = presentPyq('180 L\n{ }\n(B) Which of the plant hormones are responsible?', 'Science');
    expect(view.text).toBe('180 L\n(B) Which of the plant hormones are responsible?');
  });

  it('keeps brackets verbatim in Computer Science questions', () => {
    const code = 'Write the output:\nif x:\n    print("{ }")';
    expect(presentPyq(code, 'Computer Science').text).toBe(code);
  });

  it('still hides Devanagari lines and keeps the warning', () => {
    const view = presentPyq('Find x: x² + y² = 25\nप्रश्न का उत्तर दीजिए।', 'Science');
    expect(view.text).toBe('Find x: x² + y² = 25');
    expect(view.hiddenHindi).toBe(true);
  });
});
