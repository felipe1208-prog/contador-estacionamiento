/**
 * Motor Secuencial Síncrono de 3 Bits para Control de Estacionamiento
 * Deducción de ecuaciones: Sócrates Felipe Ortiz Rodríguez
 */

export class CircuitLogicCore {
  constructor() {
    // Entradas del sistema
    this.Ein = 0;
    this.Eout = 0;

    // Estado actual de los flip-flops (Q2 Q1 Q0)
    this.Q2 = 0;
    this.Q1 = 0;
    this.Q0 = 0;

    // Latch SR (Alarma de sobrecupo)
    this.AlarmLatch = 0;

    // Términos combinacionales actuales
    this.terms = {
      J2: 0,
      K2: 0,
      D1: 0,
      T0: 0,
      S: 0,
      R: 0,
    };

    this.evaluateCombinational();
  }

  /**
   * Evalúa la lógica combinacional derivada de los Mapas de Karnaugh
   */
  evaluateCombinational() {
    const Ein = this.Ein;
    const Eout = this.Eout;
    const Q2 = this.Q2;
    const Q1 = this.Q1;
    const Q0 = this.Q0;

    const notEin = Ein ? 0 : 1;
    const notEout = Eout ? 0 : 1;
    const notQ2 = Q2 ? 0 : 1;
    const notQ1 = Q1 ? 0 : 1;
    const notQ0 = Q0 ? 0 : 1;

    // J2 = Ein * /Eout * Q1 * Q0[cite: 5]
    this.terms.J2 = Ein && notEout && Q1 && Q0 ? 1 : 0;

    // K2 = /Ein * Eout * /Q1 * /Q0[cite: 5]
    this.terms.K2 = notEin && Eout && notQ1 && notQ0 ? 1 : 0;

    // D1 = (/Ein * Q1 * Q0) + (Ein * Eout * Q1) + (Ein * Q2 * Q1) +
    //      (/Eout * Q1 * /Q0) + (Ein * /Eout * /Q1 * Q0) + (/Ein * Eout * Q2 * /Q1 * /Q0)[cite: 5]
    this.terms.D1 =
      (notEin && Q1 && Q0) ||
      (Ein && Eout && Q1) ||
      (Ein && Q2 && Q1) ||
      (notEout && Q1 && notQ0) ||
      (Ein && notEout && notQ1 && Q0) ||
      (notEin && Eout && Q2 && notQ1 && notQ0)
        ? 1
        : 0;

    // T0 = (/Ein * Eout * Q2) + (/Ein * Eout * Q1) + (/Ein * Eout * Q0) +
    //      (Ein * /Eout * /Q2) + (Ein * /Eout * /Q1) + (Ein * /Eout * /Q0)[cite: 6]
    this.terms.T0 =
      (notEin && Eout && Q2) ||
      (notEin && Eout && Q1) ||
      (notEin && Eout && Q0) ||
      (Ein && notEout && notQ2) ||
      (Ein && notEout && notQ1) ||
      (Ein && notEout && notQ0)
        ? 1
        : 0;

    // Latch SR de Alarma:
    // S = Ein * /Eout * Q2 * Q1 * Q0[cite: 6]
    this.terms.S = Ein && notEout && Q2 && Q1 && Q0 ? 1 : 0;

    // R = /Ein * Eout[cite: 6]
    this.terms.R = notEin && Eout ? 1 : 0;

    // Actualización asíncrona del Latch SR
    if (this.terms.S === 1) {
      this.AlarmLatch = 1;
    } else if (this.terms.R === 1) {
      this.AlarmLatch = 0;
    }
  }

  /**
   * Aplica un flanco de subida del reloj manual (CLK)
   * Resuelve simultáneamente los 3 flip-flops
   */
  triggerClockEdge() {
    this.evaluateCombinational();

    const curQ2 = this.Q2;
    const curQ1 = this.Q1;
    const curQ0 = this.Q0;

    // Próximo estado Flip-Flop JK (Q2)
    // Q+ = J*/Q + /K*Q
    const nextQ2 =
      (this.terms.J2 && !curQ2) || (!this.terms.K2 && curQ2) ? 1 : 0;

    // Próximo estado Flip-Flop D (Q1)
    // Q+ = D
    const nextQ1 = this.terms.D1;

    // Próximo estado Flip-Flop T (Q0)
    // Q+ = T XOR Q
    const nextQ0 = this.terms.T0 ^ curQ0 ? 1 : 0;

    // Disparo síncrono paralelo
    this.Q2 = nextQ2;
    this.Q1 = nextQ1;
    this.Q0 = nextQ0;

    // Reevaluación combinacional posterior al flanco
    this.evaluateCombinational();

    return {
      count: this.getDecimalCount(),
      alarm: this.AlarmLatch,
      q2: this.Q2,
      q1: this.Q1,
      q0: this.Q0,
    };
  }

  setInputs(ein, eout) {
    this.Ein = ein ? 1 : 0;
    this.Eout = eout ? 1 : 0;
    this.evaluateCombinational();
  }

  getDecimalCount() {
    return (this.Q2 << 2) | (this.Q1 << 1) | this.Q0;
  }

  /**
   * Decodificador 74LS47 BCD a 7 Segmentos (Ánodo Común)
   * Retorna el estado lógico de los segmentos a, b, c, d, e, f, g
   */
  getDecoderSegments() {
    const val = this.getDecimalCount();
    const map = {
      0: { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 0 },
      1: { a: 0, b: 1, c: 1, d: 0, e: 0, f: 0, g: 0 },
      2: { a: 1, b: 1, c: 0, d: 1, e: 1, f: 0, g: 1 },
      3: { a: 1, b: 1, c: 1, d: 1, e: 0, f: 0, g: 1 },
      4: { a: 0, b: 1, c: 1, d: 0, e: 0, f: 1, g: 1 },
      5: { a: 1, b: 0, c: 1, d: 1, e: 0, f: 1, g: 1 },
      6: { a: 1, b: 0, c: 1, d: 1, e: 1, f: 1, g: 1 },
      7: { a: 1, b: 1, c: 1, d: 0, e: 0, f: 0, g: 0 },
    };
    return map[val] || { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0 };
  }
}
