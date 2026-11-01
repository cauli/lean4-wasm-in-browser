// The infoview, after the one in Lean's editors: the goals at the cursor, the
// type expected there, and Lean's messages about the cursor's line.
import type { LeanGoal, LeanInfo } from './lean-services'
import { grouped, failureSummary, type Suggestion } from './suggestions'

export interface InfoMessage {
  severity: string
  data: string
  pos: { line: number; column: number }
}

// How many suggestions a message shows before folding the rest.
const SHOWN_SUGGESTIONS = 3

interface Props {
  /** The cursor's 1-based line, or null before the editor reports one. */
  line: number | null
  /** What Lean has at the cursor; null when Lean has nothing there. */
  info: LeanInfo | null
  messages: InfoMessage[]
  /** Shown instead when Lean cannot answer yet, and why. */
  note?: string
  /** Put a suggestion in place of the search tactic Lean's message is about. */
  onApply?: (message: InfoMessage, suggestion: Suggestion) => void
}

function Goal({ goal, hyps = true }: { goal: LeanGoal; hyps?: boolean }) {
  return (
    <div className="iv-goal">
      {goal.name && <div className="iv-case">case {goal.name}</div>}
      {hyps && goal.hyps.map((h, i) => (
        <div key={i} className="iv-hyp">
          <span className="iv-names">{h.names.join(' ')}</span> : {h.type}
          {h.value != null && <> := {h.value}</>}
        </div>
      ))}
      <div className={hyps && goal.hyps.length ? 'iv-target iv-target-rule' : 'iv-target'}>
        <span className="iv-turnstile">⊢</span> {goal.target}
      </div>
    </div>
  )
}

// A "Try this" message: each suggestion is a link that puts it in place of
// the search, as Lean's editors do.
function Suggestions({ message, offered, onApply }: {
  message: InfoMessage
  offered: Suggestion[]
  onApply?: Props['onApply']
}) {
  const item = (s: Suggestion, i: number) => (
    <div key={i} className="iv-suggestion">
      <button type="button" className="iv-apply" title="Put this in place of the search" onClick={() => onApply?.(message, s)}>
        {s.text}
      </button>
      {s.notes.map((note, j) => <pre key={j} className="iv-suggestion-note">{note}</pre>)}
    </div>
  )
  const more = offered.slice(SHOWN_SUGGESTIONS)
  return (
    <div className="iv-message iv-message-information">
      <div>{offered.length > 1 ? 'Try these:' : 'Try this:'}</div>
      {offered.slice(0, SHOWN_SUGGESTIONS).map(item)}
      {more.length > 0 && (
        <details className="iv-more">
          <summary>{more.length} more</summary>
          {more.map((s, i) => item(s, SHOWN_SUGGESTIONS + i))}
        </details>
      )}
    </div>
  )
}

export function InfoView({ line, info, messages, note, onApply }: Props) {
  if (note) return <div className="infoview"><p className="iv-note">{note}</p></div>
  const goals = info?.goals ?? null
  const term = info?.termGoal ?? null
  // Inside a tactic proof the hypotheses are shown with the goals, and the
  // expected type is often the goal itself.
  const showTerm = term && !(goals?.length && goals[0].target === term.target)
  const failed = messages.some((m) => m.severity === 'error')
  return (
    <div className="infoview">
      {goals && (
        <section>
          <div className="iv-title">
            {goals.length ? `${goals.length} goal${goals.length > 1 ? 's' : ''}` : 'No goals'}
          </div>
          {goals.map((g, i) => <Goal key={i} goal={g} />)}
          {/* After a failed step Lean gives up on its goal, so none are left
              there, but the proof is not done. */}
          {!goals.length && !failed && <p className="iv-done">Goals accomplished!</p>}
        </section>
      )}
      {showTerm && (
        <section>
          <div className="iv-title">Expected type</div>
          <Goal goal={term} hyps={!goals} />
        </section>
      )}
      {messages.length > 0 && (
        <section>
          <div className="iv-title">Messages{line ? ` · line ${line}` : ''}</div>
          {grouped(messages).map((entry, i) => 'failed' in entry ? (
            <details key={i} className="iv-more iv-failed">
              <summary>{failureSummary(entry.failed, entry.messages.length)}</summary>
              {entry.messages.map((m, j) => <pre key={j} className="iv-message iv-message-information">{m.data}</pre>)}
            </details>
          ) : entry.offered ? (
            <Suggestions key={i} message={entry.message} offered={entry.offered} onApply={onApply} />
          ) : (
            <pre key={i} className={`iv-message iv-message-${entry.message.severity}`}>{entry.message.data}</pre>
          ))}
        </section>
      )}
      {!goals && !showTerm && !messages.length && (
        <p className="iv-note">Put the cursor in a proof to see its goals here.</p>
      )}
    </div>
  )
}
