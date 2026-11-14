# 04: Status and lanes (update this file as you go)

Deadline: **03:47 IST, 15 Nov 2026**. Target: deployed by 17:00, video and doc done by 21:00, links handed in early. Links can be changed until time is called.

## Lanes (to avoid two agents editing one file)
| Lane | Owner | Files |
|---|---|---|
| Data + engine + API | Claude Code | `scripts/**`, `data/**`, `src/lib/**`, `src/app/api/**`, `src/app/page.tsx` |
| UI polish | Claude Code (Antigravity may take it: tell Claude first) | `src/components/**`, `src/app/globals.css` |
| Thinking doc + video script | Antigravity | `docs/thinking-doc.md`, `docs/video-script.md` |

## Done (14 Nov ~14:15 IST)
- [x] Next.js app `aq-crm`, building clean (`npm run build`), commit `7566061`
- [x] Snapshot pulled: `data/snapshot/` (export, pack_A, pack_B, signals, schema, team, feature_requests, release_notes, notes, me)
- [x] Engine (`src/lib/engine.ts`): book / power / moves / risks / gaps for A and B; every cite resolves (`npx tsx scripts/engine-check.ts` → "MISSING CITES: none")
- [x] Live: `/api/live` fingerprint poll every 30 s → router.refresh; signal records merged into the paperwork (new usage rows change the fleet)
- [x] Write-back: `/api/notes` → POST /api/public/v1/notes (write_note). Not yet tested against the real API (it costs a call).
- [x] UI: portfolio + account pages (5 answers strip, tabs, fleet table, timeline, notes, citation drawer). No hydration errors.

## Next
- [ ] Public GitHub repo + push (Durvesh: create the repo; git push uses Git Credential Manager)
- [ ] Vercel: import the repo, set the `AQ_TOKEN` env var, deploy, check in a private window
- [ ] Test write_note once on the deployed app
- [ ] Thinking doc (Google Doc) from `docs/thinking-doc.md`
- [ ] Video (3 min): the five answers for A; trace £180,000 → usage_weekly.csv / ECPA docks; a live event arriving; the code
- [ ] Hand in the 4 links on /play → Hand in

## Key numbers (for the video and the doc)
- A: £350,000 renewal (A:contract.txt) ends 28 Feb 2027; 17/35 docks active, 7 never flew, 10 stopped; health 47. Top move: reply to Karen before the 5 Dec event (urgent_request, FB-11206).
- B: €140,000 renewal (B:contract.txt) ends 31 Jan 2027; 4/14 docks active; AD-02, AD-05 and AD-10 stopped in the last 2 weeks (usage_drop); health 33. Top move: find out why those docks stopped.

## Notes from 14 Nov ~14:30
- write_note tested: OK, note id 143035 (account A, next_step, the Karen reply). Response shape: {id, created_at, account, kind, title, text, source}.
- **One token is shared by everything that runs it.** Local dev servers, the Vercel deploy and scripts all draw on the same 1 call/min. After deploying, stop the local servers, or the hosted CRM gets rate-limited (it then falls back to the snapshot and stays correct, just not live).
- Drafts are ready: `docs/thinking-doc.md` (paste into a Google Doc) and `docs/video-script.md`.
