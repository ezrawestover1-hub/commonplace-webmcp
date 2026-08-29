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

### What people and agents can do together

The Project Aurora demo begins with a scattered launch plan. The agent organizes the same workspace into Product, Research, Marketing, and Operations, creates visible dependencies, and detects that the tentative October 14 launch conflicts with beta feedback. Rather than guessing, it proposes October 21 and waits. The person can accept, reject, or alter the proposal directly on the canvas. When the person accepts, the canonical decision changes, the activity timeline records human approval, and the agent can continue from that shared current state.

This is the experience that was difficult before: not a chat transcript that keeps regenerating a plan, but a persistent artifact where a person can point, edit, and decide while an agent can reliably understand and act on the same objects.

### How it was implemented

Commonplace is a React + TypeScript + Vite app. Every workspace object carries semantic type, position, relationship data, actor provenance, approval state, lock state, and version. The human interface and every WebMCP tool call invoke the same action layer. Read tools use `readOnlyHint`; mutation tools use narrow JSON schemas and validate permissions, locked state, and object IDs. Proposals are intentionally non-canonical until a human approves them; only then do their structured shared-state operations apply.

## Demo narration (about 2:05)

### 0:00–0:13 — Thesis

**On screen:** Commonplace landing page, then Open Project Aurora.

**Read aloud:** “For decades, websites have had interfaces for people and APIs for machines. Commonplace asks what happens when both work in the same place.”

### 0:13–0:35 — Shared workspace

**On screen:** Project Aurora canvas with its semantic groups, connections, and launch-date card.

**Read aloud:** “This is a product launch workspace. People can see and move the cards. An agent sees the exact same cards as structured semantic objects, including their type, relationships, provenance, approvals, and locks.”

### 0:35–0:55 — WebMCP work

**On screen:** Agent activity and the agent proposal.

**Read aloud:** “Through WebMCP, the agent inspected the workspace, organized its work into four areas, created dependencies, and discovered a conflict: beta feedback is too close to an October 14 launch. It does not silently change the plan. It makes a proposal.”

### 0:55–1:20 — Human authority

**On screen:** Proposal details; select Accept all; show Human confirmed and activity log.

**Read aloud:** “The person stays in control. Accepting the proposal moves the date to October 21 in the shared canonical state and records that a human approved it. The agent can now continue from this real decision, not an outdated chat response.”

### 1:20–1:40 — Permission boundary

**On screen:** Agent access modal; point out delete is off.

**Read aloud:** “Agent access is a set of explicit capabilities, not blanket autonomy. It can inspect, create, modify unlocked objects, reorganize, and connect. Delete is off. A human-locked brand object can be read but cannot be moved by the agent.”

### 1:40–1:52 — Generality

**On screen:** Select the **Research synthesis** workspace. Show claims, evidence, contradictions, and open questions.

**Read aloud:** “The same shared object model works beyond launch planning. Here, Commonplace lets an agent organize research into claims, evidence, contradictions, and unanswered questions without changing its semantic language.”

### 1:52–2:12 — Closing

**On screen:** Reset demo, run collaboration, activity becomes Waiting on you; return to landing or present mode.

**Read aloud:** “Commonplace turns agent safety and accountability into visible product experience. Agents should not merely operate websites from the outside. They should collaborate inside them.”

## Release checklist

- [x] Add the deployed HTTPS URL to Devpost.
- [x] Add the public GitHub/GitLab/Bitbucket repository URL to Devpost.
- [x] Confirm the MIT license badge is visible on the public repository page.
- [ ] Upload the completed narrated demo as a public YouTube video, then add its URL.
- [ ] Test the deployed URL in ChatGPT’s in-app browser or Chrome with WebMCP testing enabled.
- [ ] Save the Devpost submission before September 3, 2026 at 1:00 PM Pacific.
- [ ] After the deadline, do not modify the submitted repo, live URL, video, or Devpost entry during judging.
