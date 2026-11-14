# 04: Status and lanes (update this file as you go)

Deadline: **03:47 IST, 15 Nov 2026**. Target: deployed by 22:00, video and doc done by 01:00, links handed in by 02:00.

## Lanes (to avoid two agents editing one file)
| Lane | Owner | Files |
|---|---|---|
| Data + engine + API | Claude Code | `scripts/**`, `data/**`, `src/lib/**`, `src/app/api/**`, `src/app/page.tsx` (wiring) |
| UI components + styling | Antigravity (or Claude if idle) | `src/components/**`, `src/app/globals.css` |
| Thinking doc + video script | Antigravity | `docs/thinking-doc.md`, `docs/video-script.md` |

Contract between the lanes: `src/lib/types.ts` (Claude writes it; the UI reads it). Mock data for the UI: `data/snapshot/*.json` + `src/lib/engine` output.

## Checklist
- [x] Project scaffolded (`aq-crm`, Next.js 15)
- [x] Memory folder
- [ ] AQ_TOKEN in `.env.local` (Durvesh pastes it from the "Show my token" button)
- [ ] Snapshot pulled (`node scripts/snapshot.mjs`, ~10 min)
- [ ] types.ts from get_data_format
- [ ] Engine: book / power / moves / risks / gaps, with citations
- [ ] UI: account switcher, 5 answer panels, signal feed, citation drawer, notes write-back
- [ ] Live: /api/live poller + client refresh
- [ ] GitHub repo (public) + README
- [ ] Vercel deploy + AQ_TOKEN env var + private-window check
- [ ] Thinking doc (Google Doc), video (Drive), hand in
