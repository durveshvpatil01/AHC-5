# 03: Architecture

**Stack:** Next.js 15 (App Router, TypeScript) + Tailwind v4, hosted on **Vercel** (free), with a public GitHub repo. No database.

## Data flow
```
MCP (1 call/min per token)
  ├─ scripts/snapshot.mjs (local, run by hand) -> data/snapshot/*.json (committed: the "store")
  │     whoami, get_my_accounts, get_all_paperwork A/B, get_signals, get_data_format,
  │     get_flytbase_team, get_feature_requests, get_release_notes, list_notes
  └─ server, live (src/lib/live.ts, Vercel Data Cache via unstable_cache)
        get_signals      revalidate 60s
        get_my_accounts  revalidate 600s
        list_notes       revalidate 300s
        On a failure or rate limit: keep the cached value, else fall back to the snapshot.
src/lib/engine/*  pure functions: (accounts, paperwork, signals) -> the five answers + citations
src/app/page.tsx  server component renders both accounts
/api/live         JSON for the client to poll every 30s, so new signals appear without a reload
/api/notes        POST -> write_note (server side), GET -> list_notes
```

## Rules engine (the "how it decides" section of the Thinking doc)
- **Book:** a deal's value counts as "backed" only if its worth comes from a `verified` fact or file id. A `told` value is shown with the person's id. A `claim` value goes in a separate "unbacked" column. Totals are summed per column.
- **Power:** for each deal: decider, payer, user, blocker and champion, mapped from people + facts; each person's stance (guarded/neutral/warm/ally); "unknown" where nobody was met → feeds Q5.
- **First moves:** score = deal value × chance (by stage and stance) × urgency (days to the nearest deadline or signal). Top 3 per account, each with an owner (us or a named FlytBase colleague), a date (before the deadline) and the deal id.
- **Risks:** deadlines within N days, people guarded or going cold (e.g. the champion leaving), deals stuck at identified, and signals with nobody replying. Each risk gets a "turns bad on" date.
- **Gaps:** a deal with no known decider or payer, a claim not yet verified, people never introduced. Each gap gets a "who could tell us".
- Every rendered number carries `cite: string[]` of real ids. A UI chip shows the ids, and clicking one opens the source record.

## Design
The FlytBase console look (Durvesh's screenshots): near-black background, orange accent, uppercase mono letter-spaced labels, thin borders, progress bars, tables with status pills.

## Secrets
`AQ_TOKEN` lives only in `.env.local` (git-ignored) and in the Vercel env vars. The snapshot JSON holds game data only, no token.
