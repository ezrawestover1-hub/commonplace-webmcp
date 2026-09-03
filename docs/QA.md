# Commonplace QA evidence

This record separates verified local behavior from the public-release checks that still need to happen before a Devpost submission.

## Verified locally — September 2, 2026

- `pnpm run build` completed successfully.
- `pnpm test` passed: 18 tests across the shared action and WebMCP contracts.
- The in-app browser registered all six WebMCP tools on `http://127.0.0.1:5174/`.
- The default workspace opens on P-014 grounded on Beta feedback v4, with the human evidence card and contextual drawer visible.
- Selecting the canvas evidence card opens the visible drawer editor. Recording a change creates Beta v5 and pauses P-014.
- The timed **Run proof** sequence was observed in order: human evidence update, paused P-014, agent re-grounding plan, fresh P-015, then the human confirmation dialog.
- The browser-native tool path was exercised:
  1. `propose_decision_update` was rejected immediately after the human evidence update.
  2. `get_decision_history` and `get_evidence_objects` completed.
  3. `propose_decision_update` returned `pending_human_confirmation`.
  4. `request_human_confirmation` returned `human_required`.
- Reset returned the workspace to P-014, Beta v4, and 42 responses.

## Required public-release checks

These are not proven by the local result and must be repeated on the candidate public URL before submission:

1. Deploy this revision to the candidate public URL. On September 2, 2026, `https://commonplace-webmcp.pages.dev/` was reachable with `Origin-Agent-Cluster: ?1` and `Permissions-Policy: tools=(self)`, but it served the older generic canvas experience with 12 tools rather than this focused six-tool workspace. It is not the current judge build.
2. Confirm ChatGPT's in-app browser registers all six tools on that URL.
3. Repeat the stale → re-ground → P-015 → human-confirmation proof on the public URL.
4. Capture the final five submission screenshots from that public run.
5. Record and publish the narrated video from that same verified build.
