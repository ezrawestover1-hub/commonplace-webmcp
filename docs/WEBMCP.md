# Commonplace WebMCP decision contract

Commonplace uses `document.modelContext.registerTool` to expose a small, decision-specific WebMCP contract. It does not ask an agent to guess from pixels or operate a generic canvas. It gives the agent the exact information and constrained actions needed to keep a launch decision fresh.

## The six browser-native tools

| Tool | Role | Side effect |
| --- | --- | --- |
| `get_decision_context` | Reads the decision, authority boundary, active proposal, evidence version, and blocker | Read-only |
| `get_evidence_changes` | Detects whether a human update invalidated an earlier proposal | Read-only |
| `get_evidence_objects` | Reads the current Beta evidence, launch decision, and signup blocker | Read-only; records the required evidence re-check |
| `get_decision_history` | Reads attributable history, including the human update that revoked a proposal | Read-only; records the required history re-check |
| `propose_decision_update` | Creates a cited, non-canonical decision proposal | Changes review state only |
| `request_human_confirmation` | Hands a fresh proposal to the human decision owner | Cannot confirm or alter canonical state |

Read tools are marked with `readOnlyHint`. All inputs use narrow JSON schemas. The human UI and the tools share the same action layer, so a tool cannot bypass freshness validation or human authority.

## Evidence Contract

Every proposal carries a human-readable contract:

```text
P-014
Grounded on: Beta feedback v4 — 42 responses

Human changes evidence

Beta feedback v5 — 68 responses, 9 critical onboarding regressions
Result: P-014 invalidated

Required agent path:
get_decision_history → get_evidence_objects → propose_decision_update

P-015 cites Beta feedback v5, the signup blocker, and the human update.
Only a human may confirm it.
```

If an agent skips either required read after the evidence changes, `propose_decision_update` rejects the replacement. The visible Evidence Contract changes from **Grounded on v4** to **Superseded by human update**, then **Re-grounded on v5**, and finally **Confirmed by human**.

## Example native agent path

```text
get_decision_context({})
  → reads the current authority boundary and P-014 grounded on Beta v4

human adds Beta v5
  → P-014 is invalidated

get_decision_history({})
get_evidence_objects({ objectIds: ["beta-feedback", "launch-date", "fix-signup"] })
propose_decision_update({ contractId: "P-015", ... })
  → creates a cited, non-canonical October 28 recommendation

request_human_confirmation({ contractId: "P-015", ... })
human confirms in the UI
  → October 28 becomes canonical and remains attributed to the human
```

## Trace provenance

The interface distinguishes:

- **Native WebMCP** — browser-supplied tool invocation.
- **Local demo** — deterministic walkthrough for explaining the flow.
- **Human** — evidence edits and authority-bearing confirmation.

This separation keeps the demo truthful while letting a judge inspect the same safety rule through a real browser-native tool path.
