# Commonplace

## One-line Summary

Commonplace prevents AI teammates from acting on superseded human reality.

## Problem

An AI agent can make a sensible recommendation and still make the wrong decision when a person changes the facts after the agent last looked. That failure is hard to see when a visual workspace and an agent's representation of the work drift apart.

## Solution

Commonplace is for product leads and release managers coordinating launches across changing customer evidence, blockers, and human approvals. A launch recommendation can become unsafe in the hour between an agent’s review and a person’s new evidence. The shared workspace makes that risk visible: a person can add evidence and confirm the outcome, while an agent can inspect attributable structured objects, read history, and submit a reviewable recommendation through browser-native WebMCP tools. Consequential human and agent decision transitions use the same canonical action layer.

The central Project Aurora proof is deliberately consequential: an agent proposes moving a launch date; a person adds nine critical onboarding regressions; the original proposal immediately becomes stale and cannot be accepted; the agent must re-read the affected evidence before sending an October 28 replacement; and only a person can accept the final change into canonical state.

## Why This Matters

WebMCP is a strong fit because a consequential decision is not just pixels. It contains attributable evidence, dependencies, proposals, approval state, and a current human authority boundary. Without WebMCP, an agent would need to guess from the interface or rely on a second hidden representation. Commonplace exposes a small, explicit vocabulary of the decision surface instead.

This creates a better experience because fresh human evidence has teeth. The user can see exactly what the agent read, what later human action revoked its authority, and when the person—not the agent—committed the new decision.

## How We Used AI

The product's AI-facing capability is WebMCP. In a WebMCP-enabled browser, Commonplace registers six structured browser-native decision tools:

- `get_decision_context`, `get_evidence_changes`, `get_evidence_objects`, and `get_decision_history` for grounded reading.
- `propose_decision_update` for cited, reviewable recommendations.
- `request_human_confirmation` for an explicit authority handoff that cannot change the decision.

Read tools are marked with `readOnlyHint`. Mutation inputs use narrow JSON schemas, and the shared action layer validates permissions, locks, object IDs, and proposal freshness. A proposal is intentionally non-canonical until a person accepts it.

## How We Used Codex

Codex was used as a development collaborator to implement and refine the React/TypeScript application, design the shared action and WebMCP tool layers, add automated tests, build and inspect the production artifact, verify browser-native WebMCP registrations locally, and prepare the written and local demo materials. The project owner made the product and submission decisions; this draft distinguishes verified native WebMCP activity from the in-product local preview. The focused public deployment still requires its own verification before submission.

## Key Features

- A focused shared decision workspace: the decision, human evidence, and agent proposal remain visible together.
- One contextual drawer with Context, Activity, and Agent plan tabs instead of competing panels.
- Visible provenance in the agent ledger: `Native WebMCP`, `Human`, and `Local demo` are distinct.
- A freshness proof loop showing stale evidence invalidation, agent re-grounding, a replacement proposal, and a human-only commit.
- A permission model with explicit capabilities and locked objects that agents may read but cannot change.
- Reviewable, non-canonical proposals whose structured operations apply only after human acceptance.

## Architecture

Commonplace is a React + TypeScript + Vite web application. `src/webmcp.ts` registers browser-native `document.modelContext.registerTool` tools when the browser supports WebMCP. `src/actions.ts` is the shared action layer used by both the human UI and tool execution, so tool calls do not bypass normal validation. Workspace objects retain semantic type, position, relationships, provenance, approval state, locks, and version information. The Cloudflare Pages deployment sends `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`.

## Testing Instructions

Open https://commonplace-webmcp.pages.dev/ in ChatGPT's in-app browser or Google Chrome with WebMCP enabled. No login or credentials are required.

1. Select the amber **Update evidence** card, enter the critical feedback in the visible drawer editor, choose **Record update**, and confirm the original proposal changes to **P-014 paused**.
2. In a WebMCP-enabled browser, call `get_decision_history`, then `get_evidence_objects`, then `propose_decision_update` for P-015; confirm a cited `October 14 → October 28` proposal appears.
3. Select **Confirm October 28** and confirm that the decision becomes canonical state and the UI says **Decision confirmed by human**.
4. In a WebMCP-enabled browser, use: “Review the Aurora launch risks. Read the relevant evidence and propose a safe next launch date. Do not change shared state without my approval.”
5. Open the **Activity** drawer tab and confirm native calls are distinct from human and local-demo events. Confirm the launch date remains unchanged until the human accepts the proposal.

