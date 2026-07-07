// lean.cau.li compiler test suite.
//
// Paste this whole file into the browser DevTools console at https://lean.cau.li
// once the page shows "Ready". It drives the real editor (sets the source, clicks
// Run, reads the diagnostics) and reports pass/fail for each case.
//
// The playground compiles in a resident, Init-only Lean environment: core tactics
// work (induction, rw, simp, omega, decide) but there is NO Mathlib/Std, and an
// `import` in user code hangs the worker — so every case here is pure Init.
//
// Each case is { name, code, expect } where expect is:
//   'ok'          the code compiles with zero errors
//   'error'       the code reports >= 1 error (proves the checker actually checks)
//   { has: 's' }  some diagnostic contains substring s (checks #eval output)

const cases = [
  // Natural Number Game territory: Nat lemmas proved from core, by induction.
  { name: 'add_comm by induction', expect: 'ok', code:
`example (a b : Nat) : a + b = b + a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.add_succ, Nat.succ_add, hd]` },

  { name: 'zero_add by induction', expect: 'ok', code:
`example (n : Nat) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ d hd => rw [Nat.add_succ, hd]` },

  { name: 'add_assoc by induction', expect: 'ok', code:
`example (a b c : Nat) : a + b + c = a + (b + c) := by
  induction c with
  | zero => rfl
  | succ d hd => rw [Nat.add_succ, Nat.add_succ, Nat.add_succ, hd]` },

  { name: 'mul_comm by induction', expect: 'ok', code:
`example (a b : Nat) : a * b = b * a := by
  induction b with
  | zero => simp
  | succ d hd => rw [Nat.mul_succ, hd, Nat.succ_mul]` },

  // Decision procedures and core lemmas.
  { name: 'omega linear arithmetic', expect: 'ok', code:
`example (a b c : Nat) (h : a ≤ b) : a + c ≤ b + c := by omega` },

  { name: 'Nat.le_trans (Init lemma)', expect: 'ok', code:
`example (a b c : Nat) (h1 : a ≤ b) (h2 : b ≤ c) : a ≤ c := Nat.le_trans h1 h2` },

  { name: 'List.reverse_reverse by simp', expect: 'ok', code:
`example (l : List Nat) : l.reverse.reverse = l := by simp` },

  // Term-mode logic and existentials.
  { name: 'and_comm term mode', expect: 'ok', code:
`example (p q : Prop) : p ∧ q → q ∧ p := fun h => ⟨h.2, h.1⟩` },

  { name: 'exists intro', expect: 'ok', code:
`example : ∃ n : Nat, n + n = 6 := ⟨3, rfl⟩` },

  // A recursive definition plus a decidable check over it.
  { name: 'fibonacci def + decide fib 10 = 55', expect: 'ok', code:
`def fib : Nat → Nat
  | 0 => 0
  | 1 => 1
  | n + 2 => fib n + fib (n + 1)
example : fib 10 = 55 := by decide` },

  // #eval: computation correctness.
  { name: 'gauss sum #eval = 5050', expect: { has: '5050' }, code:
`#eval (List.range 101).foldl (· + ·) 0` },

  { name: 'string concat #eval = cau.li', expect: { has: 'cau.li' }, code:
`#eval "cau" ++ "." ++ "li"` },

  { name: 'factorial #eval = 120', expect: { has: '120' }, code:
`#eval (List.range 5).foldl (fun a b => a * (b + 1)) 1` },

  // Known playground limitations, NOT Lean bugs: #eval of tail-recursive List
  // ops fails because their compiled `._redArg` helper is absent from the
  // resident exported-level Init env (getOrCreateWasmEnv imports with
  // level := .exported). The same operations succeed inside proofs. These cases
  // assert the limitation still holds — if a future build fixes it they flip to
  // FAIL, which is the signal to update this suite.
  { name: 'known limit: #eval List.reverse fails (redArg)', expect: 'error', code:
`#eval [1, 2, 3].reverse` },

  { name: 'known limit: #eval List.map fails (redArg)', expect: 'error', code:
`#eval [1, 2, 3].map (· + 1)` },

  // Error cases: a correct checker must REJECT wrong code, not rubber-stamp it.
  { name: 'wrong proof rejected', expect: 'error', code:
`example (n : Nat) : n + 1 = n := by rfl` },

  { name: 'type mismatch rejected', expect: 'error', code:
`#check (1 : String)` },

  { name: 'unknown identifier rejected', expect: 'error', code:
`#check thisSymbolDoesNotExist` },

  { name: 'false goal rejected by omega', expect: 'error', code:
`example (n : Nat) : n = n + 1 := by omega` },
];

// Drive one compile: set the source, click Run, wait for a unique marker command
// (#eval of a random token, appended) to appear in the diagnostics, then read
// them back. The marker is the last command, so its output means the whole
// compile finished — even when the user's own code produces no output.
async function leanCompile(code, timeoutMs = 20000) {
  const ta = document.querySelector('textarea');
  const runBtn = [...document.querySelectorAll('button')].find(b => /run code/i.test(b.textContent));
  const setVal = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const token = 'DONE' + Date.now() + Math.floor(Math.random() * 1e6);
  setVal(ta, code + `\n#eval "${token}"`);
  const t0 = performance.now();
  runBtn.click();
  while (performance.now() - t0 < timeoutMs) {
    await new Promise(r => setTimeout(r, 120));
    if ([...document.querySelectorAll('.diagnostic')].some(d => d.textContent.includes(token))) break;
  }
  const finished = performance.now() - t0 < timeoutMs;
  const diags = [...document.querySelectorAll('.diagnostic')]
    .map(d => ({ text: d.textContent.trim(), error: d.className.includes('diagnostic-error') }))
    .filter(d => !d.text.includes(token));
  return { ms: Math.round(performance.now() - t0), finished, diags };
}

function verdict(expect, res) {
  if (!res.finished) return { pass: false, why: 'timed out (worker stuck?)' };
  const errors = res.diags.filter(d => d.error);
  if (expect === 'ok') return { pass: errors.length === 0, why: errors[0]?.text.split('\n')[0] || '' };
  if (expect === 'error') return { pass: errors.length > 0, why: errors.length ? '' : 'expected an error, got none' };
  if (expect && expect.has) {
    const hit = res.diags.some(d => d.text.includes(expect.has));
    return { pass: hit, why: hit ? '' : `no diagnostic contained "${expect.has}"` };
  }
  return { pass: false, why: 'unknown expectation' };
}

async function runSuite() {
  if (!/ready/i.test(document.querySelector('.status')?.textContent || '')) {
    console.warn('Playground is not "Ready" yet — wait for it to boot, then re-run.');
    return;
  }
  console.log(`Running ${cases.length} cases against ${location.host} …`);
  const results = [];
  for (const c of cases) {
    const res = await leanCompile(c.code);
    const v = verdict(c.expect, res);
    results.push({ case: c.name, result: v.pass ? 'PASS' : 'FAIL', ms: res.ms, note: v.why });
    console.log(`${v.pass ? '✅' : '❌'} ${c.name}${v.why ? '  — ' + v.why : ''}`);
  }
  const passed = results.filter(r => r.result === 'PASS').length;
  console.log(`\n${passed}/${cases.length} passed`);
  console.table(results);
  return results;
}

runSuite();
