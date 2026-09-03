# Commonplace release verification

This document is a release runbook for the focused Evidence Contract build. It deliberately separates local proof, public deployment, public video, and Devpost submission.

## Local candidate

Run before publishing:

```bash
pnpm test
pnpm build
git diff --check
```

The production output is `dist/`. It includes `_headers`, which supplies:

```text
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

## Public deployment gate

1. Publish this exact revision to the existing `ezrawestover1-hub/commonplace-webmcp` repository and ensure the configured Cloudflare Pages project serves it at `https://commonplace-webmcp.pages.dev/`.
2. Open the public URL in ChatGPT's in-app browser.
3. Confirm the page reports **Native WebMCP · 6 tools ready**.
4. Confirm the browser exposes exactly these tools:
   - `get_decision_context`
   - `get_evidence_changes`
   - `get_evidence_objects`
   - `get_decision_history`
   - `propose_decision_update`
   - `request_human_confirmation`
5. Run the evidence proof on the public URL:
   - Start from P-014 grounded on Beta v4.
   - Add the human Beta v5 update.
   - Verify an early `propose_decision_update` fails.
   - Call `get_decision_history`, then `get_evidence_objects`, then `propose_decision_update` for P-015.
   - Verify P-015 cites Beta v5, the signup blocker, and the human update.
   - Confirm October 28 as the human and verify the canonical decision state.

Do not call this complete until each observation above is captured from the public URL.

## Video gate

Record from the verified public URL using the current proof loop and a concise narrated script. The final public YouTube video must have audible narration and stay under three minutes. Do not use the older local highlight masters as proof of the focused workspace unless they are re-cut to show this exact build.

The three essential visual beats are:

1. **P-014 grounded on Beta v4**.
2. **P-014 superseded by the human Beta v5 update**.
3. **Cited P-015 re-grounded on v5, then confirmed by a human**.

## Submission gate

Before submitting, replace every stale “previous public release” reference in the Devpost draft with public verification evidence from this revision. Confirm the public repository exposes its MIT license. Enter the live URL, public repository URL, public YouTube URL, and truthful testing instructions. Do not modify the submitted URL, repository, video, or Devpost entry during judging.