Local verification for this focused release: ChatGPT's in-app browser registered all six tools; a native run rejected an early stale P-015, then invoked `get_decision_history`, `get_evidence_objects`, and `propose_decision_update` to create a cited P-015; `request_human_confirmation` returned `human_required`. The timed local proof also reached the visible human confirmation dialog. Re-run this exact proof on the deployed URL before submitting. See `docs/QA.md` for the evidence boundary.

## Public Demo Link

https://commonplace-webmcp.pages.dev/

## Public Repository Link

https://github.com/ezrawestover1-hub/commonplace-webmcp

The repository is public and includes the MIT License, source, and run/test instructions.

## Demo Video

Public YouTube demo with narration: https://youtu.be/QhVMGBrT3gU

Proposed title: **Commonplace — Shared Reality for Humans and WebMCP Agents**

## Screenshot Shot List

Local source images: `work/commonplace-demo/screenshots/`. Re-capture these three states from the verified public URL before uploading to Devpost.

1. Calm shared workspace: P-014 grounded on Beta v4, the amber evidence card, and the Context drawer.
2. Paused proposal: Beta v5 has changed and P-014 is visibly paused.
3. Agent plan: each re-grounding step, with the Activity tab showing the attributable agent/human sequence.
4. Replacement proposal: cited P-015, re-grounded on Beta v5 and still pending human review.
5. Confirmation outcome: the dialog shows that October 28 becomes canonical only when Maya confirms.

## Submission Readiness Notes

- Live judge URL: previous public release only; deploy and re-verify the focused release before submission.
- Native WebMCP proof: verified locally in ChatGPT's in-app browser; repeat on the focused public URL before submission.
- Public repository and MIT license: verified.
- Written description and testing instructions: ready, aligned to the current official requirements and criteria.
- Public YouTube video: verified as supplied by the project owner: https://youtu.be/QhVMGBrT3gU
- Alignment blocker: the public GitHub repository and judge URL must be updated and re-verified against the focused six-tool current build before any Devpost write. The public README presently describes an earlier, broader implementation.
- Deadline from the live Devpost data: September 3, 2026 at 1:00 PM Pacific.

## Known Limitations

- The current workspace is a high-fidelity single-user browser experience; it does not implement multi-user synchronization or server-backed persistence.
- Browser-native WebMCP availability depends on a supported client; the normal human UI remains usable in unsupported browsers.
- The local preview is intentionally deterministic and visibly labeled; it is not presented as a live agent run.

## TODO Official Form Fields

The following are live Devpost form fields and need final owner confirmation before any Devpost write:

| Field | Draft value / required decision |
| --- | --- |
| Submitter Type | **TODO: confirm** `Individual`, `Team of Individuals`, or `Organization`. |
| Country of residence | **TODO: confirm** the correct eligible country for every applicable participant. |
| Organization name | Leave blank unless submitting for an organization. |
| App Status | `New` — Commonplace was created for the August 25–September 3, 2026 submission period. **TODO: confirm.** |
| Existing-project explanation | Not applicable if App Status is `New`. |
| Live URL | `https://commonplace-webmcp.pages.dev/` |
| Testing instructions | Use the Testing Instructions section above; no credentials required. |
| Public code repo | `https://github.com/ezrawestover1-hub/commonplace-webmcp` |
| Tested WebMCP client(s) | `ChatGPT's in-app browser (native browser-side WebMCP tools verified).` |
| AI tools leveraged | `Codex for development, debugging, testing, and submission-material drafting; WebMCP as the product's agent-facing browser capability.` **TODO: amend if other tools should be disclosed.** |
| Learning level | **TODO: owner selection** — `Moderate` or `Significant`. |
| Career AI value | **TODO: owner selection** — `Yes` or `No`. |

No Devpost entry has been created or updated by this draft.
