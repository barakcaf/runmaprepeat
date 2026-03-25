/**
 * Simple expression calculator for pace/distance calculations.
 * Uses a recursive-descent parser to safely evaluate arithmetic expressions
 * without eval() or Function constructor.
 */

interface Cursor {
  pos: number;
}

/**
 * SECURITY: Safe arithmetic expression evaluator using recursive-descent parser.
 * This completely eliminates code execution vulnerabilities by parsing the input
 * as an arithmetic expression tree instead of executing it as JavaScript code.
 */
export function evaluateExpression(input: string): number {
  const sanitized = input.replace(/\s/g, "");

  // Validate input contains only arithmetic characters
  if (!/^[\d+\-*/().]+$/.test(sanitized)) {
    throw new Error("Invalid expression");
  }

  // Parse the expression using recursive descent
  const cursor: Cursor = { pos: 0 };
  const result = parseExpression(sanitized, cursor);

  // Ensure all input was consumed (no trailing invalid syntax)
  if (cursor.pos !== sanitized.length) {
    throw new Error("Invalid expression");
  }

  if (!Number.isFinite(result)) {
    throw new Error("Expression did not produce a finite number");
  }

  return result;
}

/**
 * Parse an expression: handles addition and subtraction
 * Grammar: expression = term (('+' | '-') term)*
 */
function parseExpression(s: string, c: Cursor): number {
  let left = parseTerm(s, c);

  while (c.pos < s.length && (s[c.pos] === "+" || s[c.pos] === "-")) {
    const op = s[c.pos++];
    const right = parseTerm(s, c);
    left = op === "+" ? left + right : left - right;
  }

  return left;
}

/**
 * Parse a term: handles multiplication and division
 * Grammar: term = factor (('*' | '/') factor)*
 */
function parseTerm(s: string, c: Cursor): number {
  let left = parseFactor(s, c);

  while (c.pos < s.length && (s[c.pos] === "*" || s[c.pos] === "/")) {
    const op = s[c.pos++];
    const right = parseFactor(s, c);
    left = op === "*" ? left * right : left / right;
  }

  return left;
}

/**
 * Parse a factor: handles numbers, parentheses, and unary minus
 * Grammar: factor = number | '(' expression ')' | '-' factor
 */
function parseFactor(s: string, c: Cursor): number {
  // Handle parenthesized expressions
  if (s[c.pos] === "(") {
    c.pos++; // skip '('
    const val = parseExpression(s, c);
    if (s[c.pos] !== ")") {
      throw new Error("Invalid expression");
    }
    c.pos++; // skip ')'
    return val;
  }

  // Handle unary minus
  if (s[c.pos] === "-") {
    c.pos++;
    return -parseFactor(s, c);
  }

  // Handle numbers (integer or decimal)
  const start = c.pos;
  while (c.pos < s.length && (s[c.pos] >= "0" && s[c.pos] <= "9" || s[c.pos] === ".")) {
    c.pos++;
  }

  if (c.pos === start) {
    throw new Error("Invalid expression");
  }

  const num = Number(s.slice(start, c.pos));
  if (Number.isNaN(num)) {
    throw new Error("Invalid expression");
  }

  return num;
}

export function calculatePaceFromInput(distanceKm: string, durationMinutes: string): string {
  try {
    const dist = evaluateExpression(distanceKm);
    const dur = evaluateExpression(durationMinutes);
    if (!Number.isFinite(dist) || !Number.isFinite(dur) || dist <= 0 || dur <= 0) return "--:--";
    const paceMin = dur / dist;
    const mins = Math.floor(paceMin);
    let secs = Math.round((paceMin - mins) * 60);
    // Handle edge case where seconds round to 60
    if (secs === 60) {
      return `${mins + 1}:00`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  } catch {
    return "--:--";
  }
}
