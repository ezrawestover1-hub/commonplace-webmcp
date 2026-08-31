# WebMCP Challenge submission package

## Live URL

https://commonplace-webmcp-sigma.vercel.app

## Devpost tagline

**A shared visual workspace where people use the interface and agents use WebMCP—on the exact same work.**

## Project description

Commonplace is a visual workspace designed from the beginning for two first-class participants: humans and AI agents.

Humans work through a calm graphical canvas: they click, drag, write, connect, lock, approve, and rearrange. Agents work through WebMCP: they inspect structured objects, search the workspace, create and update tasks, move, group, and transform objects, create meaningful relationships, propose changes, and request human decisions. Both interact with the same semantic objects and the same shared action layer.

### Why WebMCP is essential

Without WebMCP, an agent would have to infer the canvas from pixels and imitate interface clicks, or the app would need a separate hidden API with a separate representation of the project. Commonplace exposes a small vocabulary of meaningful workspace capabilities instead: `inspect_workspace`, `search_objects`, `get_objects`, `create_objects`, `update_objects`, `move_objects`, `group_objects`, `transform_objects`, `connect_objects`, `propose_changes`, `request_human_decision`, and `get_history`.

The result is more reliable, permissionable, testable, and understandable. The agent can understand that a relationship is a `blocks` dependency instead of guessing what an arrow means; it can understand that an object is locked by a human instead of accidentally moving it; and it can create a reviewable proposal instead of silently changing an unresolved decision.

Commonplace also treats new human evidence as a real collaboration event. If a person changes Beta feedback after an agent proposes a date, the proposal becomes stale and cannot be accepted. The agent must re-read the shared history and affected objects before it can send a replacement proposal. This is the central promise of the product: the human and agent do not maintain separate, drifting versions of the plan.

### What people and agents can do together

The Project Aurora demo begins with a shared launch decision. The agent reads structured history, the launch date, human Beta feedback, and the blocked signup task. It creates a reviewable October 28 proposal, but the canonical launch date remains untouched. The person can accept, reject, or alter the proposal directly on the canvas. When the person accepts, the canonical decision changes, the inspector confirms the human decision, and the agent can continue from that shared current state.

This is the experience that was difficult before: not a chat transcript that keeps regenerating a plan, but a persistent artifact where a person can point, edit, and decide while an agent can reliably understand and act on the same objects.

### How it was implemented

Commonplace is a React + TypeScript + Vite app. Every workspace object carries semantic type, position, relationship data, actor provenance, approval state, lock state, and version. The human interface and every WebMCP tool call invoke the same action layer. Read tools use `readOnlyHint`; mutation tools use narrow JSON schemas and validate permissions, locked state, and object IDs. Proposals are intentionally non-canonical until a human approves them; only then do their structured shared-state operations apply.

## Demo narration (target: 1:35)

### 0:00–0:10 — Thesis

**On screen:** Commonplace landing page, then Open Project Aurora.

**Read aloud:** “For decades, websites have had interfaces for people and APIs for machines. Commonplace asks what happens when both work in the same place.”

### 0:10–0:20 — Shared workspace

**On screen:** Project Aurora canvas with its semantic groups, connections, and launch-date card.

**Read aloud:** “This is a product launch workspace. People can see and move the cards. An agent sees the exact same cards as structured semantic objects, including their type, relationships, provenance, approvals, and locks.”

### 0:20–0:38 — Native WebMCP work

**On screen:** In ChatGPT’s in-app browser or Chrome with WebMCP enabled, issue the native-agent prompt; show `get_history` and `get_objects` in the **Native WebMCP** trace.

**Read aloud:** “The agent uses explicit WebMCP tools, not guessed clicks. It reads the attributable history and the exact structured objects that matter: the launch date, beta evidence, and blocked signup work.”

### 0:38–0:52 — Proposal, not autopilot

**On screen:** Native `propose_changes` call and the `October 14 → October 28` proposal.

**Read aloud:** “The proposal is visible, but the shared date has not changed. The agent can recommend; it cannot quietly commit team reality.”

### 0:52–1:10 — Fresh human evidence

**On screen:** Add critical Beta evidence. Show the stale-proposal state, then the re-check trace and replacement proposal.

**Read aloud:** “Now the person adds nine critical onboarding regressions. The old proposal immediately freezes. Before recommending again, an agent must re-read the changed evidence and affected decision.”

### 1:10–1:24 — Human authority becomes canonical state

**On screen:** Click **Accept all**. Show `Decision confirmed by human`, October 28, linked objects, and retained shared history.

**Read aloud:** “Only the person commits the shared decision. Commonplace records that authority, keeps the evidence attached, and leaves the relationship graph intact.”

### 1:24–1:35 — Closing

**On screen:** Show the provenance legend and the separate play block.

**Read aloud:** “Commonplace turns safety and accountability into product behavior. People and agents work in one shared artifact, with clear provenance and human authority over what becomes true.”

## Release checklist

- [x] Confirm `https://commonplace-webmcp.pages.dev/` serves the current five-second proof, provenance labels, human-confirmation panel, `Origin-Agent-Cluster`, and `Permissions-Policy: tools=(self)` headers.
- [x] Verify the public judge URL exposes all 12 WebMCP tools in ChatGPT’s in-app browser.
- [x] Verify a native browser run can call `get_history`, `get_objects`, and `propose_changes`, leaving a human-reviewable proposal.
- [x] Confirm the public GitHub/GitLab/Bitbucket repository has a visible open-source license.
- [ ] Record the revised 1:35 narrated demo from the verified native-agent run and upload it publicly to YouTube.
- [ ] Add the public live URL, public repo URL, public video URL, and truthful client-testing note to Devpost.
- [ ] Save the Devpost submission before September 3, 2026 at 1:00 PM Pacific.
- [ ] After the deadline, do not modify the submitted repo, live URL, video, or Devpost entry during judging.
