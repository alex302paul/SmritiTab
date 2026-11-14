import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "ident"; value: string };

class CalcError extends Error {}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = "";
      let dotCount = 0;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === ".") dotCount += 1;
        if (dotCount > 1) throw new CalcError("Invalid decimal number");
        numStr += expr[i];
        i += 1;
      }
      const n = Number(numStr);
      if (!Number.isFinite(n)) throw new CalcError("Invalid number");
      tokens.push({ kind: "num", value: n });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let ident = "";
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        ident += expr[i];
        i += 1;
      }
      tokens.push({ kind: "ident", value: ident.toLowerCase() });
      continue;
    }
    if ("+-*/%^".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i += 1;
      continue;
    }
    throw new CalcError(`Unexpected character "${ch}"`);
  }
  return tokens;
}

function evaluateExpression(raw: string, ans: number): number {
  const trimmed = raw.trim();
  if (!trimmed) throw new CalcError("Enter an expression");
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) throw new CalcError("Enter an expression");

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (peek()?.kind === "op" && (peek() as { value: string }).value.match(/^[+-]$/)) {
      const op = (consume() as { value: string }).value;
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePow();
    while (peek()?.kind === "op" && (peek() as { value: string }).value.match(/^[*/%]$/)) {
      const op = (consume() as { value: string }).value;
      const right = parsePow();
      if ((op === "/" || op === "%") && right === 0) throw new CalcError("Division by zero");
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
    }
    return left;
  }

  function parsePow(): number {
    const base = parseUnary();
    if (peek()?.kind === "op" && (peek() as { value: string }).value === "^") {
      consume();
      const exp = parsePow();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.kind === "op" && ((peek() as { value: string }).value === "-" || (peek() as { value: string }).value === "+")) {
      const op = (consume() as { value: string }).value;
      const val = parseUnary();
      return op === "-" ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new CalcError("Incomplete expression");
    if (tok.kind === "num") {
      consume();
      return tok.value;
    }
    if (tok.kind === "ident") {
      consume();
      if (tok.value === "ans") return ans;
      if (tok.value === "pi") return Math.PI;
      if (tok.value === "e") return Math.E;
      throw new CalcError(`Unknown symbol "${tok.value}"`);
    }
    if (tok.kind === "lparen") {
      consume();
      const val = parseAddSub();
      if (peek()?.kind !== "rparen") throw new CalcError("Missing closing parenthesis");
      consume();
      return val;
    }
    throw new CalcError("Unexpected token");
  }

  const result = parseAddSub();
  if (pos < tokens.length) throw new CalcError("Unexpected trailing input");
  if (!Number.isFinite(result)) throw new CalcError("Result is out of range");
  return result;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  if (Number.isInteger(n)) return String(n);
  const rounded = Number(n.toFixed(10));
  if (Math.abs(rounded) >= 1e16 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
    return rounded.toExponential(6);
  }
  return String(rounded);
}

const KEYS: Array<{ label: string; value: string; kind?: "operator" | "action" | "equals" }> = [
  { label: "AC", value: "clear", kind: "action" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
  { label: "^", value: "^", kind: "operator" },
  { label: "%", value: "%", kind: "operator" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "÷", value: "/", kind: "operator" },
  { label: "×", value: "*", kind: "operator" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "−", value: "-", kind: "operator" },
  { label: "+", value: "+", kind: "operator" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "ans", value: "ans" },
  { label: "⌫", value: "backspace", kind: "action" },
  { label: "0", value: "0" },
  { label: ".", value: "." },
  { label: "π", value: "pi" },
  { label: "=", value: "=", kind: "equals" },
];

export function CalculatorApp() {
  const [expr, setExpr] = useState("");
  const [ans, setAns] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!expr.trim()) return null;
    try {
      return formatNumber(evaluateExpression(expr, ans));
    } catch {
      return null;
    }
  }, [expr, ans]);

  const commit = useCallback(() => {
    if (!expr.trim()) return;
    try {
      const val = evaluateExpression(expr, ans);
      setError(null);
      setAns(val);
      setExpr(formatNumber(val));
    } catch (err) {
      setError(err instanceof CalcError ? err.message : "Expression could not be evaluated.");
    }
  }, [expr, ans]);

  const pressKey = useCallback(
    (val: string) => {
      setError(null);
      if (val === "clear") {
        setExpr("");
        return;
      }
      if (val === "backspace") {
        setExpr((prev) => prev.slice(0, -1));
        return;
      }
      if (val === "=") {
        commit();
        return;
      }
      setExpr((prev) => {
        const next = prev + val;
        const segments = next.split(/[+\-*/%^()]/);
        const last = segments[segments.length - 1] ?? "";
        if ((last.match(/\./g) ?? []).length > 1) return prev;
        return next;
      });
    },
    [commit],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-900/10 p-4 dark:border-white/10">
        <input
          ref={inputRef}
          value={expr}
          onChange={(e) => {
            setError(null);
            setExpr(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "=") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape" && expr) {
              e.preventDefault();
              e.stopPropagation();
              setExpr("");
            }
          }}
          aria-label="Calculator expression"
          placeholder="0"
          className="w-full bg-transparent text-right font-mono text-2xl font-medium text-slate-900 outline-none placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-600"
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
            {error ? (
              <span role="alert" className="text-rose-500">
                {error}
              </span>
            ) : (
              `ans = ${formatNumber(ans)}`
            )}
          </span>
          <span className="font-mono text-base tabular-nums text-slate-500 dark:text-slate-300">
            {preview ?? ""}
          </span>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-5 gap-1.5 p-3">
        {KEYS.map((k) => (
          <button
            key={`${k.label}-${k.value}`}
            type="button"
            onClick={() => pressKey(k.value)}
            className={`rounded-xl py-2.5 text-sm font-medium transition active:scale-95 ${
              k.kind === "equals"
                ? "col-span-2 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
                : k.kind === "operator"
                  ? "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : k.kind === "action"
                    ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                    : "bg-slate-900/5 text-slate-800 hover:bg-slate-900/10 dark:bg-white/8 dark:text-slate-100 dark:hover:bg-white/15"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
