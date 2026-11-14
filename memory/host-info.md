# host-info: everything the host, judges and build screen said (14 Nov 2026)

Sources: the game's Build screen (/play, read 12:54 IST), the host's talks (transcribed by Durvesh, partly in Hindi; translated here), and the leaderboard. **Deadline:** the build screen says "Hand in by 03:47", which in practice means **15:47 IST**. Durvesh reports **one extra hour → submit by about 16:45-17:00 IST, 14 Nov.** Submit early; links can be changed until time is called.

## 1. Build screen: the task (verbatim summary)
"Build a live CRM for your two accounts: the one you would hand your manager on Monday. It reads your data through the MCP and, for each account, answers five questions. Every number on it traces back to where it came from."
- **Hand in 4 links** (Hand in tab on /play):
  1. Live CRM link: hosted, works without your laptop, opens in a private window, covers both accounts.
  2. Public repo: no sign-in, a README with how to run it, no token in the code. → https://github.com/durveshvpatil01/AHC-5
  3. Thinking doc (Google Doc, 1 page): what it does and for whom; how it decides (rules); what it doesn't do yet; how you used AI.
  4. Walkthrough video (Google Drive, 3 min): the five answers for one account; one number traced to its source; it picking up something new; the code, briefly. Both Drive files shared as "Anyone with the link can view".
- **Suggested afternoon:** 14:15 Connect (token, one working call) · 14:45 pull and read (fetch once, store; read "This morning") · 16:30 answer the five for both accounts, every number with its source · 17:15 keep it live (take in live events without a code change; write notes back with write_note) · end: host, record, hand in (check each link in a private window).
- **The five questions per account** (weak vs strong):
  1. What is the book worth? Strong: each deal at a value you can back, with the file/person behind it; what you can't back shown apart. Weak: one big total copied from a champion.
  2. Who holds the power? Strong: per deal, who decides, pays, uses, could block, and where each stands with you. Weak: a list of contacts.
  3. What do you do first? Strong: the first three moves, ranked, each with an owner, a date and the deal it moves. Weak: "follow up with the client".
  4. What is about to go wrong? Strong: deadlines at risk, people going cold, deals stuck, and when each turns bad. Weak: everything green.
  5. What do you still not know? Strong: the gaps your plan rests on and who could fill each. Weak: no gaps, or guesses shown as facts.
