export function evaluateEquation(tokens: readonly string[]): number {
  if (tokens.length < 3 || tokens.length % 2 === 0) throw new Error('Expresión incompleta');
  const number = (token: string) => { if (!/^\d+$/.test(token)) throw new Error('Número inválido'); const n = Number(token); if (!Number.isSafeInteger(n)) throw new Error('Fuera de rango'); return n; };
  let result = number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const n = number(tokens[i + 1]);
    if (tokens[i] === 'Suma') result += n;
    else if (tokens[i] === 'Resta') result -= n;
    else throw new Error('Operación no admitida');
    if (!Number.isSafeInteger(result)) throw new Error('Fuera de rango');
  }
  return result;
}
