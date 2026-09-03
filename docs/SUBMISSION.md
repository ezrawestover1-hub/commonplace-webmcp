# WebMCP Challenge submission package

## Live URL

https://commonplace-webmcp.pages.dev/ — previous release; deploy and re-verify the focused shared workspace before submission.

## Devpost tagline

**A freshness protocol where people prevent WebMCP agents from acting on superseded reality.**

## Project description

Commonplace is a focused shared workspace for product leads and release managers who coordinate launches across changing customer evidence, blockers, and human approvals.

Humans add consequential evidence and retain the right to confirm decisions. Agents work through WebMCP: they inspect structured objects, read attributable history, and submit reviewable recommendations. Both interact with the same semantic objects and the same shared action layer. This prevents a team from approving a launch plan that became unsafe after an agent last reviewed the facts.

### Why WebMCP is essential

Without WebMCP, an agent would have to infer the decision from pixels or maintain a second, drifting representation. Commonplace exposes a decision-specific contract instead: `get_decision_history`, `get_evidence_objects`, and `propose_decision_update` form the core judge-visible re-grounding path, while `get_decision_context`, `get_evidence_changes`, and `request_human_confirmation` make authority and freshness explicit.

The result is more reliable, permissionable, testable, and understandable. The agent can understand which beta evidence changed, that it invalidates an earlier launch recommendation, and that it must create a reviewable replacement rather than silently changing an unresolved decision.

Commonplace treats a new human update as an operational event. P-014 is grounded on Beta v4; when Maya adds critical onboarding regressions in Beta v5, P-014 visibly pauses and cannot be accepted. The agent must re-read the decision history and affected evidence before it can send P-015. The Context, Activity, and Agent plan drawer makes the evidence version, invalidation, citations, and final human authority inspectable without competing with the canvas.

### What people and agents can do together

The Project Aurora demo begins with a shared launch decision. The agent reads structured history, the launch date, human Beta feedback, and the blocked signup task. It creates a reviewable October 21 proposal, but the canonical launch date remains untouched. The person then enters and records critical beta evidence, which makes that earlier proposal stale. Only after a re-read can the agent create a fresh October 28 proposal; only when the person confirms does the canonical decision change.

This is the experience that was difficult before: not a chat transcript that keeps regenerating a plan, but a persistent artifact where a person can point, edit, and decide while an agent can reliably understand and act on the same objects.

### How it was implemented

Commonplace is a React + TypeScript + Vite app. Every workspace object carries semantic type, position, relationship data, actor provenance, approval state, lock state, and version. The human interface and every WebMCP tool call invoke the same action layer. Read tools use `readOnlyHint`; mutation tools use narrow JSON schemas and validate permissions, locked state, and object IDs. Proposals are intentionally non-canonical until a human approves them; only then do their structured shared-state operations apply.

### Devpost testing note

The previous public release was tested in **ChatGPT's in-app browser** at `https://commonplace-webmcp.pages.dev/`. The focused shared workspace has now been verified locally with six decision-specific tools, including a native early-proposal rejection followed by `get_decision_history` → `get_evidence_objects` → `propose_decision_update` → `request_human_confirmation`. **Before submission, deploy this exact revision and repeat that native browser test on the public URL.**

## Demo recording source of truth

The recording must show this exact shared workspace, the human entering and recording evidence, P-014 pausing, and the visible native re-grounding sequence: `get_decision_history` → `get_evidence_objects` → `propose_decision_update` → `request_human_confirmation`. Do not submit older canvas or silent-highlight montages; they no longer represent the product.

## Release checklist

- [ ] Deploy the focused shared workspace to `https://commonplace-webmcp.pages.dev/` and confirm the public URL serves the exact submitted revision.
- [ ] Re-verify that the deployed focused release exposes all six decision-specific WebMCP tools in ChatGPT’s in-app browser.
- [ ] Re-verify a native browser run rejects a stale replacement, then accepts `get_decision_history` → `get_evidence_objects` → `propose_decision_update` as the re-grounding path.
- [x] Confirm the public GitHub/GitLab/Bitbucket repository has a visible open-source license.
- [ ] Record a new focused demo with audible narration. Do not use the older silent-highlight master.
- [ ] Upload the approved demo as a public YouTube video, then add its URL.
- [ ] Add the public live URL, public repo URL, public video URL, and truthful client-testing note to Devpost.
- [ ] Save the Devpost submission before September 3, 2026 at 1:00 PM Pacific.
- [ ] After the deadline, do not modify the submitted repo, live URL, video, or Devpost entry during judging.
