# Commonplace — final Devpost field checklist

This is a fill-in checklist for the official WebMCP Challenge submission form. It is based on the live Devpost form fetched September 2, 2026. Do not submit until the current focused build is deployed and publicly verified.

## Required form fields

| Devpost field | What to enter | Status |
| --- | --- | --- |
| Submitter Type | Choose the truthful option: `Individual`, `Team of Individuals`, or `Organization`. | User decision required |
| Country of residence | Select the actual residence country for every applicable submitter. | User decision required |
| App Status | `Existing` if Commonplace existed before this challenge; otherwise `New`. | User decision required |
| Existing-project explanation | If `Existing`, explain the meaningful WebMCP-focused work completed during the submission period: the focused Launch Decision Room, versioned Evidence Contract, six decision-specific native tools, stale-proposal lock, editable human evidence update, and refreshed demo package. | Ready to paste if needed |
| Live URL | `https://commonplace-webmcp.pages.dev/` **only after** it serves the current focused build and public WebMCP proof has passed. | Pending public deployment |
| Public code repository | `https://github.com/ezrawestover1-hub/commonplace-webmcp` | Verify current revision is pushed |
| Tested agents / clients | `ChatGPT’s in-app browser with native WebMCP tool discovery. The local focused build registered get_decision_context, get_evidence_changes, get_evidence_objects, get_decision_history, propose_decision_update, and request_human_confirmation. Re-run this exact check on the deployed URL before submitting.` | Ready after public re-test |
| AI tools leveraged | `Codex was used to implement and refine the React/TypeScript application, WebMCP tool contract, automated tests, build verification, product copy, and demo materials. WebMCP is the product capability exposed to browser agents.` | Ready to paste |
| Learning level | Choose the truthful option: `None`, `Moderate`, or `Significant`. | User decision required |
| Career AI value | Choose `Yes` or `No` truthfully. | User decision required |

## Required submission artifacts

- **Hosted app:** the current focused build must be reachable by judges in ChatGPT’s in-app browser or Chrome with WebMCP enabled.
- **Public repository:** source, assets, instructions, and visible open-source license must be publicly available.
- **Public video:** a clear YouTube video under three minutes with audible narration demonstrating the working product and explaining WebMCP.
- **Project description:** use [SUBMISSION.md](./SUBMISSION.md) and [devpost-submission.md](../devpost-submission.md) as the source of truth.

## Public verification before pressing Submit

1. Confirm the deployed page says **Native WebMCP · 6 tools ready**.
2. Confirm all six decision-specific tools are exposed.
3. Record a custom human evidence update, and verify P-014 becomes stale.
4. Verify an early replacement proposal is rejected.
5. Call `get_decision_history`, then `get_evidence_objects`, then `propose_decision_update`; verify P-015 cites the current evidence.
6. Request human confirmation, confirm October 28 as the human, and verify canonical shared state.
7. Record the 88–92 second narrated video from that exact public build.

Once the submission period closes, do not modify the submitted repository, live site, video, or Devpost entry during judging.
