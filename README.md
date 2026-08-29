# Commonplace

> **One place for humans and agents to work together.**

Commonplace is a shared visual workspace where people use a canvas and agents use WebMCP. Both collaborate on the same semantic objects, through the same action layer, with shared permissions, attribution, reviewable proposals, and human decision points.

It was created for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/) during the August 25–September 3, 2026 submission period.

## Why Commonplace

Most web apps have a visual interface for people and a separate API for software. That forces an agent to either guess its way through pixels or maintain a parallel representation of the work.

Commonplace makes the shared artifact canonical. A **human** can click, drag, edit, connect, decide, and lock objects. An **agent** can inspect, search, create, update, move, connect, propose, and request a decision through WebMCP. Neither gets a separate copy of the workspace.

The resulting pattern is collaboration rather than autopilot:

1. The agent reads the current workspace semantically.
2. It reorganizes safe, authorized work or makes a reviewable proposal.
3. The human changes the canvas or confirms/rejects a decision.
4. The agent re-reads the same state and continues from the human’s change.

## The Project Aurora demo

The included workspace is a deliberately messy product-launch plan. It demonstrates:

- Semantic groups for Product, Research, Marketing, and Operations.
- Agent-created dependencies that are visible as canvas connections.
- A low-confidence launch-date assumption that becomes a human decision.
- A proposal to move the date from October 14 to October 21 without silently changing canonical state.
- Human acceptance that updates the real decision object and records provenance.
- A locked brand-identity object: agents can read it but cannot move or modify it.

## WebMCP implementation

The app registers these browser-native tools when `document.modelContext.registerTool` is available:

| Tool | Purpose | Side effect |
| --- | --- | --- |
| `inspect_workspace` | Read metadata, groups, selection, permissions, and status | Read-only |
| `search_objects` | Find objects by text, type, status, or group | Read-only |
| `get_objects` | Retrieve structured objects and relevant relationships | Read-only |
| `create_objects` | Create notes, tasks, decisions, groups, or headings | Changes shared state |
| `update_objects` | Update permitted, unlocked objects | Changes shared state |
| `move_objects` | Move permitted, unlocked objects on the canvas | Changes shared state |
| `connect_objects` | Create semantic relationships | Changes shared state |
| `propose_changes` | Create a human-reviewable non-canonical proposal | Changes review state only |
| `request_human_decision` | Surface uncertainty instead of guessing | Changes decision state only |
| `get_history` | Read attributable activity history | Read-only |

The tool definitions use narrow JSON schemas, mark read-only tools with `readOnlyHint`, return concise structured results, and rely on the same canonical action functions as the human UI. This is important: the WebMCP layer does **not** bypass UI validation or permissions.

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

1. Open the live app and select **Open Project Aurora**.
2. Inspect the shared workspace. The right panel starts with a proposal, not an autonomous mutation.
3. Select **Accept all**. Confirm that `Launch date` becomes `October 21`, the state becomes **Human confirmed**, and the activity timeline records the human action.
4. Select **View agent access**. Confirm that delete access is off while read, create, modify, reorganize, and connect are explicit capabilities.
5. Select **Reset demo**, then **Run agent collaboration**. Confirm that the agent status becomes **Waiting on you** and the activity log records the deliberate handoff.
6. In a WebMCP-enabled browser, ask the agent to call `inspect_workspace`, then `get_objects` for `launch-date` and `brand`. The returned object data exposes the unresolved decision and locked human object. Ask it to move `brand`; the tool rejects the action because it is human-locked.

## Design principles

- **One shared semantic state:** visual cards and agent-readable objects are the same entities.
- **Capabilities, not blanket access:** agent powers are explicit and enforced in the action layer.
- **Proposals before authority:** ambiguous or consequential changes are shown for human review.
- **Provenance as product UX:** the canvas and timeline make human versus agent work visible.
- **No hidden chain-of-thought:** Commonplace displays concise operational explanations and changes, not private reasoning.

## Project structure

```text
src/
  actions.ts      Shared action layer used by human UI and WebMCP tools
  data.ts         Project Aurora seed workspace
  types.ts        Shared semantic object model
  webmcp.ts       Browser-native WebMCP registrations
  App.tsx         Landing page, workspace, canvas, inspector, and flows
  styles.css      Product design system and responsive layout
docs/
  ARCHITECTURE.md Shared-state and security notes
  WEBMCP.md       Tool contracts
  SUBMISSION.md   Devpost copy, demo script, and delivery checklist
```

## License

[MIT](LICENSE)
