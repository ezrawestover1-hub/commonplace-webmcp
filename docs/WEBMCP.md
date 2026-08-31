# Commonplace WebMCP tool contracts

Commonplace uses the browser-native `document.modelContext.registerTool` API. Registration is feature-detected so the conventional human interface continues to work in unsupported browsers.

The status indicator is intentionally conservative: it shows **WebMCP live** only after every registration promise resolves. If the browser does not expose WebMCP, or a tool fails to register, the interface says so rather than implying an agent connection exists.

The production deployment opts into an origin agent cluster and limits the `tools` Permissions Policy to the same origin, aligning with WebMCP's current document-isolation and permissions requirements.

## Read-only tools

### `inspect_workspace`

Returns the workspace name, object count, selected object, group names, permission map, and agent status. Use it first to learn the semantic environment.

### `search_objects`

Accepts optional `query`, `type`, `groupId`, and `status` filters. Returns matching structured objects, capped at 25.

### `get_objects`

Accepts optional object IDs and returns detailed object records plus relationships touching those objects. It is the safe way to inspect locks, ownership, confidence, approvals, and dependencies.

### `get_history`

Returns attributable activity events. The agent should use this after a human changes the canvas instead of assuming that a prior plan is still authoritative.

## Mutation tools

### `create_objects`

Creates up to 20 semantic notes, tasks, decisions, groups, or headings. The agent needs create permission.

### `update_objects`

Updates permitted, unlocked objects. It accepts only title, content, status, priority, and confidence fields—never arbitrary property injection.

### `move_objects`

Moves up to 40 permitted, unlocked objects to explicit canvas coordinates. This is a semantic layout action, not GUI automation.

### `group_objects`

Assigns one or more existing unlocked objects to an existing semantic group. The card placement visible to people and the `groupId` readable by agents change through the same action.

### `transform_objects`

Changes an unlocked object's semantic type—for example, a note to a task or decision. The human-visible card, inspector, and agent-readable object remain in sync.

### `connect_objects`

Creates a `depends_on`, `supports`, `blocks`, or `related_to` relationship after validating both IDs.

### `propose_changes`

Creates a human-visible proposal with a reason, affected objects, confidence, and a concise list of proposed changes. A proposal can include structured update, move, group, and transform operations, but none commit to canonical state until the human accepts.

### `request_human_decision`

Creates or updates a decision with an explicit prompt and options. This lets the agent surface uncertainty rather than fabricate a resolution.

## Example native agent path

```text
get_history({ objectIds: ["beta-feedback", "launch-date"] })
  → read the attributable history before relying on a prior launch recommendation

get_objects({ objectIds: ["beta-feedback", "launch-date", "fix-signup"] })
  → read fresh human evidence, the unresolved decision, and its blocked dependency

propose_changes({ ... October 14 → October 28 ... })
  → shared workspace displays a reviewable proposal; canonical date is unchanged

human accepts in the UI
  → structured operations update the canonical decision and attribute the commit to the human
```

This loop is the point of the app: human and agent continuously work on one persistent artifact.

## Evidence freshness rule

When a human edits evidence that an active proposal relied on, Commonplace marks that proposal **stale** and disables acceptance. An agent must re-read `get_history` and `get_objects` before submitting a replacement `propose_changes` call. This makes the human edit consequential: it cannot be silently overwritten or accepted against outdated reasoning.

## Trace provenance

The interface records the origin of every visible trace entry:

- **Native WebMCP** — a tool invocation supplied by the browser’s WebMCP capability.
- **Local preview** — the deterministic in-product walkthrough used when a judge wants to understand the behavior without an external agent prompt.
- **Human** — an edit, acceptance, or other authority-bearing UI decision.

This prevents a guided demo from being mistaken for a live agent run while still making the safety rule easy to inspect.
