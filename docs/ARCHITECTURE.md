# Commonplace architecture

## The invariant

Commonplace has a single canonical `WorkspaceState`. It stores object semantics, positions, relationships, provenance, approval state, permissions, and activity events.

```text
                       WorkspaceState
                             │
                       shared actions
            ┌────────────────┴────────────────┐
            │                                 │
       Human interface                    WebMCP tools
   update evidence, accept              inspect, re-read,
      select, review                       propose, request
```

The consequential decision transitions never maintain a separate agent representation. Human evidence edits and human acceptance, as well as WebMCP reads and proposal creation, invoke `workspaceActions`. Canvas dragging is intentionally presentational in this focused demo: it helps a person arrange their view but does not claim to persist or mutate the decision model.

## Semantic objects

All objects carry an ID, type, title/content, canvas location, semantic properties, actor attribution, approval state, lock state, and version. Relationships are structured `Connection` records—not decorative lines.

The initial object vocabulary is deliberately small: `note`, `task`, `decision`, `group`, and `heading`. This is sufficient to show a real shared-language model without pretending to be a complete project-management suite.

## Actor model and provenance

Each action is marked `human`, `agent`, or `system`. Mutations update `modifiedBy` and append an `ActivityEvent`. This drives the visible timeline and makes it possible for an agent to retrieve concise history rather than inventing memory.

## Shared authority

Agent permissions are explicit: `read`, `create`, `modify`, `reorganize`, `connect`, and `delete`. Tool handlers cannot bypass the action layer. For example, a human-locked object is readable but an agent move/update produces a structured error.

`propose_changes` is intentionally different from a commit: it places a proposal into a review state, marks the agent as waiting, and leaves canonical object data unchanged. The human acceptance action performs the actual state transition and attributes it to the human.

## Security boundaries

This demo contains no account data or external writes, but its tool design follows the WebMCP secure-tools guidance:

- Narrow input schemas; no generic database or code-execution tool.
- Read-only annotations on retrieval tools.
- Explicitly described side effects on mutation tools.
- Tool calls validate object existence, permissions, and locks.
- No raw untrusted user text is framed as an instruction in tool results.
- Destructive deletion remains disabled in the demo workspace.

For a production multi-user version, these checks would run server-side as well, scoped to the authenticated workspace and user/agent delegation grant.
