# Commonplace

> **A freshness protocol for consequential AI decisions.**

Commonplace prevents agents from acting on superseded human reality. A person and an agent work on the same semantic decision context through the same action layer; when a person adds consequential new evidence, an earlier agent proposal becomes stale and cannot be accepted until the agent re-reads the changed evidence.

It was created for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/) during the August 25–September 3, 2026 submission period.

## Live demo

**[Open Commonplace](https://commonplace-webmcp.pages.dev/)** — the previous public HTTPS release. The focused Launch Decision Room in this checkout must be deployed and re-verified in ChatGPT’s in-app browser before this URL is submitted to judges.

The older Vercel URL, [`commonplace-webmcp-sigma.vercel.app`](https://commonplace-webmcp-sigma.vercel.app), is a prior release and must not be submitted as the current judge build. See [the release checklist](docs/SUBMISSION.md#release-checklist) before submitting any live URL.

## Why Commonplace

An AI agent can make a sensible recommendation and still make the wrong decision when a person changes the facts after the agent last looked. A visual interface and a hidden agent representation make it hard to know which evidence an agent used, what invalidated its plan, and when a decision became shared reality.

Commonplace makes the shared artifact canonical. A **human** can add evidence and confirm a decision. An **agent** can inspect the structured decision context and submit a reviewable proposal through WebMCP. Neither gets a separate copy of the workspace, and proposals cannot silently outrun later human evidence.

## The Freshness Protocol

The default screen is the **Project Aurora shared workspace**. It opens with a small decision canvas: the launch decision, Maya's Beta evidence, and agent proposal **P-014** grounded on Beta v4. The right drawer has **Context**, **Activity**, and **Agent plan** tabs, so a judge can inspect the selected record without losing the main story.

Select the amber **Update evidence** card, enter Maya's new feedback, and record it to create Beta v5 and pause P-014. The agent must then re-read the change and affected objects before it can create cited proposal P-015. The agent can request a confirmation; only Maya can make October 28 canonical.

For a concise walkthrough, select **Run proof**. The built-in, visibly local choreography takes about 12 seconds: new evidence appears, P-014 pauses, the re-grounding plan advances, P-015 appears, and the confirmation dialog makes the human authority boundary explicit.

Connection status is intentionally honest. When the browser exposes `document.modelContext.registerTool`, Commonplace reports the registered tool count. Native tool calls, local guided-preview steps, and human decisions are visibly distinguished in the trace. When the browser does not expose WebMCP, Commonplace says so rather than claiming an agent connection.

The resulting pattern is collaboration rather than autopilot:

1. The agent reads the current workspace semantically.
2. It reorganizes safe, authorized work or makes a reviewable proposal.
3. New human evidence makes any affected pending proposal stale.
4. The agent re-reads the same state and sends a replacement proposal.
5. The human alone confirms the canonical shared decision.

## The Project Aurora demo

The included workspace is a deliberately focused product-launch decision. It demonstrates:

- Structured evidence, a launch decision, and a blocked signup dependency.
- Attributable agent and human activity in one visible decision ledger.
- A pending launch-date recommendation that remains a human decision.
- An initial reviewable proposal to move the date from October 14 to October 21, followed by a fresh October 28 replacement after critical human evidence appears.
- Human acceptance that updates the real decision object and records provenance.
- An enforceable re-read rule before a stale proposal may be replaced.

## WebMCP implementation

The app registers six browser-native, decision-specific tools when `document.modelContext.registerTool` is available:

| Tool | Purpose | Side effect |
| --- | --- | --- |
| `get_decision_context` | Read the current launch decision, authority boundary, evidence version, and blocker | Read-only |
| `get_evidence_changes` | Detect whether later human evidence invalidated the proposal | Read-only |
| `get_evidence_objects` | Read the current evidence and dependent decision objects | Read-only; records evidence re-check |
| `get_decision_history` | Read the attributable change event | Read-only; records history re-check |
| `propose_decision_update` | Create a cited, non-canonical proposal | Changes review state only |
| `request_human_confirmation` | Hand a fresh proposal to the decision owner | Cannot change canonical state |

The tool definitions use narrow JSON schemas, mark read-only tools with `readOnlyHint`, and rely on the same canonical action functions as the human UI. A stale proposal cannot be replaced until the agent has called both `get_decision_history` and `get_evidence_objects`. Accepted proposals apply their structured operations only after the human accepts them.

See [docs/WEBMCP.md](docs/WEBMCP.md) for tool contracts and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the shared-state design.

## Run locally

Prerequisites: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the URL printed by Vite. For WebMCP tool discovery, use ChatGPT’s in-app browser or Chrome with WebMCP testing enabled. The normal human UI works even in browsers that do not yet expose `document.modelContext`.

```bash
pnpm test
pnpm run build
```

## Test it as a judge

1. Open the live app. The Project Aurora Launch Decision Room opens directly on a reviewable agent recommendation.
2. Select **Update beta evidence**, enter the critical feedback, and choose **Record update**. Confirm the proposal changes to **Stale — approval paused** and cannot be accepted.
3. In a WebMCP-enabled browser, use `get_decision_history`, then `get_evidence_objects`, then `propose_decision_update` for P-015. A proposal attempt before both reads must be rejected.
4. Open the **Activity** drawer tab to confirm native calls are distinct from human and local-demo events. The cited `October 14 → October 28` P-015 replacement should appear without changing the current decision.
5. Select **Confirm October 28**. Confirm the decision becomes canonical state and the UI says **Decision confirmed by human**.
6. Use **Reset proof** to repeat the complete protocol. Local walkthrough entries are labeled **Local demo** and are not presented as native calls.

## Design principles

- **One shared semantic state:** visual cards and agent-readable objects are the same entities.
- **Capabilities, not blanket access:** agent powers are explicit and enforced in the action layer.
- **Proposals before authority:** ambiguous or consequential changes are shown for human review.
- **Provenance as product UX:** the decision room and work ledger make human versus agent work visible.
- **Repeatable collaboration:** the deterministic proof can be reset to its exact starting state for inspection and demo recording.
- **No hidden chain-of-thought:** Commonplace displays concise operational explanations and changes, not private reasoning.

## Project structure

```text
src/
  actions.ts      Shared action layer used by human UI and WebMCP tools
  data.ts         Project Aurora seed workspace
  types.ts        Shared semantic object model
  webmcp.ts       Browser-native WebMCP registrations
  App.tsx         Launch Decision Room and human-agent proof flow
  styles.css      Product design system and responsive layout
docs/
  ARCHITECTURE.md Shared-state and security notes
  WEBMCP.md       Tool contracts
  QA.md           Local verification evidence and public-release gates
  SUBMISSION.md   Devpost copy, demo script, and delivery checklist
```

## License

[MIT](LICENSE)
