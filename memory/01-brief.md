# 01: Brief (read from the game's Build screen, 14 Nov 2026 12:54 IST)

**Task:** build a live CRM for the two accounts: the one you would hand your manager on Monday. It reads the data through the MCP, and for each account it answers five questions. Every number traces back to its source.

**Window:** 14:00 to **15:47 IST + 1 h extension (~17:00 IST, 14 Nov)**. Solo. Any tools, AI included.

## Hand in: four links (Hand in tab on /play; links can be changed until time is called)
1. **Live CRM link**: hosted, works without the laptop, opens in a private window, covers both accounts.
2. **Public repo**: no sign-in needed, a README that says how to run it, no token in the code.
3. **Thinking doc** (Google Doc, one page): what it does and for whom; how it decides (the rules); what it doesn't do yet; how AI was used.
4. **Walkthrough video** (Google Drive, 3 min): the five answers for one account; one number traced to its source; it picking up something new; the code, briefly.
Both Drive files are shared as "Anyone with the link can view".

## The five questions (per account), weak vs strong
1. **What is the book worth?** Strong: each deal at a value you can back, with the file or person behind it; what can't be backed is shown apart. Weak: one big total copied from a champion.
2. **Who holds the power?** Strong: for each deal, who decides, pays, uses, could block, and where each stands with you. Weak: a list of contacts.
3. **What do you do first?** Strong: the first 3 moves, ranked, each with an owner, a date and the deal it moves. Weak: "follow up".
4. **What is about to go wrong?** Strong: deadlines at risk, people going cold, stuck deals, and when each turns bad. Weak: everything green.
5. **What do you still not know?** Strong: the gaps the plan rests on, and who could fill each one. Weak: no gaps, or guesses shown as facts.

## Judging (Weak / Solid / Strong)
- Answers the five: all five, for both accounts, actionable on Monday
- Numbers you can back: every number cites its id, nothing rests on a claim alone, no invented ids
- The right first moves: ranked, owned, and dated inside every deadline
- Honest about gaps: what it doesn't know, why it matters, who to ask
- Stays live: takes in new data by itself **and writes notes back** (write_note)
- Judges may ask Durvesh to walk them through it live. His morning in the game counts too.

## Rules
- Fetch once and store: **each token gets one call a minute (writes included)**.
- The token stays on the server, never in browser code.
- Expect the data to change during the build (live events via get_signals).
- Don't: show a number without its source; invent an id, fact or person; work with other players.

## MCP
- Endpoint: `https://questathon.aihackerscollective.com/api/public/mcp`, POST JSON-RPC `tools/call`, `Authorization: Bearer $AQ_TOKEN`.
- Tools: whoami, get_my_accounts, get_file{id}, list_paperwork{account?}, get_all_paperwork{account}, search_paperwork{q,account?}, get_paperwork_record{account,path}, get_feature_requests, get_release_notes, get_flytbase_team, get_signals, get_data_format, list_notes, write_note{text,account?,kind?(note|task|risk|next_step),title?}.
- How to read it: every person, fact, deal and file has an id. Fact status: `claim` (may be wrong) / `told` (a person said it) / `verified` (backed by a file you hold). People: only those met, each guarded/neutral/warm/ally. Deals: identified → qualified → cleared → agreed; worth shows once qualified. The "official story" (account sheet) is unverified. Paperwork shows symptoms, and the morning explains them.

## Ideas offered by the organisers
Next best action, risk radar, book with receipts, power map, blind-spot finder, draft writer.
