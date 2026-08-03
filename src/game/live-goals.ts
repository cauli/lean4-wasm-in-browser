// Extract the live proof-state preview from the compiler's diagnostic stream.
//
// The goal-inspection wrapper emits a `trace "<marker>"` followed by
// `trace_state` for every open goal. Both surface as information messages;
// their `kind` depends on how the binary's message log records traces (the
// deployed build reports `[anonymous]`, newer logs tag `trace`), so the
// marker handshake is the discriminator: a message consisting solely of the
// marker arms the parser, and the next matching message is the goal state.

export interface LiveGoalDiagnostic {
  severity: string
  kind?: string
  message: string
}

export function liveGoalsFromDiagnostics(
  diagnostics: LiveGoalDiagnostic[],
  traceMarker: string,
): string[] {
  const goals: string[] = []
  let waitingForState = false

  for (const diagnostic of diagnostics) {
    if (diagnostic.severity !== 'information' && diagnostic.kind !== 'trace') continue
    const traceLines = diagnostic.message.trim().split('\n').map((line) => line.trim())
    if (traceLines.length > 0 && traceLines.every((line) => line === traceMarker)) {
      waitingForState = true
      continue
    }
    if (!waitingForState) continue
    waitingForState = false
    if (!diagnostic.message.includes('⊢')) continue

    const state = diagnostic.message.trim()
    const caseStarts = [...state.matchAll(/^case .+$/gm)].map((match) => match.index || 0)
    if (caseStarts.length <= 1) {
      goals.push(state)
      continue
    }
    for (let index = 0; index < caseStarts.length; index += 1) {
      const goal = state.slice(caseStarts[index], caseStarts[index + 1]).trim()
      if (goal.includes('⊢')) goals.push(goal)
    }
  }

  return [...new Set(goals)]
}