- **Judging rows (Weak / Solid / Strong):** answers the five (all five, both accounts, actionable on Monday) · numbers you can back (every number cites its id; nothing rests on a claim alone; no invented ids) · the right first moves (ranked, owned, dated inside every deadline) · honest about gaps (what it doesn't know, why it matters, who to ask) · stays live (takes in new data by itself, and writes notes back). "Your morning counts too. Judges may ask you to walk them through your CRM, live."
- **Rules:** Do: use any tools, AI included; fetch once and store it (each token gets **one call a minute**, writes included); keep the token on a server, never in browser code; expect the data to change while you build; hand in early. Don't: show a number without its source; invent an id, fact or person; work with other players (solo); leave the hand-in to the last minute.
- **How to read the data:** every person, fact, deal and file has an id (judges check each against your morning). Fact status: claim (may be wrong) / told (a person said it) / verified (backed by a file you hold). People: only those met, each guarded/neutral/warm/ally. Deals: identified → qualified → cleared (blocker gone) → agreed; worth shows once qualified. Official story = what the account sheet says, unverified. Paperwork shows symptoms; your morning explains them; where it doesn't fit a story you were told, ask why.
- **Organisers' ideas:** next best action, risk radar, book with receipts, power map, blind-spot finder, draft writer.
- **MCP:** `https://questathon.aihackerscollective.com/api/public/mcp` (JSON-RPC tools/call, `Authorization: Bearer <AQ_TOKEN>`); also REST `/api/public/v1/{me,export,files/<id>,pack,pack/<A|B>/all,pack/search?q=,signals,schema,notes}`. Tools: whoami, get_my_accounts, get_file, list_paperwork, get_all_paperwork, search_paperwork, get_paperwork_record, get_feature_requests, get_release_notes, get_flytbase_team, get_signals, get_data_format, list_notes, write_note.

## 2. Host talk #1 (afternoon): what a CS CRM is
- The MCP gives the game data plus account history: raw data, call transcripts, usage data (how much each dock flew over ~6 months), and so on.
- As a CS person you need: the book of business, project status, current status, how many docks, deal value, how many are damaged/down. Map the data, then run analytics that turn it into **priorities: a to-do list** (money first).
- Like the CS platforms shown in the morning: **different buckets**, kept updated. **Not a data dump: clean and actionable.**
- Research what CRMs are and how they're structured. Be able to explain every number on screen (ask your AI what each number means).
- (Clarification from the host: the screenshot/object-detection tool shown in the morning demo was a separate tool, not the CRM. Neel showed the CRM.)

## 3. Host talk #2: the MCP must be the portal's own connection
- "Don't ask your Claude or GPT to pull this. We want to see your MCP connection **within your portal**. AI can help you set up the connection."
- "Think of the MCP as a constant source you call to get data: every 5 or 10 minutes, up to you."
- "Without us telling you, there will be a flush of **new data at random times**, and if you've integrated well enough, your MCP should pull that data in." (Durvesh: probably around 4 pm, maybe later.)
- Durvesh's own observation: a static UI is not enough; you must see dynamic data and be able to perform operations.

## 4. Host talk #3: scoring
- Leaderboard ranking: **deal value 40%, insights 40%, discovery (~20%; heard as "50", likely misheard)**.
- The host is building a **secondary internal judgment** for people who did discovery very well even if their deals didn't close: "don't get discouraged if your deals did not close; in the second half deals carry less weight, insights more."
- Leaderboard top (for reference): #1 Nivi $5.40M closed, insight 350, 6 people, 154 moves, score 96. Durvesh's morning: Insight 28, closed $105,000 (two offers won), 5 people met, 6 deals identified; book found $174,197; best reply chosen 34% of the time.

## 5. Host talk #4 (Hindi, translated): the plan, the unlock map and the lessons
- There's a police account and an industry account. For the police one you should know: **what was the starting point, what is the current point, and what happened in between** (all the events in that time).
- "If I have to give some **documentation** for this event, **what will it unlock: money, or a new person**, or what?" Show the scenario you played in the game, and the future.
- More call transcripts will also arrive.
- "If you took over this account from Sam at the start of the game, think of it like presenting a plan to **Neel (our CX manager)** based on all the events: do I have a plan?"
- **Westmere stadium example:** a 30-dock opportunity. Not just "send pricing, get it signed". As a CS person you don't stop at 30: if one police department can put 30 docks at a stadium, there will be more stadiums. To find out, e.g. **Tarn Valley**: first get Tarn Valley **flying**. For that, the **documentation (the data-security one)** must be delivered. Then prove Tarn Valley **gets value**. Once proven, ask Tarn Valley **"do you also have a stadium?"** Same for **Norwold**. When all departments are up, value rises → usage rises → they deploy more docks.
- For every police department: **what we know, what we can give them, and what we can build for them.**
- "The biggest thing: what you're doing now is **reactive** work. Building a CRM means using all this reactive data to create a **proactive framework**." E.g. if this documentation solved Tarn Valley, who else will it solve (Norwold)?
- "In a CRM you can **reorganise the priority of tasks**. How is up to you: that's your CS instinct." One part of a CRM is holding data; the other is turning it into **a 2-week plan, a 3-week plan or a 1-year plan**.
- "I only explored these cities; build on whatever raw data you already have" (the examples come from the game's design).
- "If in future you get **7 police counties**, can you apply these learnings? Raw data says: went on a call, said X, they refused. But *why* did they refuse? Because the relationship wasn't good, or we caused them a problem. E.g. if you go to **Karen** and say 'I want you to fly', she says she can't until the **data documentation** arrives. If you say 'will you take 5 more docks?', why would she? She won't. That's a learning: if a new police department comes, this shouldn't happen again. **Your CRM should track 'this was a mistake we made; we should not repeat it'**, so you know where to go ahead when outcomes differ."

## 6. What the build screen showed of the morning (Durvesh's game)
- A met: Rhys Calder (neutral), Insp. Karen Mbeki (ally), Hannah Doyle (neutral); 2 people never introduced. B met: Stefan Roy (guarded), Beatriz Alonso (guarded); 3 never introduced.
- Deals: renew alliance (identified, $35,976), Tarn Valley+Norwold go live (identified, $1,726, put at risk by something said), Scale Westmere ($9,438), 300-dock tender ($20,494, at risk: "Would you have a quiet word with Hannah? ..."), renew Aldermoor ($709, at risk), idle plants ($854, at risk: "So 2 plants still need docks. When should I order them?" in "How the rollout went"), **Protect and extend the insurance discount (never heard of, at risk)**, **Case study for the 40-plant sister company (never heard of)**. (Those $ values are game scores, not contract values; the CRM uses contract values.)
